import {
  EDGE_FIELDS,
  FORMAL_SCHEMA_VERSION,
  LEGACY_SCHEMA_VERSION,
  NODE_FIELDS,
  NODE_STATUSES,
  NODE_TYPES,
  RELATION_TYPES,
  SUPPORTED_SCHEMA_VERSIONS,
} from "./schema.js";
import { parseAcmMd } from "./parse.js";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isBlank = (value) => value == null || (typeof value === "string" && !value.trim());
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

function issue(level, code, message, ref) {
  return { level, code, msg: message, ...(ref ? { ref } : {}) };
}

function requireString(value, ref, field, issues) {
  if (value != null && typeof value !== "string") {
    issues.push(issue("error", "invalid_string", `${ref}.${field} must be a string.`, ref));
  }
}

function validateTags(value, ref, issues) {
  if (value == null) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push(issue("error", "invalid_tags", `${ref}.tags must be an array of strings.`, ref));
  }
}

function validConfidence(value) {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function validateChangeNode(node, ref, issues) {
  if (!isObject(node)) {
    issues.push(issue("error", "invalid_change_node", `${ref} must be an object.`, ref));
    return;
  }
  for (const field of ["id", "type", "title", "status"]) {
    if (isBlank(node[field])) issues.push(issue("error", "missing_change_node_field", `${ref} missing required field: ${field}.`, ref));
    else requireString(node[field], ref, field, issues);
  }
  for (const field of ["description", "source", "priority", "notes"]) requireString(node[field], ref, field, issues);
  validateTags(node.tags, ref, issues);
  if (!isBlank(node.type) && !NODE_TYPES.includes(node.type)) issues.push(issue("error", "invalid_node_type", `${ref} has invalid node type: ${node.type}.`, ref));
  if (!isBlank(node.status) && !NODE_STATUSES.includes(node.status)) issues.push(issue("error", "invalid_node_status", `${ref} has invalid status: ${node.status}.`, ref));
  if (node.confidence != null && !validConfidence(node.confidence)) issues.push(issue("error", "invalid_confidence", `${ref} confidence must be a number between 0 and 1.`, ref));
}

function validateChangeEdge(edge, ref, nodeIds, issues) {
  if (!isObject(edge)) {
    issues.push(issue("error", "invalid_change_edge", `${ref} must be an object.`, ref));
    return;
  }
  for (const field of ["id", "from", "to", "type", "status"]) {
    if (isBlank(edge[field])) issues.push(issue("error", "missing_change_edge_field", `${ref} missing required field: ${field}.`, ref));
    else requireString(edge[field], ref, field, issues);
  }
  for (const field of ["reason", "source"]) requireString(edge[field], ref, field, issues);
  if (!isBlank(edge.type) && !RELATION_TYPES.includes(edge.type)) issues.push(issue("error", "invalid_edge_type", `${ref} has invalid edge type: ${edge.type}.`, ref));
  if (!isBlank(edge.status) && !NODE_STATUSES.includes(edge.status)) issues.push(issue("error", "invalid_edge_status", `${ref} has invalid status: ${edge.status}.`, ref));
  if (!isBlank(edge.from) && !nodeIds.has(String(edge.from))) issues.push(issue("error", "dangling_change_edge", `${ref} source node does not exist: ${edge.from}.`, ref));
  if (!isBlank(edge.to) && !nodeIds.has(String(edge.to))) issues.push(issue("error", "dangling_change_edge", `${ref} target node does not exist: ${edge.to}.`, ref));
  if (edge.confidence != null && !validConfidence(edge.confidence)) issues.push(issue("error", "invalid_confidence", `${ref} confidence must be a number between 0 and 1.`, ref));
}

function changeArray(changes, field, issues) {
  if (changes[field] == null) return [];
  if (!Array.isArray(changes[field])) {
    issues.push(issue("error", "invalid_change_bucket", `changes.${field} must be an array when present.`, `changes.${field}`));
    return [];
  }
  if (changes[field].length === 0) issues.push(issue("warning", "empty_change_bucket", `changes.${field} is present but empty; omit it unless needed.`, `changes.${field}`));
  return changes[field];
}

function validateChanges(changes, nodeIds, issues) {
  if (changes == null) return;
  if (!isObject(changes)) {
    issues.push(issue("error", "invalid_changes", "changes must be an object when present.", "changes"));
    return;
  }
  for (const field of ["change_set_id", "base_doc_id", "summary"]) {
    if (isBlank(changes[field])) issues.push(issue("error", "missing_changes_field", `changes.${field} is required when changes is present.`, "changes"));
    else requireString(changes[field], "changes", field, issues);
  }
  if (changes.agent_instructions != null && (!Array.isArray(changes.agent_instructions) || changes.agent_instructions.some((item) => typeof item !== "string"))) {
    issues.push(issue("error", "invalid_agent_instructions", "changes.agent_instructions must be an array of strings.", "changes"));
  }
  const addedNodeIds = new Set();
  changeArray(changes, "added_nodes", issues).forEach((node, index) => {
    validateChangeNode(node, `changes.added_nodes[${index}]`, issues);
    if (typeof node?.id === "string") addedNodeIds.add(node.id);
  });
  const knownNodeIds = new Set([...nodeIds, ...addedNodeIds]);
  changeArray(changes, "added_edges", issues).forEach((edge, index) => validateChangeEdge(edge, `changes.added_edges[${index}]`, knownNodeIds, issues));
  for (const field of ["modified_nodes", "modified_edges"]) {
    changeArray(changes, field, issues).forEach((entry, index) => {
      const ref = `changes.${field}[${index}]`;
      if (!isObject(entry)) {
        issues.push(issue("error", "invalid_modified_entry", `${ref} must be an object.`, ref));
        return;
      }
      for (const required of ["id", "field"]) {
        if (isBlank(entry[required])) issues.push(issue("error", "missing_modified_field", `${ref} missing required field: ${required}.`, ref));
        else requireString(entry[required], ref, required, issues);
      }
      for (const required of ["before", "after"]) {
        if (!(required in entry)) issues.push(issue("error", "missing_modified_value", `${ref} missing required field: ${required}.`, ref));
      }
    });
  }
  changeArray(changes, "removed_nodes", issues).forEach((entry, index) => {
    const ref = `changes.removed_nodes[${index}]`;
    if (!isObject(entry)) issues.push(issue("error", "invalid_removed_node", `${ref} must be an object.`, ref));
    else {
      if (isBlank(entry.id)) issues.push(issue("error", "missing_removed_node_id", `${ref} missing required field: id.`, ref));
      requireString(entry.id, ref, "id", issues);
      requireString(entry.title, ref, "title", issues);
      requireString(entry.reason, ref, "reason", issues);
    }
  });
  changeArray(changes, "removed_edges", issues).forEach((entry, index) => {
    const ref = `changes.removed_edges[${index}]`;
    if (!isObject(entry)) {
      issues.push(issue("error", "invalid_removed_edge", `${ref} must be an object.`, ref));
      return;
    }
    for (const field of ["id", "from", "to", "type"]) {
      if (isBlank(entry[field])) issues.push(issue("error", "missing_removed_edge_field", `${ref} missing required field: ${field}.`, ref));
      else requireString(entry[field], ref, field, issues);
    }
    if (!isBlank(entry.type) && !RELATION_TYPES.includes(entry.type)) issues.push(issue("error", "invalid_edge_type", `${ref} has invalid edge type: ${entry.type}.`, ref));
    requireString(entry.reason, ref, "reason", issues);
  });
  changeArray(changes, "layout_changes", issues).forEach((entry, index) => {
    const ref = `changes.layout_changes[${index}]`;
    if (!isObject(entry)) {
      issues.push(issue("error", "invalid_layout_change", `${ref} must be an object.`, ref));
      return;
    }
    if (isBlank(entry.id)) issues.push(issue("error", "missing_layout_change_id", `${ref} missing required field: id.`, ref));
    else requireString(entry.id, ref, "id", issues);
    for (const side of ["before", "after"]) {
      const point = entry[side];
      if (!isObject(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
        issues.push(issue("error", "invalid_layout_change_point", `${ref}.${side} must contain finite numeric x and y.`, ref));
      }
    }
  });
}

function validateLayout(layout, nodeIds, issues) {
  if (layout == null) return;
  if (!isObject(layout)) {
    issues.push(issue("error", "invalid_layout", "layout must be an object when present.", "layout"));
    return;
  }
  requireString(layout.engine, "layout", "engine", issues);
  if (layout.nodes == null) {
    issues.push(issue("warning", "missing_layout_nodes", "layout is present but layout.nodes is missing.", "layout"));
    return;
  }
  if (!isObject(layout.nodes)) {
    issues.push(issue("error", "invalid_layout_nodes", "layout.nodes must be an object keyed by node id.", "layout"));
    return;
  }
  for (const [nodeId, point] of Object.entries(layout.nodes)) {
    const ref = `layout.nodes[${nodeId}]`;
    if (!nodeIds.has(nodeId)) issues.push(issue("warning", "unknown_layout_node", `${ref} references an unknown node id.`, ref));
    if (!isObject(point) || !isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
      issues.push(issue("error", "invalid_layout_point", `${ref} must contain finite numeric x and y.`, ref));
    }
  }
}

function semanticWarnings(nodes, edges, issues) {
  const nodeMap = new Map(nodes.filter(isObject).map((node) => [node.id, node]));
  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of edges.filter(isObject)) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }
  const goals = [...nodeMap.values()].filter((node) => node.type === "Goal");
  for (const goal of goals) if (!(outgoing.get(goal.id) || []).length) issues.push(issue("warning", "goal_without_outgoing", `Goal has no outgoing edge: ${goal.id}.`, goal.id));
  if (goals.length > 1) {
    const goalIds = new Set(goals.map((goal) => goal.id));
    if (!edges.some((edge) => isObject(edge) && goalIds.has(edge.from) && goalIds.has(edge.to))) issues.push(issue("warning", "unlinked_goals", "Multiple Goal nodes exist but no relation links them."));
  }
  for (const node of nodeMap.values()) {
    if (node.type === "Risk" && !(outgoing.get(node.id) || []).some((edge) => edge.type === "impacts")) issues.push(issue("warning", "risk_without_impact", `Risk has no impacts edge: ${node.id}.`, node.id));
    if (node.type === "Question" && !(outgoing.get(node.id) || []).length && !(incoming.get(node.id) || []).length) issues.push(issue("warning", "question_without_relation", `Question has no validation relation: ${node.id}.`, node.id));
    if (node.type === "Feature") {
      const inModule = (incoming.get(node.id) || []).some((edge) => edge.type === "contains" && nodeMap.get(edge.from)?.type === "Module");
      if (!inModule) issues.push(issue("warning", "feature_without_module", `Feature has no containing Module: ${node.id}.`, node.id));
    }
  }
}

export function validateDoc(doc, { mode = "strict" } = {}) {
  const issues = [];
  if (!isObject(doc)) return [issue("error", "invalid_document", "图谱文档必须是对象")];

  requireString(doc.schema_version, "top-level", "schema_version", issues);
  if (isBlank(doc.schema_version)) issues.push(issue("error", "missing_schema_version", "缺少 schema_version"));
  else if (!SUPPORTED_SCHEMA_VERSIONS.includes(doc.schema_version)) issues.push(issue("error", "unsupported_schema_version", `不支持的 schema_version：${doc.schema_version}`));
  else if (doc.schema_version === LEGACY_SCHEMA_VERSION) issues.push(issue(mode === "strict" ? "error" : "warning", "legacy_schema_version", `旧版 schema_version：导出时应使用 ${FORMAL_SCHEMA_VERSION}`));
  requireString(doc.doc_id, "top-level", "doc_id", issues);
  if (isBlank(doc.doc_id)) issues.push(issue("error", "missing_doc_id", "缺少 doc_id"));

  const meta = isObject(doc.meta) ? doc.meta : {};
  if (!isObject(doc.meta)) issues.push(issue("error", "invalid_meta", "缺少 meta 对象"));
  requireString(meta.title, "meta", "title", issues);
  if (isBlank(meta.title)) issues.push(issue("error", "missing_meta_title", "缺少 meta.title"));
  for (const field of ["created_by", "created_at", "updated_at", "purpose", "source"]) requireString(meta[field], "meta", field, issues);

  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc.edges) ? doc.edges : [];
  if (!Array.isArray(doc.nodes)) issues.push(issue("error", "invalid_nodes", "nodes 必须是数组"));
  if (!Array.isArray(doc.edges)) issues.push(issue("error", "invalid_edges", "edges 必须是数组"));

  const nodeIds = new Set();
  nodes.forEach((node, index) => {
    const ref = `nodes[${index}]`;
    if (!isObject(node)) {
      issues.push(issue("error", "invalid_node", `${ref} must be an object.`, ref));
      return;
    }
    for (const field of ["id", "type", "title", "status"]) {
      if (isBlank(node[field])) issues.push(issue("error", "missing_node_field", `${ref} missing required field: ${field}.`, node.id || ref));
      else requireString(node[field], ref, field, issues);
    }
    for (const field of ["description", "source", "priority", "notes"]) requireString(node[field], ref, field, issues);
    validateTags(node.tags, ref, issues);
    if (!isBlank(node.id)) {
      if (nodeIds.has(String(node.id))) issues.push(issue("error", "duplicate_node_id", `节点 id 重复：${node.id}`, String(node.id)));
      nodeIds.add(String(node.id));
    }
    if (!isBlank(node.type) && !NODE_TYPES.includes(node.type)) issues.push(issue("error", "invalid_node_type", `非法节点类型：${node.type}`, node.id));
    if (!isBlank(node.status) && !NODE_STATUSES.includes(node.status)) issues.push(issue("error", "invalid_node_status", `非法节点状态：${node.status}`, node.id));
    if (node.confidence != null && !validConfidence(node.confidence)) issues.push(issue("error", "invalid_confidence", `${ref} confidence must be a number between 0 and 1.`, node.id));
    if (!("confidence" in node)) issues.push(issue("warning", "missing_confidence", `${ref} missing recommended field: confidence.`, node.id));
    if (isBlank(node.source)) issues.push(issue("warning", "missing_source", `${ref} missing recommended field: source.`, node.id));
  });

  const edgeIds = new Set();
  const edgePairs = new Map();
  const edgeTriples = new Set();
  edges.forEach((edge, index) => {
    const ref = `edges[${index}]`;
    if (!isObject(edge)) {
      issues.push(issue("error", "invalid_edge", `${ref} must be an object.`, ref));
      return;
    }
    for (const field of ["id", "from", "to", "type", "status"]) {
      if (isBlank(edge[field])) issues.push(issue("error", "missing_edge_field", `${ref} missing required field: ${field}.`, edge.id || ref));
      else requireString(edge[field], ref, field, issues);
    }
    for (const field of ["reason", "source"]) requireString(edge[field], ref, field, issues);
    if (!isBlank(edge.id)) {
      if (edgeIds.has(String(edge.id))) issues.push(issue("error", "duplicate_edge_id", `边 id 重复：${edge.id}`, edge.id));
      edgeIds.add(String(edge.id));
    }
    if (!isBlank(edge.type) && !RELATION_TYPES.includes(edge.type)) issues.push(issue("error", "invalid_edge_type", `非法关系类型：${edge.type}`, edge.id));
    if (!isBlank(edge.status) && !NODE_STATUSES.includes(edge.status)) issues.push(issue("error", "invalid_edge_status", `非法边状态：${edge.status}`, edge.id));
    if (!isBlank(edge.from) && !nodeIds.has(String(edge.from))) issues.push(issue("error", "dangling_edge", `悬空边：${edge.id} 的来源 ${edge.from} 不存在`, edge.id));
    if (!isBlank(edge.to) && !nodeIds.has(String(edge.to))) issues.push(issue("error", "dangling_edge", `悬空边：${edge.id} 的目标 ${edge.to} 不存在`, edge.id));
    if (edge.confidence != null && !validConfidence(edge.confidence)) issues.push(issue("error", "invalid_confidence", `${ref} confidence must be a number between 0 and 1.`, edge.id));
    if (edge.status === "suggested") issues.push(issue("warning", "suggested_edge", `${ref} is still suggested and not confirmed.`, edge.id));
    if (!isBlank(edge.from) && !isBlank(edge.to)) {
      if (edge.from === edge.to) issues.push(issue("warning", "self_loop", `${ref} is a self-loop; confirm the target app supports it.`, edge.id));
      const pair = `${edge.from}\u0000${edge.to}`;
      edgePairs.set(pair, [...(edgePairs.get(pair) || []), ref]);
      const triple = `${pair}\u0000${edge.type}`;
      if (edgeTriples.has(triple)) issues.push(issue("warning", "duplicate_relation", `${ref} duplicates an existing relation with the same from/to/type.`, edge.id));
      edgeTriples.add(triple);
    }
  });
  for (const [pair, refs] of edgePairs) {
    if (refs.length > 1) issues.push(issue("warning", "parallel_edges", `Multiple edges share the same from/to pair ${pair.replace("\u0000", " -> ")}: ${refs.join(", ")}.`));
  }

  validateChanges(doc.changes, nodeIds, issues);
  validateLayout(doc.layout, nodeIds, issues);
  if (doc.validation != null && !isObject(doc.validation)) issues.push(issue("error", "invalid_validation", "validation must be an object when present.", "validation"));
  semanticWarnings(nodes, edges, issues);
  return issues;
}

export function validateAcmMd(text, { mode = "strict" } = {}) {
  const parsed = parseAcmMd(text, { mode });
  const issues = [
    ...parsed.errors.map((message) => issue("error", "parse_error", message)),
    ...parsed.warnings.map((message) => issue("warning", "parse_warning", message)),
  ];
  if (parsed.doc) issues.push(...validateDoc(parsed.doc, { mode }));
  return { doc: parsed.doc, issues, errors: issues.filter((item) => item.level === "error"), warnings: issues.filter((item) => item.level === "warning") };
}

export function isStrictlyValid(doc) {
  return !validateDoc(doc, { mode: "strict" }).some((item) => item.level === "error");
}

export const MODEL_NODE_FIELDS = NODE_FIELDS;
export const MODEL_EDGE_FIELDS = EDGE_FIELDS;
