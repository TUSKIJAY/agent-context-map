import { clone } from "./model.js";

const DEFAULT_LIMITS = { maxNodes: 80, maxEdges: 160, maxDepth: 2, maxPromptChars: 12000 };

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
