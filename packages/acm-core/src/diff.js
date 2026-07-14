import { EDGE_FIELDS, NODE_FIELDS } from "./schema.js";
import { deterministicId } from "./model.js";

const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function diffDoc(base, current) {
  const baseNodes = new Map((base.nodes || []).map((node) => [node.id, node]));
  const currentNodes = new Map((current.nodes || []).map((node) => [node.id, node]));
  const baseEdges = new Map((base.edges || []).map((edge) => [edge.id, edge]));
  const currentEdges = new Map((current.edges || []).map((edge) => [edge.id, edge]));
  const diff = {
    added_nodes: [],
    removed_nodes: [],
    modified_nodes: [],
    added_edges: [],
    removed_edges: [],
    modified_edges: [],
    layout_changes: [],
  };

  for (const [id, node] of currentNodes) {
    if (!baseNodes.has(id)) {
      diff.added_nodes.push(node);
      continue;
    }
    const before = baseNodes.get(id);
    for (const field of NODE_FIELDS) {
      if (!equal(before[field], node[field])) diff.modified_nodes.push({ id, field, before: before[field], after: node[field] });
    }
    if (before.x !== node.x || before.y !== node.y) {
      diff.layout_changes.push({ id, before: { x: before.x, y: before.y }, after: { x: node.x, y: node.y } });
    }
  }
  for (const [id, node] of baseNodes) if (!currentNodes.has(id)) diff.removed_nodes.push({ id, title: node.title });

  for (const [id, edge] of currentEdges) {
    if (!baseEdges.has(id)) {
      diff.added_edges.push(edge);
      continue;
    }
    const before = baseEdges.get(id);
    for (const field of EDGE_FIELDS) {
      if (!equal(before[field], edge[field])) diff.modified_edges.push({ id, field, before: before[field], after: edge[field] });
    }
  }
  for (const [id, edge] of baseEdges) {
    if (!currentEdges.has(id)) diff.removed_edges.push({ id, from: edge.from, to: edge.to, type: edge.type });
  }
  return diff;
}

export function diffCount(diff) {
  return diff.added_nodes.length + diff.removed_nodes.length + diff.modified_nodes.length
    + diff.added_edges.length + diff.removed_edges.length + diff.modified_edges.length;
}

export function buildChangeSet(base, current, inputDiff = diffDoc(base, current), options = {}) {
  const typeName = options.typeName || ((type) => type);
  const relationName = options.relationName || ((type) => type);
  const parts = [];
  if (inputDiff.added_nodes.length) parts.push(`新增 ${inputDiff.added_nodes.length} 个节点`);
  if (inputDiff.removed_nodes.length) parts.push(`删除 ${inputDiff.removed_nodes.length} 个节点`);
  if (inputDiff.modified_nodes.length) parts.push(`修改 ${inputDiff.modified_nodes.length} 处节点字段`);
  if (inputDiff.added_edges.length) parts.push(`新增 ${inputDiff.added_edges.length} 条关系`);
  if (inputDiff.removed_edges.length) parts.push(`删除 ${inputDiff.removed_edges.length} 条关系`);
  if (inputDiff.modified_edges.length) parts.push(`修改 ${inputDiff.modified_edges.length} 处关系字段`);
  const summary = parts.length ? `${parts.join("，")}。` : "无结构性变更。";
  const instructions = [];
  const nodeName = (id) => (current.nodes || []).find((node) => node.id === id)?.title
    || (base.nodes || []).find((node) => node.id === id)?.title
    || id;
  for (const node of inputDiff.added_nodes) instructions.push(`处理新增${typeName(node.type)}「${node.title}」(${node.id})。`);
  for (const node of inputDiff.removed_nodes) instructions.push(`移除已删除节点「${node.title}」(${node.id}) 的相关实现。`);
  for (const entry of inputDiff.modified_nodes) instructions.push(`「${nodeName(entry.id)}」的 ${entry.field}：${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}。`);
  for (const edge of inputDiff.added_edges) instructions.push(`建立关系 ${nodeName(edge.from)} —${relationName(edge.type)}→ ${nodeName(edge.to)}。`);
  for (const edge of inputDiff.removed_edges) instructions.push(`解除关系 ${nodeName(edge.from)} → ${nodeName(edge.to)}。`);
  for (const entry of inputDiff.modified_edges) instructions.push(`关系 ${entry.id} 的 ${entry.field}：${JSON.stringify(entry.before)} → ${JSON.stringify(entry.after)}。`);
  const identity = { baseDocId: base.doc_id, summary, diff: inputDiff };
  return {
    change_set_id: options.changeSetId || deterministicId("changes", identity),
    base_doc_id: base.doc_id,
    summary,
    agent_instructions: instructions,
    added_nodes: inputDiff.added_nodes,
    modified_nodes: inputDiff.modified_nodes,
    removed_nodes: inputDiff.removed_nodes,
    added_edges: inputDiff.added_edges,
    modified_edges: inputDiff.modified_edges,
    removed_edges: inputDiff.removed_edges,
    layout_changes: inputDiff.layout_changes,
  };
}
