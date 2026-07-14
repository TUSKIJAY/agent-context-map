import {
  EDGE_UPDATE_FIELDS,
  LEGACY_OPERATION_KIND_MAP,
  NODE_STATUSES,
  NODE_TYPES,
  NODE_UPDATE_FIELDS,
  OPERATION_KINDS,
  RELATION_TYPES,
} from "./schema.js";
import { clone } from "./model.js";
import { buildChangeSet, diffDoc } from "./diff.js";
import { validateDoc } from "./validate.js";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function adaptLegacyOperation(raw) {
  if (!isObject(raw)) return { operation: null, diagnostics: [{ level: "error", code: "invalid_operation", message: "operation must be an object" }] };
  const rawKind = raw.op || raw.kind || raw.operation;
  const canonicalKind = LEGACY_OPERATION_KIND_MAP[rawKind] || rawKind;
  const diagnostics = [];
  if (LEGACY_OPERATION_KIND_MAP[rawKind]) {
    diagnostics.push({
      level: "warning",
      code: "legacy_operation_kind",
      message: `${rawKind} is deprecated; use ${canonicalKind}`,
      legacyKind: rawKind,
      canonicalKind,
    });
  }
  const operation = { ...clone(raw), op: canonicalKind };
  delete operation.kind;
  delete operation.operation;
  if (rawKind === "update_node") operation.fields = clone(raw.fields || raw.patch || {});
  delete operation.patch;
  return { operation, diagnostics };
}

export function adaptLegacyOperations(rawOperations) {
  const operations = [];
  const diagnostics = [];
  for (const raw of rawOperations || []) {
    const adapted = adaptLegacyOperation(raw);
    diagnostics.push(...adapted.diagnostics);
    if (adapted.operation) operations.push(adapted.operation);
  }
  return { operations, diagnostics };
}

function validateFields(fields, allowed, ref, errors) {
  if (!isObject(fields) || !Object.keys(fields).length) {
    errors.push({ code: "empty_fields", ref, message: `${ref}.fields must be a non-empty object` });
    return;
  }
  for (const field of Object.keys(fields)) {
    if (!allowed.includes(field)) errors.push({ code: "field_not_allowed", ref, field, message: `${ref}.fields.${field} is not mutable` });
  }
}

function validateNodeShape(node, ref, errors) {
  if (!isObject(node)) {
    errors.push({ code: "invalid_node", ref, message: `${ref}.node must be an object` });
    return;
  }
  for (const field of ["id", "type", "title", "status"]) if (typeof node[field] !== "string" || !node[field].trim()) errors.push({ code: "missing_node_field", ref, field, message: `${ref}.node.${field} is required` });
  if (node.type && !NODE_TYPES.includes(node.type)) errors.push({ code: "invalid_node_type", ref, message: `${ref}.node.type is invalid` });
  if (node.status && !NODE_STATUSES.includes(node.status)) errors.push({ code: "invalid_node_status", ref, message: `${ref}.node.status is invalid` });
}

function validateEdgeShape(edge, ref, errors) {
  if (!isObject(edge)) {
    errors.push({ code: "invalid_edge", ref, message: `${ref}.edge must be an object` });
    return;
  }
  for (const field of ["id", "from", "to", "type", "status"]) if (typeof edge[field] !== "string" || !edge[field].trim()) errors.push({ code: "missing_edge_field", ref, field, message: `${ref}.edge.${field} is required` });
  if (edge.type && !RELATION_TYPES.includes(edge.type)) errors.push({ code: "invalid_edge_type", ref, message: `${ref}.edge.type is invalid` });
  if (edge.status && !NODE_STATUSES.includes(edge.status)) errors.push({ code: "invalid_edge_status", ref, message: `${ref}.edge.status is invalid` });
}

export function validateOperation(operation, doc, index = 0) {
  const errors = [];
  const ref = operation?.id || `operations[${index}]`;
  if (!isObject(operation)) return [{ code: "invalid_operation", ref, message: `${ref} must be an object` }];
  if (!OPERATION_KINDS.includes(operation.op)) errors.push({ code: "invalid_operation_kind", ref, message: `${ref}.op is not supported` });
  if (typeof operation.id !== "string" || !operation.id.trim()) errors.push({ code: "missing_operation_id", ref, message: `${ref}.id is required` });
  const nodeIds = new Set((doc.nodes || []).map((node) => node.id));
  const edgeIds = new Set((doc.edges || []).map((edge) => edge.id));
  if (operation.op === "addNode") {
    validateNodeShape(operation.node, ref, errors);
    if (operation.node?.id && nodeIds.has(operation.node.id)) errors.push({ code: "node_already_exists", ref, message: `${operation.node.id} already exists` });
  } else if (operation.op === "updateNodeFields") {
    if (!nodeIds.has(operation.nodeId)) errors.push({ code: "node_not_found", ref, message: `${operation.nodeId} does not exist` });
    validateFields(operation.fields, NODE_UPDATE_FIELDS, ref, errors);
  } else if (operation.op === "removeNode") {
    if (!nodeIds.has(operation.nodeId)) errors.push({ code: "node_not_found", ref, message: `${operation.nodeId} does not exist` });
    if ((doc.edges || []).some((edge) => edge.from === operation.nodeId || edge.to === operation.nodeId)) errors.push({ code: "node_has_edges", ref, message: `${operation.nodeId} still has incident edges; remove them explicitly first` });
  } else if (operation.op === "addEdge") {
    validateEdgeShape(operation.edge, ref, errors);
    if (operation.edge?.id && edgeIds.has(operation.edge.id)) errors.push({ code: "edge_already_exists", ref, message: `${operation.edge.id} already exists` });
    if (operation.edge?.from && !nodeIds.has(operation.edge.from)) errors.push({ code: "source_node_not_found", ref, message: `${operation.edge.from} does not exist` });
    if (operation.edge?.to && !nodeIds.has(operation.edge.to)) errors.push({ code: "target_node_not_found", ref, message: `${operation.edge.to} does not exist` });
  } else if (operation.op === "updateEdgeFields") {
    if (!edgeIds.has(operation.edgeId)) errors.push({ code: "edge_not_found", ref, message: `${operation.edgeId} does not exist` });
    validateFields(operation.fields, EDGE_UPDATE_FIELDS, ref, errors);
  } else if (operation.op === "removeEdge") {
    if (!edgeIds.has(operation.edgeId)) errors.push({ code: "edge_not_found", ref, message: `${operation.edgeId} does not exist` });
  } else if (operation.op === "setNodeLayout") {
    if (!nodeIds.has(operation.nodeId)) errors.push({ code: "node_not_found", ref, message: `${operation.nodeId} does not exist` });
    if (!isObject(operation.layout) || !Number.isFinite(operation.layout.x) || !Number.isFinite(operation.layout.y)) errors.push({ code: "invalid_layout", ref, message: `${ref}.layout must contain finite numeric x and y` });
  }
  return errors;
}

function checkPreconditions(operation, doc) {
  const errors = [];
  const preconditions = operation.preconditions || {};
  const nodeIds = new Set((doc.nodes || []).map((node) => node.id));
  const edgeIds = new Set((doc.edges || []).map((edge) => edge.id));
  for (const nodeId of preconditions.nodeExists || []) if (!nodeIds.has(nodeId)) errors.push({ code: "precondition_failed", operationId: operation.id, precondition: "nodeExists", ref: nodeId });
  for (const nodeId of preconditions.nodeAbsent || []) if (nodeIds.has(nodeId)) errors.push({ code: "precondition_failed", operationId: operation.id, precondition: "nodeAbsent", ref: nodeId });
  for (const edgeId of preconditions.edgeExists || []) if (!edgeIds.has(edgeId)) errors.push({ code: "precondition_failed", operationId: operation.id, precondition: "edgeExists", ref: edgeId });
  for (const edgeId of preconditions.edgeAbsent || []) if (edgeIds.has(edgeId)) errors.push({ code: "precondition_failed", operationId: operation.id, precondition: "edgeAbsent", ref: edgeId });
  if (preconditions.noDanglingEdges === true) {
    for (const edge of doc.edges || []) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push({ code: "precondition_failed", operationId: operation.id, precondition: "noDanglingEdges", ref: edge.id });
    }
  }
  return errors;
}

function applyOne(doc, operation) {
  if (operation.op === "addNode") doc.nodes.push(clone(operation.node));
  else if (operation.op === "updateNodeFields") doc.nodes = doc.nodes.map((node) => node.id === operation.nodeId ? { ...node, ...clone(operation.fields) } : node);
  else if (operation.op === "removeNode") doc.nodes = doc.nodes.filter((node) => node.id !== operation.nodeId);
  else if (operation.op === "addEdge") doc.edges.push(clone(operation.edge));
  else if (operation.op === "updateEdgeFields") doc.edges = doc.edges.map((edge) => edge.id === operation.edgeId ? { ...edge, ...clone(operation.fields) } : edge);
  else if (operation.op === "removeEdge") doc.edges = doc.edges.filter((edge) => edge.id !== operation.edgeId);
  else if (operation.op === "setNodeLayout") doc.nodes = doc.nodes.map((node) => node.id === operation.nodeId ? { ...node, x: operation.layout.x, y: operation.layout.y } : node);
}

export function applyOperations(doc, rawOperations, { allowLegacy = false, validateResult = true } = {}) {
  const adapted = allowLegacy ? adaptLegacyOperations(rawOperations) : { operations: clone(rawOperations || []), diagnostics: [] };
  if (!allowLegacy) {
    for (const operation of adapted.operations) {
      if (operation.kind || operation.operation || LEGACY_OPERATION_KIND_MAP[operation.op]) {
        return { ok: false, doc, appliedOperationIds: [], diagnostics: adapted.diagnostics, errors: [{ code: "legacy_operation_rejected", message: "legacy operation names require the explicit adapter" }] };
      }
    }
  }
  const next = clone(doc);
  next.nodes = Array.isArray(next.nodes) ? next.nodes : [];
  next.edges = Array.isArray(next.edges) ? next.edges : [];
  const appliedOperationIds = [];
  const errors = [];
  for (let index = 0; index < adapted.operations.length; index += 1) {
    const operation = adapted.operations[index];
    const preconditionErrors = checkPreconditions(operation, next);
    const operationErrors = validateOperation(operation, next, index);
    if (preconditionErrors.length || operationErrors.length) {
      errors.push(...preconditionErrors, ...operationErrors);
      break;
    }
    applyOne(next, operation);
    appliedOperationIds.push(operation.id);
  }
  if (errors.length) return { ok: false, doc, appliedOperationIds: [], diagnostics: adapted.diagnostics, errors };
  if (validateResult) {
    const resultErrors = validateDoc(next, { mode: "strict" }).filter((entry) => entry.level === "error");
    if (resultErrors.length) return { ok: false, doc, appliedOperationIds: [], diagnostics: adapted.diagnostics, errors: resultErrors };
  }
  return { ok: true, doc: next, appliedOperationIds, diagnostics: adapted.diagnostics, errors: [] };
}

export function operationsToChangeSet(base, operations, options = {}) {
  const applied = applyOperations(base, operations, options);
  if (!applied.ok) return { ...applied, changeSet: null };
  const diff = diffDoc(base, applied.doc);
  return { ...applied, changeSet: buildChangeSet(base, applied.doc, diff, options) };
}
