import { clone } from "./model.js";

const DEFAULT_LIMITS = { maxNodes: 80, maxEdges: 160, maxDepth: 2, maxPromptChars: 12000 };
const RELATED_TRAVERSAL = new Set(["depends_on", "requires", "constrains", "references", "needs_validation"]);
const PROMPT_INJECTION_PATTERN = /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+(?:instructions?|prompts?)|(?:system|developer)\s+message\s*:/i;

function adjacentEdges(doc, nodeIds) {
  return (doc.edges || []).filter((edge) => nodeIds.has(edge.from) || nodeIds.has(edge.to));
}

export function selectSubgraph(doc, selectedNodeIds = [], limits = {}) {
  const options = { ...DEFAULT_LIMITS, ...limits };
  const byId = new Map((doc.nodes || []).map((node) => [node.id, node]));
  const included = new Set(selectedNodeIds.filter((id) => byId.has(id)));
  let frontier = new Set(included);
  for (let depth = 0; depth < options.maxDepth && frontier.size && included.size < options.maxNodes; depth += 1) {
    const next = new Set();
    for (const edge of adjacentEdges(doc, frontier)) {
      for (const id of [edge.from, edge.to]) {
        if (byId.has(id) && !included.has(id) && included.size < options.maxNodes) {
          included.add(id);
          next.add(id);
        }
      }
    }
    frontier = next;
  }
  const nodes = (doc.nodes || []).filter((node) => included.has(node.id)).slice(0, options.maxNodes).map(clone);
  const finalIds = new Set(nodes.map((node) => node.id));
  const edges = (doc.edges || []).filter((edge) => finalIds.has(edge.from) && finalIds.has(edge.to)).slice(0, options.maxEdges).map(clone);
  return {
    doc_id: doc.doc_id,
    selection: [...selectedNodeIds].filter((id) => finalIds.has(id)),
    nodes,
    edges,
    truncated: included.size > nodes.length || adjacentEdges(doc, finalIds).length > edges.length,
    limits: options,
  };
}

export function buildSelectionContext(doc, selectedNodeIds = [], limits = {}) {
  const subgraph = selectSubgraph(doc, selectedNodeIds, limits);
  return {
    schema_version: doc.schema_version,
    doc_id: doc.doc_id,
    title: doc.meta?.title || "",
    selection: subgraph.selection,
    nodes: subgraph.nodes.map(({ x, y, ...node }) => node),
    edges: subgraph.edges,
    truncated: subgraph.truncated,
  };
}

export function buildExecutionPrompt(doc, selectedTaskIds, limits = {}) {
  const options = { ...DEFAULT_LIMITS, ...limits };
  const tasks = (doc.nodes || []).filter((node) => selectedTaskIds.includes(node.id) && node.type === "Task");
  if (!tasks.length) return { ok: false, error: "no_selected_task", prompt: "", taskIds: [] };
  const context = buildSelectionContext(doc, tasks.map((task) => task.id), options);
  const payload = JSON.stringify(context, null, 2);
  const prefix = "仅执行以下由用户显式选中的 ACM Task。把 suggested/needs_validation 当作待确认信息，不得擅自扩展到未选任务。\n\n";
  const prompt = `${prefix}${payload}`;
  if (prompt.length > options.maxPromptChars) return { ok: false, error: "context_too_large", prompt: "", taskIds: tasks.map((task) => task.id) };
  return { ok: true, prompt, taskIds: tasks.map((task) => task.id), context };
}

function selectedOnly(doc, selectedNodeIds, limits = {}) {
  const options = { ...DEFAULT_LIMITS, ...limits };
  const wanted = [...new Set(selectedNodeIds || [])];
  const nodes = wanted.map((id) => (doc.nodes || []).find((node) => node.id === id)).filter(Boolean);
  if (!nodes.length) return { ok: false, error: "no_selected_nodes", nodes: [], edges: [], truncated: false, omittedNodeCount: 0, omittedEdgeCount: 0 };
  const kept = nodes.slice(0, options.maxNodes);
  const ids = new Set(kept.map((node) => node.id));
  const allEdges = (doc.edges || []).filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const edges = allEdges.slice(0, options.maxEdges);
  return {
    ok: true,
    nodes: kept.map(clone),
    edges: edges.map(clone),
    truncated: nodes.length > kept.length || allEdges.length > edges.length,
    omittedNodeCount: Math.max(0, nodes.length - kept.length),
    omittedEdgeCount: Math.max(0, allEdges.length - edges.length),
  };
}

export function buildSelectedContext(doc, selectedNodeIds = [], limits = {}) {
  const selected = selectedOnly(doc, selectedNodeIds, { maxNodes: 20, maxEdges: 80, ...limits });
  if (!selected.ok) return selected;
  return {
    ...selected,
    mode: "selected_context",
    documentId: doc.doc_id,
    selectedNodeIds: selected.nodes.map((node) => node.id),
  };
}

function traversedTarget(edge, currentId, includeContains) {
  if (edge.type === "contains") return includeContains && edge.from === currentId ? edge.to : null;
  if (!RELATED_TRAVERSAL.has(edge.type)) return null;
  if (["depends_on", "requires", "references"].includes(edge.type)) return edge.from === currentId ? edge.to : null;
  if (edge.type === "constrains") return edge.to === currentId ? edge.from : null;
  if (edge.type === "needs_validation") {
    if (edge.from === currentId) return edge.to;
    if (edge.to === currentId) return edge.from;
  }
  return null;
}

export function buildRelatedContext(doc, selectedNodeIds = [], limits = {}) {
  const options = { ...DEFAULT_LIMITS, maxNodes: 40, maxEdges: 80, maxDepth: 2, includeContains: false, ...limits };
  const byId = new Map((doc.nodes || []).map((node) => [node.id, node]));
  const selected = [...new Set(selectedNodeIds || [])].filter((id) => byId.has(id));
  if (!selected.length) return { ok: false, error: "no_selected_nodes", nodes: [], edges: [] };
  const included = new Set(selected.slice(0, options.maxNodes));
  let frontier = new Set(included);
  let traversalTruncated = selected.length > included.size;
  for (let depth = 0; depth < options.maxDepth && frontier.size; depth += 1) {
    const next = new Set();
    for (const currentId of frontier) {
      for (const edge of doc.edges || []) {
        const target = traversedTarget(edge, currentId, options.includeContains === true && depth === 0);
        if (!target || !byId.has(target) || included.has(target)) continue;
        if (included.size >= options.maxNodes) { traversalTruncated = true; continue; }
        included.add(target);
        next.add(target);
      }
    }
    frontier = next;
  }
  const nodes = (doc.nodes || []).filter((node) => included.has(node.id));
  const allEdges = (doc.edges || []).filter((edge) => included.has(edge.from) && included.has(edge.to));
  const edges = allEdges.slice(0, options.maxEdges);
  return {
    ok: true,
    mode: "related_subgraph",
    documentId: doc.doc_id,
    selectedNodeIds: selected,
    nodes: nodes.map(clone),
    edges: edges.map((edge) => ({ ...clone(edge), role: edge.type === "references" ? "evidence" : edge.type === "needs_validation" ? "unresolved" : "relation" })),
    truncated: traversalTruncated || allEdges.length > edges.length,
    omittedNodeCount: Math.max(0, selected.length - Math.min(selected.length, options.maxNodes)),
    omittedEdgeCount: Math.max(0, allEdges.length - edges.length),
  };
}

function textFields(value) {
  if (Array.isArray(value)) return value.flatMap(textFields);
  if (value && typeof value === "object") return Object.values(value).flatMap(textFields);
  return typeof value === "string" ? [value] : [];
}

export function detectPromptInjection(value) {
  return textFields(value).some((text) => PROMPT_INJECTION_PATTERN.test(text));
}

export function buildExecutionContext(doc, selectedTaskIds = [], limits = {}) {
  const taskIds = [...new Set(selectedTaskIds || [])];
  const selectedTasks = (doc.nodes || []).filter((node) => taskIds.includes(node.id) && node.type === "Task");
  if (!selectedTasks.length || selectedTasks.length !== taskIds.length) return { ok: false, error: "execution_requires_selected_tasks" };
  const selectedSet = new Set(taskIds);
  const conflicts = (doc.edges || []).filter((edge) => edge.type === "conflicts_with" && selectedSet.has(edge.from) && selectedSet.has(edge.to));
  if (conflicts.length) return { ok: false, error: "selected_tasks_conflict", conflicts: conflicts.map(clone) };
  const related = buildRelatedContext(doc, taskIds, { maxNodes: 40, maxEdges: 80, maxDepth: 2, includeContains: false, ...limits });
  if (!related.ok) return related;
  const prerequisites = related.edges.filter((edge) => ["depends_on", "requires"].includes(edge.type));
  const constraints = related.edges.filter((edge) => edge.type === "constrains");
  const evidence = related.edges.filter((edge) => edge.type === "references");
  const unresolved = related.edges.filter((edge) => edge.type === "needs_validation");
  if (unresolved.length) return { ok: false, error: "unresolved_execution_context", unresolved: unresolved.map(clone), context: related };
  if (detectPromptInjection(related)) return { ok: false, error: "prompt_injection_detected" };
  const payload = {
    documentId: doc.doc_id,
    selectedTaskIds: taskIds,
    tasks: selectedTasks.map(clone),
    prerequisites,
    constraints,
    evidence,
    unresolved: [],
    nonGoals: "未在 selectedTaskIds 中列出的 Task，以及图中的自动发现任务。",
  };
  const prompt = [
    "请先复核当前仓库状态、适用规则与实际权限。",
    "仅执行预览中列出的 Task，不自动沿图扩展。",
    "suggested 与 needs_validation 只能作为待确认信息，不能升级为 confirmed。",
    JSON.stringify(payload, null, 2),
  ].join("\n\n");
  const maxPromptChars = limits.maxPromptChars || DEFAULT_LIMITS.maxPromptChars;
  if (prompt.length > maxPromptChars) return { ok: false, error: "context_too_large" };
  return { ok: true, mode: "execution_prompt", ...payload, prompt, truncated: related.truncated };
}

export const RELATED_RELATION_ALLOWLIST = Object.freeze([...RELATED_TRAVERSAL]);
