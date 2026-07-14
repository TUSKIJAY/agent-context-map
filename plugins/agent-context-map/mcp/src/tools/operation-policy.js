import {
  EDGE_UPDATE_FIELDS,
  NODE_UPDATE_FIELDS,
  OPERATION_KINDS,
  applyOperations,
  detectPromptInjection,
  operationsToChangeSet,
} from "../../../../../packages/acm-core/src/index.js";
import { McpControlPlaneError } from "../errors.js";

export const MAX_OPERATIONS = 100;
export const MAX_OPERATIONS_BYTES = 512 * 1024;

const COMMON = ["id", "op", "preconditions", "reason"];
const KEYS = {
  addNode: [...COMMON, "node"],
  updateNodeFields: [...COMMON, "nodeId", "fields"],
  removeNode: [...COMMON, "nodeId"],
  addEdge: [...COMMON, "edge"],
  updateEdgeFields: [...COMMON, "edgeId", "fields"],
  removeEdge: [...COMMON, "edgeId"],
  setNodeLayout: [...COMMON, "nodeId", "layout"],
};
const NODE_KEYS = ["id", "type", "title", "status", "description", "priority", "source", "confidence", "tags", "notes", "x", "y"];
const EDGE_KEYS = ["id", "from", "to", "type", "status", "reason", "source", "confidence"];
const PRECONDITION_KEYS = ["nodeExists", "nodeAbsent", "edgeExists", "edgeAbsent", "noDanglingEdges"];

function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function assertKeys(value, allowed, label) {
  if (!isObject(value) || Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new McpControlPlaneError("invalid_operation", `${label} contains unsupported fields.`);
  }
}

function assertPreconditions(preconditions, label) {
  if (preconditions == null) return;
  assertKeys(preconditions, PRECONDITION_KEYS, `${label}.preconditions`);
  for (const key of ["nodeExists", "nodeAbsent", "edgeExists", "edgeAbsent"]) {
    if (preconditions[key] != null && (!Array.isArray(preconditions[key]) || preconditions[key].some((id) => typeof id !== "string"))) {
      throw new McpControlPlaneError("invalid_operation", `${label}.preconditions.${key} must be an array of IDs.`);
    }
  }
  if (preconditions.noDanglingEdges != null && typeof preconditions.noDanglingEdges !== "boolean") {
    throw new McpControlPlaneError("invalid_operation", `${label}.preconditions.noDanglingEdges must be boolean.`);
  }
}

function assertNoConfirmed(operation) {
  const proposedStatus = operation.node?.status ?? operation.edge?.status ?? operation.fields?.status;
  if (proposedStatus === "confirmed") {
    throw new McpControlPlaneError("confirmed_escalation_rejected", "Model proposals cannot mark nodes or edges as confirmed.");
  }
}

export function normalizeModelOperations(doc, operations) {
  if (!Array.isArray(operations) || operations.length === 0 || operations.length > MAX_OPERATIONS) {
    throw new McpControlPlaneError("invalid_operation", `operations must contain between 1 and ${MAX_OPERATIONS} entries.`);
  }
  if (Buffer.byteLength(JSON.stringify(operations), "utf8") > MAX_OPERATIONS_BYTES) {
    throw new McpControlPlaneError("operations_too_large", "The operation payload exceeds the 512 KiB server limit.");
  }
  if (detectPromptInjection(operations)) throw new McpControlPlaneError("prompt_injection_detected", "Instruction-like content is not accepted in model write operations.");
  const removedEdges = new Set();
  const normalized = structuredClone(operations);
  normalized.forEach((operation, index) => {
    const label = `operations[${index}]`;
    if (!isObject(operation) || operation.kind || operation.operation || String(operation.op || "").includes("_")) {
      throw new McpControlPlaneError("legacy_operation_rejected", "Only canonical camelCase operations are accepted.");
    }
    if (!OPERATION_KINDS.includes(operation.op)) throw new McpControlPlaneError("invalid_operation", `${label}.op is unsupported.`);
    assertKeys(operation, KEYS[operation.op], label);
    assertPreconditions(operation.preconditions, label);
    if (operation.op === "addNode") assertKeys(operation.node, NODE_KEYS, `${label}.node`);
    if (operation.op === "addEdge") assertKeys(operation.edge, EDGE_KEYS, `${label}.edge`);
    if (operation.op === "updateNodeFields") {
      assertKeys(operation.fields, NODE_UPDATE_FIELDS, `${label}.fields`);
      if (!Object.keys(operation.fields).length) throw new McpControlPlaneError("invalid_operation", `${label}.fields cannot be empty.`);
    }
    if (operation.op === "updateEdgeFields") {
      assertKeys(operation.fields, EDGE_UPDATE_FIELDS, `${label}.fields`);
      if (!Object.keys(operation.fields).length) throw new McpControlPlaneError("invalid_operation", `${label}.fields cannot be empty.`);
    }
    if (operation.op === "setNodeLayout") assertKeys(operation.layout, ["x", "y"], `${label}.layout`);
    assertNoConfirmed(operation);
    if (operation.op === "removeEdge") removedEdges.add(operation.edgeId);
    if (operation.op === "removeNode") {
      const incident = (doc.edges || []).filter((edge) => edge.from === operation.nodeId || edge.to === operation.nodeId);
      if (operation.preconditions?.noDanglingEdges !== true && incident.some((edge) => !removedEdges.has(edge.id))) {
        throw new McpControlPlaneError("invalid_operation", `${label} must explicitly remove incident edges first or require noDanglingEdges.`);
      }
    }
  });
  const preview = operationsToChangeSet(doc, normalized);
  if (!preview.ok) throw new McpControlPlaneError("invalid_operation", "The proposed operations cannot be applied atomically.", { details: { operationIds: normalized.map((operation) => operation.id) } });
  return { operations: normalized, nextDocument: preview.doc, previewDiff: preview.changeSet, diagnostics: preview.diagnostics };
}

export function validateManualDocument(documentId, document) {
  if (!isObject(document) || document.doc_id !== documentId) {
    throw new McpControlPlaneError("document_id_mismatch", "The manual edit document must match documentId.");
  }
  const applied = applyOperations(document, [], { validateResult: true });
  if (!applied.ok) throw new McpControlPlaneError("validation_failed", "The manual edit document failed strict validation.");
  return structuredClone(document);
}
