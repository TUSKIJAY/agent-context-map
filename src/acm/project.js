// Pure Viewer projections and navigation helpers.
//
// These functions return ids and view options only. They never clone, annotate or
// mutate canonical ACM nodes/edges, so layout/filter/hash state cannot leak into
// ACM-MD or Agent Diff exports.

export const VIEW_IDS = ["structure", "dependency", "inquiry"];

export const VIEW_META = {
  structure: {
    label: "结构",
    short: "Structure",
    description: "以 contains 层级浏览完整 Spec。",
  },
  dependency: {
    label: "依赖",
    short: "Dependency",
    description: "主依赖参与排序，impacts 作为辅助层。",
  },
  inquiry: {
    label: "探询",
    short: "Inquiry",
    description: "聚焦问题、假设、风险、决策及一跳关联。",
  },
};

const DEPENDENCY_PRIMARY = new Set(["depends_on", "requires", "constrains", "conflicts_with"]);
const DEPENDENCY_AUXILIARY = new Set(["impacts"]);
const INQUIRY_NODE_TYPES = new Set(["Question", "Assumption", "Risk", "Decision"]);
const INQUIRY_RELATIONS = new Set(["needs_validation", "answers", "impacts", "constrains"]);

export function project(doc, requestedViewId = "structure", options = {}) {
  const viewId = VIEW_IDS.includes(requestedViewId) ? requestedViewId : "structure";
  const nodes = array(doc?.nodes).filter((node) => node && typeof node.id === "string");
  const nodeSet = new Set(nodes.map((node) => node.id));
  const edges = array(doc?.edges).filter((edge) => (
    edge && typeof edge.id === "string" && nodeSet.has(edge.from) && nodeSet.has(edge.to)
  ));

  if (viewId === "structure") {
    const showAuxiliary = options.showAuxiliary === true;
    const keptEdges = edges.filter((edge) => edge.type === "contains" || showAuxiliary);
    const edgeIds = keptEdges.map((edge) => edge.id);
    const layoutEdgeIds = keptEdges.filter((edge) => edge.type === "contains").map((edge) => edge.id);
    const auxiliaryEdgeIds = keptEdges.filter((edge) => edge.type !== "contains").map((edge) => edge.id);
    return projection(viewId, nodes.map((node) => node.id), edgeIds, layoutEdgeIds, auxiliaryEdgeIds, showAuxiliary);
  }

  if (viewId === "dependency") {
    const showAuxiliary = options.showAuxiliary !== false;
    const keptEdges = edges.filter((edge) => (
      DEPENDENCY_PRIMARY.has(edge.type) || (showAuxiliary && DEPENDENCY_AUXILIARY.has(edge.type))
    ));
    const keptNodes = endpoints(keptEdges);
    const edgeIds = keptEdges.map((edge) => edge.id);
    const layoutEdgeIds = keptEdges.filter((edge) => DEPENDENCY_PRIMARY.has(edge.type)).map((edge) => edge.id);
    const auxiliaryEdgeIds = keptEdges.filter((edge) => DEPENDENCY_AUXILIARY.has(edge.type)).map((edge) => edge.id);
    return projection(
      viewId,
      nodes.filter((node) => keptNodes.has(node.id)).map((node) => node.id),
      edgeIds,
      layoutEdgeIds,
      auxiliaryEdgeIds,
      showAuxiliary,
    );
  }

  const seedIds = new Set(nodes.filter((node) => INQUIRY_NODE_TYPES.has(node.type)).map((node) => node.id));
  const keptNodes = new Set(seedIds);
  for (const edge of edges) {
    if (!INQUIRY_RELATIONS.has(edge.type)) continue;
    if (seedIds.has(edge.from) || seedIds.has(edge.to)) {
      keptNodes.add(edge.from);
      keptNodes.add(edge.to);
    }
  }
  const keptEdges = edges.filter((edge) => (
    INQUIRY_RELATIONS.has(edge.type) && keptNodes.has(edge.from) && keptNodes.has(edge.to)
  ));
  const edgeIds = keptEdges.map((edge) => edge.id);
  return projection(
    viewId,
    nodes.filter((node) => keptNodes.has(node.id)).map((node) => node.id),
    edgeIds,
    edgeIds,
    [],
    true,
  );
}

export function filterProjection(doc, base, filters = {}) {
  const nodeById = new Map(array(doc?.nodes).filter(Boolean).map((node) => [node.id, node]));
  const edgeById = new Map(array(doc?.edges).filter(Boolean).map((edge) => [edge.id, edge]));
  const type = filters.type || null;
  const status = filters.status || null;
  const nodeIds = array(base?.nodeIds).filter((id) => {
    const node = nodeById.get(id);
    return node && (!type || node.type === type) && (!status || node.status === status);
  });
  const nodeSet = new Set(nodeIds);
  const edgeIds = array(base?.edgeIds).filter((id) => {
    const edge = edgeById.get(id);
    return edge && nodeSet.has(edge.from) && nodeSet.has(edge.to);
  });
  const edgeSet = new Set(edgeIds);
  return projection(
    base?.viewId || "structure",
    nodeIds,
    edgeIds,
    array(base?.options?.layoutEdgeIds).filter((id) => edgeSet.has(id)),
    array(base?.options?.auxiliaryEdgeIds).filter((id) => edgeSet.has(id)),
    base?.options?.showAuxiliary === true,
  );
}

export function searchNodes(doc, query) {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return [];
  return array(doc?.nodes).filter((node) => {
    if (!node) return false;
    const tags = Array.isArray(node.tags) ? node.tags.join(" ") : "";
    return [node.id, node.title, tags].some((value) => (
      String(value || "").toLocaleLowerCase().includes(needle)
    ));
  }).map((node) => node.id);
}

export function focusNeighborhood(doc, nodeId, depth = 1) {
  const nodes = array(doc?.nodes);
  const nodeIds = new Set(nodes.filter(Boolean).map((node) => node.id));
  if (!nodeIds.has(nodeId)) return { nodes: new Set(), edges: new Set() };
  const maxDepth = Math.max(0, Math.floor(Number(depth) || 0));
  const keptNodes = new Set([nodeId]);
  if (maxDepth === 0) return { nodes: keptNodes, edges: new Set() };

  const edges = array(doc?.edges).filter((edge) => (
    edge && nodeIds.has(edge.from) && nodeIds.has(edge.to)
  ));
  let frontier = new Set([nodeId]);
  for (let level = 0; level < maxDepth && frontier.size; level++) {
    const next = new Set();
    for (const edge of edges) {
      if (frontier.has(edge.from) && !keptNodes.has(edge.to)) next.add(edge.to);
      if (frontier.has(edge.to) && !keptNodes.has(edge.from)) next.add(edge.from);
    }
    for (const id of next) keptNodes.add(id);
    frontier = next;
  }
  const keptEdges = new Set(edges
    .filter((edge) => keptNodes.has(edge.from) && keptNodes.has(edge.to))
    .map((edge) => edge.id));
  return { nodes: keptNodes, edges: keptEdges };
}

export function parseViewerHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(raw);
  const requestedView = params.get("view");
  const nodeId = cleanHashValue(params.get("node"));
  return {
    viewId: VIEW_IDS.includes(requestedView) ? requestedView : "structure",
    nodeId,
  };
}

export function serializeViewerHash({ viewId = "structure", nodeId = null } = {}) {
  const params = new URLSearchParams();
  params.set("view", VIEW_IDS.includes(viewId) ? viewId : "structure");
  const cleanNodeId = cleanHashValue(nodeId);
  if (cleanNodeId) params.set("node", cleanNodeId);
  return `#${params.toString()}`;
}

function projection(viewId, nodeIds, edgeIds, layoutEdgeIds, auxiliaryEdgeIds, showAuxiliary = false) {
  return {
    viewId,
    nodeIds,
    edgeIds,
    options: { layoutEdgeIds, auxiliaryEdgeIds, showAuxiliary },
  };
}

function endpoints(edges) {
  const ids = new Set();
  for (const edge of edges) {
    ids.add(edge.from);
    ids.add(edge.to);
  }
  return ids;
}

function cleanHashValue(value) {
  const text = String(value || "").trim();
  return text || null;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}
