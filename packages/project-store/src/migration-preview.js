import { parseAcmMd, toAcmMd, toExportDoc, validateDoc } from "../../acm-core/src/index.js";

const TOP_LEVEL_FIELDS = new Set(["schema_version", "doc_id", "meta", "nodes", "edges", "layout", "changes", "validation"]);
const NODE_FIELDS = new Set(["id", "type", "title", "status", "description", "priority", "source", "confidence", "tags", "notes", "x", "y"]);
const EDGE_FIELDS = new Set(["id", "from", "to", "type", "status", "reason", "source", "confidence"]);

function unknownFieldIssues(doc) {
  const issues = [];
  for (const field of Object.keys(doc || {})) if (!TOP_LEVEL_FIELDS.has(field)) issues.push({ code: "unsupported_top_level_field", ref: field });
  for (const [index, node] of (doc?.nodes || []).entries()) {
    for (const field of Object.keys(node || {})) if (!NODE_FIELDS.has(field)) issues.push({ code: "unsupported_node_field", ref: `nodes[${index}].${field}` });
  }
  for (const [index, edge] of (doc?.edges || []).entries()) {
    for (const field of Object.keys(edge || {})) if (!EDGE_FIELDS.has(field)) issues.push({ code: "unsupported_edge_field", ref: `edges[${index}].${field}` });
  }
  return issues;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function equivalent(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

export function previewLegacyDocument(row) {
  let doc;
  const issues = [];
  try { doc = JSON.parse(row.body); } catch (error) {
    return { ok: false, documentId: row.doc_id, title: row.title, issues: [{ code: "invalid_json_body", message: error.message }] };
  }
  if (doc?.doc_id !== row.doc_id) issues.push({ code: "document_id_mismatch", message: "documents.doc_id does not match body.doc_id" });
  issues.push(...unknownFieldIssues(doc));
  const validationIssues = validateDoc(doc, { mode: "strict" });
  issues.push(...validationIssues.filter((issue) => issue.level === "error").map((issue) => ({ code: issue.code, message: issue.msg, ref: issue.ref })));
  let canonicalText = null;
  let roundTripEquivalent = false;
  if (!issues.length) {
    canonicalText = toAcmMd(doc);
    const parsed = parseAcmMd(canonicalText, { mode: "strict" });
    roundTripEquivalent = Boolean(parsed.doc) && equivalent(toExportDoc(doc), toExportDoc(parsed.doc));
    if (!roundTripEquivalent) issues.push({ code: "roundtrip_semantic_loss", message: "parse → serialize → parse changed the normalized ACM-MD document" });
  }
  let baseSnapshotStatus = "absent";
  if (row.base_snapshot != null) {
    try {
      const base = JSON.parse(row.base_snapshot);
      const baseErrors = validateDoc(base, { mode: "strict" }).filter((issue) => issue.level === "error");
      baseSnapshotStatus = baseErrors.length ? "invalid_preserved_in_legacy_backup" : "valid_preserved_in_legacy_backup";
    } catch {
      baseSnapshotStatus = "invalid_preserved_in_legacy_backup";
    }
  }
  return {
    ok: issues.length === 0,
    documentId: row.doc_id,
    title: row.title || doc?.meta?.title || "",
    domainProfile: row.domain_profile || "generic",
    canonicalText,
    document: issues.length ? null : parseAcmMd(canonicalText, { mode: "strict" }).doc,
    roundTripEquivalent,
    baseSnapshotStatus,
    legacyDirty: Boolean(row.dirty),
    issues,
  };
}

export function createMigrationPlan(snapshot) {
  const documents = snapshot.documents.map(previewLegacyDocument);
  const snapshotCount = snapshot.snapshotCount ?? snapshot.snapshots?.length ?? 0;
  const appStateCount = snapshot.appStateCount ?? snapshot.appState?.length ?? 0;
  return {
    schemaVersion: 1,
    sourceDbPath: snapshot.dbPath || null,
    sourceDigest: snapshot.sourceDigest || snapshot.sourceToken,
    sourceUnchanged: snapshot.sourceUnchanged,
    documents,
    preservedLegacyState: {
      snapshotCount,
      appStateCount,
      policy: "legacy_database_backup_only_no_dual_write",
    },
    allValid: documents.every((document) => document.ok),
  };
}
