import { invoke } from "@tauri-apps/api/core";
import { computeDocumentRevision, parseAcmMd, toAcmMd, validateDoc } from "../../packages/acm-core/src/index.js";
import { classifyRevisionConflict } from "../../packages/project-store/src/conflicts.js";

const LS = typeof localStorage !== "undefined" ? localStorage : null;
const ROOT_KEY = "acm:selected-project-root";
const revisions = new Map();
const rawTexts = new Map();
const records = new Map();
const writeQueues = new Map();
let diagnostics = { invalid: [], recovery: [], indexStatus: "not_checked" };

export class ProjectPersistenceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProjectPersistenceError";
    this.code = code;
    this.details = details;
  }
}

function selectedRoot() {
  return LS?.getItem(ROOT_KEY) || null;
}

function stateNamespace() {
  const root = selectedRoot() || "no-project";
  let hash = 0x811c9dc5;
  for (let index = 0; index < root.length; index += 1) {
    hash ^= root.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const stateKey = (key) => `acm:project-state:${stateNamespace()}:${key}`;
const readState = (key, fallback = null) => {
  try {
    const value = LS?.getItem(stateKey(key));
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
const writeState = (key, value) => {
  if (!LS) return;
  LS.setItem(stateKey(key), JSON.stringify(value));
};

function requireRoot() {
  const root = selectedRoot();
  if (!root) throw new ProjectPersistenceError("project_root_required", "请先选择项目文件夹。");
  return root;
}

function normalizedRow(row) {
  return {
    doc_id: row.docId ?? row.doc_id,
    title: row.title,
    domain_profile: row.domainProfile ?? row.domain_profile,
    body: row.body,
    base_snapshot: row.baseSnapshot ?? row.base_snapshot,
    source_path: row.sourcePath ?? row.source_path,
    dirty: row.dirty,
    created_at: row.createdAt ?? row.created_at,
    updated_at: row.updatedAt ?? row.updated_at,
  };
}

async function parseNativeFile(file) {
  const parsed = parseAcmMd(file.text, { mode: "strict" });
  if (!parsed.doc || parsed.errors.length) {
    throw new ProjectPersistenceError("invalid_current_document", "项目中的 ACM-MD 文件无法解析。", { relativePath: file.relativePath, parseErrors: parsed.errors });
  }
  const issues = validateDoc(parsed.doc, { mode: "strict" });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) throw new ProjectPersistenceError("invalid_current_document", "项目中的 ACM-MD 文件未通过严格校验。", { relativePath: file.relativePath, issues });
  const filename = file.relativePath.split("/").pop();
  if (filename !== `${parsed.doc.doc_id}.acm.md`) {
    throw new ProjectPersistenceError("document_filename_mismatch", "ACM-MD 文件名必须与 doc_id 一致。", { relativePath: file.relativePath, documentId: parsed.doc.doc_id });
  }
  return {
    documentId: parsed.doc.doc_id,
    documentRevision: await computeDocumentRevision(parsed.doc),
    protocolVersion: parsed.doc.schema_version,
    doc: parsed.doc,
    rawText: file.text,
    canonicalText: toAcmMd(parsed.doc),
    relativePath: file.relativePath,
    modifiedAt: new Date(Number(file.modifiedAtMs || 0)).toISOString(),
    validationSummary: {
      errors: 0,
      warnings: issues.filter((issue) => issue.level === "warning").length,
    },
  };
}

async function readIndex(root) {
  const text = await invoke("project_read_index", { projectRoot: root });
  if (!text) return { text: null, index: null };
  try {
    const index = JSON.parse(text);
    return { text, index: index?.schemaVersion === 1 && typeof index.projectId === "string" ? index : null };
  } catch {
    return { text, index: null };
  }
}

function indexMatches(index, currentRecords) {
  if (!index || index.documents?.length !== currentRecords.length) return false;
  const cache = new Map(index.documents.map((entry) => [entry.id, entry]));
  return currentRecords.every((record) => {
    const entry = cache.get(record.documentId);
    return entry
      && entry.relativePath === record.relativePath
      && entry.titleCache === (record.doc.meta?.title || "")
      && entry.contentRevisionCache === record.documentRevision;
  });
}

async function ensureIndex(root, currentRecords, { force = false } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await readIndex(root);
    if (!force && indexMatches(existing.index, currentRecords)) return { status: "current", index: existing.index };
    const projectId = existing.index?.projectId || crypto.randomUUID();
    const retainedDefault = currentRecords.some((record) => record.documentId === existing.index?.defaultDocumentId)
      ? existing.index.defaultDocumentId
      : currentRecords[0]?.documentId || null;
    const index = {
      schemaVersion: 1,
      projectId,
      defaultDocumentId: retainedDefault,
      documents: currentRecords.map((record) => ({
        id: record.documentId,
        relativePath: record.relativePath,
        titleCache: record.doc.meta?.title || "",
        contentRevisionCache: record.documentRevision,
        updatedAtCache: record.doc.meta?.updated_at || record.modifiedAt,
      })),
    };
    const newText = `${JSON.stringify(index, null, 2)}\n`;
    const result = await invoke("project_write_index", { projectRoot: root, newText, expectedText: existing.text });
    if (result.status === "committed") return { status: "index_rebuilt", index };
    if (result.status !== "revision_conflict") throw new ProjectPersistenceError(result.status, "项目索引更新失败。", result);
  }
  throw new ProjectPersistenceError("document_committed_index_stale", "文档已保存，但索引并发更新失败；下次扫描会重建索引。");
}

async function scan({ rebuildIndex = true, forceIndex = false } = {}) {
  const root = selectedRoot();
  if (!root) {
    diagnostics = { invalid: [], recovery: [], indexStatus: "no_project" };
    records.clear(); revisions.clear(); rawTexts.clear();
    return { root: null, projectId: null, documents: [], invalid: [] };
  }
  const [files, recoveryEvidence] = await Promise.all([
    invoke("project_scan", { projectRoot: root }),
    invoke("project_scan_recovery", { projectRoot: root }),
  ]);
  const valid = [];
  const invalid = [];
  for (const file of files) {
    try { valid.push(await parseNativeFile(file)); } catch (error) {
      invalid.push({ relativePath: file.relativePath, code: error.code || "invalid_current_document", message: error.message, details: error.details });
    }
  }
  records.clear(); revisions.clear(); rawTexts.clear();
  for (const record of valid) {
    records.set(record.documentId, record);
    revisions.set(record.documentId, record.documentRevision);
    rawTexts.set(record.documentId, record.rawText);
  }
  let indexStatus = "not_rebuilt";
  let projectId = null;
  const existing = await readIndex(root);
  projectId = existing.index?.projectId || null;
  if (rebuildIndex && !invalid.length && (valid.length || existing.text)) {
    try {
      const result = await ensureIndex(root, valid, { force: forceIndex });
      indexStatus = result.status;
      projectId = result.index.projectId;
    } catch (error) {
      indexStatus = error.code || "document_committed_index_stale";
    }
  }
  const recovery = [
    ...(recoveryEvidence.temps || []).map((item) => {
      const validText = (text) => {
        if (!text) return false;
        const parsed = parseAcmMd(text, { mode: "strict" });
        return Boolean(parsed.doc) && !parsed.errors.length
          && !validateDoc(parsed.doc, { mode: "strict" }).some((issue) => issue.level === "error");
      };
      return {
        code: "recovery_required",
        tempRelativePath: item.tempRelativePath,
        targetRelativePath: item.targetRelativePath,
        tempValid: validText(item.tempText),
        targetValid: validText(item.targetText),
        autoActionTaken: false,
      };
    }),
    ...(recoveryEvidence.locks || []).map((lock) => ({
      code: Number(lock.expiresAtMs) <= Date.now() ? "recovery_required" : "document_busy",
      documentId: lock.documentId,
      expiresAtMs: lock.expiresAtMs,
      autoActionTaken: false,
    })),
  ];
  diagnostics = { invalid, recovery, indexStatus };
  return { root, projectId, documents: valid, invalid, recovery, indexStatus };
}

function enqueue(documentId, callback) {
  const previous = writeQueues.get(documentId) || Promise.resolve();
  const next = previous.catch(() => {}).then(callback);
  writeQueues.set(documentId, next);
  const cleanup = () => { if (writeQueues.get(documentId) === next) writeQueues.delete(documentId); };
  next.then(cleanup, cleanup);
  return next;
}

async function nativeWrite({ documentId, document, create = false, baseDocument = null }) {
  const root = requireRoot();
  const issues = validateDoc(document, { mode: "strict" });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) throw new ProjectPersistenceError("invalid_document", "图谱未通过严格校验，未写入项目。", { issues });
  if (document.doc_id !== documentId) throw new ProjectPersistenceError("document_id_mismatch", "documentId 与正文 doc_id 不一致。");
  return enqueue(documentId, async () => {
    if (!records.has(documentId)) await scan({ rebuildIndex: false });
    const expectedRevision = revisions.get(documentId) || null;
    const expectedText = rawTexts.get(documentId) || null;
    if (create && expectedText != null) throw new ProjectPersistenceError("document_already_exists", "项目中已存在同 doc_id 文档。", { documentId });
    if (!create && (!expectedRevision || expectedText == null)) throw new ProjectPersistenceError("document_not_found", "项目文档不存在或尚未读取。", { documentId });
    const newText = toAcmMd(document);
    if (!create && newText === expectedText) return { status: "unchanged", newRevision: expectedRevision, documentRevision: expectedRevision };
    const result = await invoke("project_write_document", {
      projectRoot: root,
      documentId,
      newText,
      expectedText,
      create,
    });
    if (result.status !== "committed") {
      let currentRevision = null;
      let currentDocument = null;
      if (result.currentText) {
        try {
          const parsed = parseAcmMd(result.currentText, { mode: "strict" });
          currentDocument = parsed.doc;
          if (currentDocument) currentRevision = await computeDocumentRevision(currentDocument);
        } catch {}
      }
      const conflict = classifyRevisionConflict(baseDocument, currentDocument);
      throw new ProjectPersistenceError(result.status, result.status === "revision_conflict" ? "项目文件已被其他编辑器修改；未自动覆盖或重放。" : "项目文件写入被拒绝。", {
        documentId,
        expectedRevision,
        currentRevision,
        ...conflict,
      });
    }
    const newRevision = await computeDocumentRevision(document);
    const record = {
      documentId,
      documentRevision: newRevision,
      protocolVersion: document.schema_version,
      doc: document,
      rawText: newText,
      canonicalText: newText,
      relativePath: `.acm/documents/${documentId}.acm.md`,
      modifiedAt: new Date().toISOString(),
      validationSummary: { errors: 0, warnings: issues.filter((issue) => issue.level === "warning").length },
    };
    records.set(documentId, record);
    revisions.set(documentId, newRevision);
    rawTexts.set(documentId, newText);
    let indexUpdateStatus = "index_rebuilt";
    try {
      const current = await scan({ rebuildIndex: false });
      await ensureIndex(root, current.documents, { force: true });
    } catch {
      indexUpdateStatus = "document_committed_index_stale";
    }
    return { status: indexUpdateStatus === "index_rebuilt" ? "committed" : "document_committed_index_stale", newRevision, documentRevision: newRevision, indexUpdateStatus };
  });
}

export async function selectProjectRoot() {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chosen = await open({ directory: true, multiple: false, title: "选择 Agent Context Map 项目文件夹" });
  if (!chosen || Array.isArray(chosen)) return null;
  LS?.setItem(ROOT_KEY, chosen);
  records.clear(); revisions.clear(); rawTexts.clear();
  await scan();
  return getProjectInfo();
}

export function getProjectInfo() {
  const root = selectedRoot();
  return root ? { root, name: root.split(/[\\/]/).filter(Boolean).pop() || root } : null;
}

export function getProjectDiagnostics() {
  return diagnostics;
}

export const backend = {
  async listDocuments() {
    const result = await scan();
    return result.documents.map((record) => ({
      doc_id: record.documentId,
      title: record.doc.meta?.title || "",
      domain_profile: readState(`profile:${record.documentId}`, "generic"),
      source_path: record.relativePath,
      dirty: Boolean(readState(`dirty:${record.documentId}`, false)),
      created_at: record.doc.meta?.created_at || "",
      updated_at: record.doc.meta?.updated_at || record.modifiedAt,
      revision: record.documentRevision,
    })).sort((left, right) => (right.updated_at || "").localeCompare(left.updated_at || ""));
  },

  async getDocument(documentId) {
    await scan();
    const record = records.get(documentId);
    if (!record) return null;
    return {
      doc_id: documentId,
      title: record.doc.meta?.title || "",
      domain_profile: readState(`profile:${documentId}`, "generic"),
      body: record.doc,
      base_snapshot: null,
      source_path: record.relativePath,
      dirty: Boolean(readState(`dirty:${documentId}`, false)),
      created_at: record.doc.meta?.created_at || "",
      updated_at: record.doc.meta?.updated_at || record.modifiedAt,
      revision: record.documentRevision,
    };
  },

  async upsertDocument(record) {
    requireRoot();
    await scan({ rebuildIndex: false });
    if (records.has(record.doc_id)) throw new ProjectPersistenceError("document_already_exists", "项目中已存在同 doc_id 文档；不会静默覆盖。", { documentId: record.doc_id });
    const result = await nativeWrite({ documentId: record.doc_id, document: record.body, create: true });
    writeState(`profile:${record.doc_id}`, record.domain_profile || "generic");
    writeState(`dirty:${record.doc_id}`, Boolean(record.dirty));
    return result;
  },

  async deleteDocument(documentId) {
    const root = requireRoot();
    await scan({ rebuildIndex: false });
    const expectedText = rawTexts.get(documentId);
    if (expectedText == null) return;
    const result = await invoke("project_delete_document", { projectRoot: root, documentId, expectedText });
    if (!new Set(["deleted", "already_absent"]).has(result.status)) {
      throw new ProjectPersistenceError(result.status, "删除被拒绝；项目文件没有改变。", result);
    }
    records.delete(documentId); revisions.delete(documentId); rawTexts.delete(documentId);
    writeState(`dirty:${documentId}`, false);
    const current = await scan({ rebuildIndex: false });
    await ensureIndex(root, current.documents, { force: true });
  },

  async saveBody(documentId, { domain_profile, body, dirty }) {
    const current = records.get(documentId)?.doc || null;
    const result = await nativeWrite({ documentId, document: body, baseDocument: current });
    writeState(`profile:${documentId}`, domain_profile || "generic");
    writeState(`dirty:${documentId}`, Boolean(dirty));
    return result;
  },

  async saveBaseline(documentId) {
    writeState(`dirty:${documentId}`, false);
  },

  async getAppState(key, fallback = null) { return readState(key, fallback); },
  async setAppState(key, value) { writeState(key, value); },
  async addSnapshot() {},
  async listSnapshots() { return []; },
};

export async function previewLegacyMigration() {
  const snapshot = await invoke("legacy_sqlite_preview");
  const rows = snapshot.documents.map(normalizedRow);
  const { createMigrationPlan } = await import("../../packages/project-store/src/migration-preview.js");
  const plan = createMigrationPlan({ ...snapshot, documents: rows });
  return { snapshot, plan };
}

export async function backupLegacyMigration(sourceToken) {
  return invoke("legacy_sqlite_backup", { expectedSourceToken: sourceToken });
}

export async function migrateLegacyDocument(candidate) {
  if (!candidate?.ok || !candidate.document) throw new ProjectPersistenceError("migration_preview_invalid", "该 legacy 文档未通过迁移预览。", { candidate });
  return backend.upsertDocument({
    doc_id: candidate.documentId,
    title: candidate.title,
    domain_profile: candidate.domainProfile,
    body: candidate.document,
    base_snapshot: candidate.document,
    dirty: false,
  });
}
