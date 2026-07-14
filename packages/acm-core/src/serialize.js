import { FORMAL_SCHEMA_VERSION } from "./schema.js";

const KEY_ORDER = [
  "schema_version", "doc_id", "meta", "nodes", "edges", "layout", "changes", "validation",
  "title", "created_by", "created_at", "updated_at", "purpose", "source",
  "id", "type", "from", "to", "status", "description", "priority", "confidence", "tags", "notes", "reason",
  "engine", "x", "y",
  "change_set_id", "base_doc_id", "summary", "agent_instructions",
  "added_nodes", "modified_nodes", "removed_nodes", "added_edges", "modified_edges", "removed_edges", "layout_changes",
  "field", "before", "after",
];
const KEY_RANK = new Map(KEY_ORDER.map((key, index) => [key, index]));
const orderedKeys = (value) => Object.keys(value).sort((left, right) => {
  const leftRank = KEY_RANK.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = KEY_RANK.get(right) ?? Number.MAX_SAFE_INTEGER;
  return leftRank - rightRank || left.localeCompare(right, "en");
});

function yamlScalar(value) {
  if (value == null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = String(value);
  if (text === "" || /[:#\-?\[\]{}&*!|>'\"%@`]/.test(text) || /^\s|\s$/.test(text)) return JSON.stringify(text);
  return text;
}

export function toYaml(value, indent = 0) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => {
      if (item && typeof item === "object") {
        const body = toYaml(item, indent + 1).replace(new RegExp(`^${pad}  `), "");
        return `${pad}- ${body.trimStart()}`;
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join("\n");
  }
  if (value && typeof value === "object") {
    const keys = orderedKeys(value);
    if (keys.length === 0) return "{}";
    return keys.map((key) => {
      const item = value[key];
      if (item && typeof item === "object" && (Array.isArray(item) ? item.length : Object.keys(item).length)) {
        return `${pad}${key}:\n${toYaml(item, indent + 1)}`;
      }
      if (item && typeof item === "object") return `${pad}${key}: ${Array.isArray(item) ? "[]" : "{}"}`;
      return `${pad}${key}: ${yamlScalar(item)}`;
    }).join("\n");
  }
  return `${pad}${yamlScalar(value)}`;
}

export function cleanNode(node) {
  const out = { id: node.id, type: node.type, title: node.title, status: node.status };
  if (node.description) out.description = node.description;
  if (node.priority) out.priority = node.priority;
  if (node.source) out.source = node.source;
  if (node.confidence != null) out.confidence = node.confidence;
  if (Array.isArray(node.tags) && node.tags.length) out.tags = [...node.tags];
  if (node.notes) out.notes = node.notes;
  return out;
}

export function cleanEdge(edge) {
  const out = { id: edge.id, from: edge.from, to: edge.to, type: edge.type, status: edge.status };
  if (edge.reason) out.reason = edge.reason;
  if (edge.source) out.source = edge.source;
  if (edge.confidence != null) out.confidence = edge.confidence;
  return out;
}

export function toLayout(doc) {
  const nodes = {};
  for (const node of doc.nodes || []) {
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      nodes[node.id] = { x: Math.round(node.x), y: Math.round(node.y) };
    }
  }
  return { engine: doc.layout?.engine || "manual", nodes };
}

export function hasChanges(changeSet) {
  if (!changeSet || typeof changeSet !== "object") return false;
  return [
    "added_nodes", "modified_nodes", "removed_nodes", "added_edges",
    "modified_edges", "removed_edges", "layout_changes",
  ].some((field) => Array.isArray(changeSet[field]) && changeSet[field].length > 0);
}

export function toExportDoc(doc, changeSet = doc?.changes) {
  const out = {
    schema_version: FORMAL_SCHEMA_VERSION,
    doc_id: doc.doc_id,
    meta: { ...(doc.meta || {}) },
    nodes: (doc.nodes || []).map(cleanNode),
    edges: (doc.edges || []).map(cleanEdge),
    layout: toLayout(doc),
  };
  if (hasChanges(changeSet)) out.changes = changeSet;
  if (doc.validation !== undefined) out.validation = doc.validation;
  return out;
}

export function toAcmMd(doc, changeSet) {
  return `\`\`\`acm\n${toYaml(toExportDoc(doc, changeSet))}\n\`\`\`\n`;
}

export function canonicalAcmMdBytes(doc, changeSet) {
  return new TextEncoder().encode(toAcmMd(doc, changeSet));
}
