import { TYPE_PREFIX } from "./schema.js";
import { clone, nextId } from "./model.js";
import { adaptLegacyOperation, applyOperations } from "./operations.js";

const pendingOperations = (patch) => (patch?.operations || []).filter((operation) => operation.status === "pending");
const kindOf = (operation) => adaptLegacyOperation(operation).operation?.op;

function nextNodeId(type, used) {
  const id = nextId(TYPE_PREFIX[type] || "node", used);
  used.add(id);
  return id;
}

function nextEdgeId(used) {
  const id = nextId("edge", used);
  used.add(id);
  return id;
}

export function agentPatchStats(patch, status = "pending") {
  const operations = (patch?.operations || []).filter((operation) => status === "all" || operation.status === status);
  const nodes = operations.filter((operation) => kindOf(operation) === "addNode").length;
  const edges = operations.filter((operation) => kindOf(operation) === "addEdge").length;
  const questions = operations.filter((operation) => {
    const kind = kindOf(operation);
    return (kind === "addNode" && (operation.node?.status === "needs_validation" || operation.node?.type === "Question"))
      || (kind === "addEdge" && operation.edge?.status === "needs_validation")
      || kind === "updateNodeFields";
  }).length;
  return { nodes, edges, questions, total: operations.length };
}

export function createMockAgentPatch(doc, baseNodeId, prompt = "", { timestamp = Date.now() } = {}) {
  const base = (doc.nodes || []).find((node) => node.id === baseNodeId)
    || (doc.nodes || []).find((node) => node.type === "Module")
    || (doc.nodes || [])[0]
    || { id: null, x: 120, y: 180 };
  const usedNodeIds = new Set((doc.nodes || []).map((node) => node.id));
  const usedEdgeIds = new Set((doc.edges || []).map((edge) => edge.id));
  const x = Number.isFinite(base.x) ? base.x : 120;
  const y = Number.isFinite(base.y) ? base.y : 180;
  const node = (type, title, dx, dy, extra = {}) => ({
    id: nextNodeId(type, usedNodeIds),
    type,
    title,
    status: extra.status || "suggested",
    description: extra.description || "",
    priority: extra.priority || "",
    source: "agent_mock",
    confidence: extra.confidence ?? 0.72,
    tags: extra.tags || ["agent_suggestion"],
    notes: extra.notes || "",
    x: Math.round(x + dx),
    y: Math.round(y + dy),
  });
  const nodes = {
    bulk: node("Feature", "批量导入需求文档", 330, -210, { priority: "P1", description: "支持一次选择多份需求文档进入解析流程，并保留导入批次上下文。" }),
    parser: node("Module", "文档解析器", 360, -40, { description: "抽取 Word/PDF 中的标题、段落、表格与疑似需求项，生成待校正图谱草稿。" }),
    data: node("DataEntity", "Word/PDF 输入", 620, -10, { description: "用户上传的 .docx / .pdf 需求文档原始输入。" }),
    risk: node("Risk", "解析失败风险", 380, 140, { confidence: 0.64, description: "版式复杂、扫描件、表格嵌套或编码异常可能导致解析质量下降。" }),
    correct: node("Feature", "人工校正入口", 340, 300, { description: "让用户在采纳前修正 Agent 抽取的节点、字段与关系。" }),
    scan: node("Question", "是否支持图片扫描件", 630, 250, { status: "needs_validation", confidence: 0.5, description: "需要确认是否支持 OCR 处理图片型 PDF / 扫描件。" }),
  };
  const edge = (from, to, type, extra = {}) => ({
    id: nextEdgeId(usedEdgeIds),
    from,
    to,
    type,
    status: extra.status || "suggested",
    reason: extra.reason || "",
    source: "agent_mock",
    confidence: extra.confidence ?? 0.72,
  });
  const edges = [
    edge(base.id, nodes.bulk.id, "contains", { reason: "用户希望在当前模块下新增批量导入能力。" }),
    edge(base.id, nodes.parser.id, "contains", { reason: "批量导入需要一个解析子模块承载文档处理。" }),
    edge(nodes.parser.id, nodes.data.id, "depends_on", { reason: "解析器依赖用户提供的 Word/PDF 输入。" }),
    edge(nodes.risk.id, nodes.bulk.id, "impacts", { reason: "解析失败会影响批量导入体验与结果可信度。" }),
    edge(base.id, nodes.correct.id, "contains", { reason: "建议提供人工校正入口，避免 AI 建议直接污染正式图谱。" }),
    edge(nodes.scan.id, nodes.bulk.id, "needs_validation", { status: "needs_validation", confidence: 0.5, reason: "扫描件支持范围需要人工确认。" }),
  ];
  const operations = [
    ...Object.values(nodes).map((item, index) => ({ id: `op_${timestamp}_${String(index + 1).padStart(2, "0")}`, op: "addNode", status: "pending", node: item })),
    ...edges.map((item, index) => ({ id: `op_${timestamp}_${String(index + 7).padStart(2, "0")}`, op: "addEdge", status: "pending", edge: item })),
  ];
  const stats = agentPatchStats({ operations });
  return {
    id: `agent_patch_${Number(timestamp).toString(36)}`,
    createdAt: new Date(timestamp).toISOString(),
    source: "agent_mock",
    prompt,
    summary: `建议新增 ${stats.nodes} 个节点和 ${stats.edges} 条关系，其中 ${stats.questions} 处需要人工确认。`,
    baseNodeId: base.id,
    operations,
  };
}

export function previewAgentPatchDoc(doc, patch) {
  const pending = pendingOperations(patch);
  if (!pending.length) return doc;
  const baseNodeIds = new Set((doc.nodes || []).map((node) => node.id));
  const addNodes = pending
    .filter((operation) => kindOf(operation) === "addNode" && operation.node)
    .map((operation) => ({ ...clone(operation.node), __agentPreview: true, __patchOpId: operation.id }));
  const previewNodeIds = new Set([...baseNodeIds, ...addNodes.map((node) => node.id)]);
  const addEdges = pending
    .filter((operation) => kindOf(operation) === "addEdge" && operation.edge && previewNodeIds.has(operation.edge.from) && previewNodeIds.has(operation.edge.to))
    .map((operation) => ({ ...clone(operation.edge), __agentPreview: true, __patchOpId: operation.id }));
  return { ...doc, nodes: [...(doc.nodes || []), ...addNodes], edges: [...(doc.edges || []), ...addEdges] };
}

export function updateAgentPatchOperation(patch, operationId, updater) {
  if (!patch) return patch;
  return {
    ...patch,
    operations: patch.operations.map((operation) => {
      if (operation.id !== operationId || operation.status !== "pending") return operation;
      const next = typeof updater === "function" ? updater(clone(operation)) : { ...clone(operation), ...updater };
      return { ...operation, ...next, id: operation.id, status: operation.status };
    }),
  };
}

export function rejectAgentPatchOperations(patch, operationIds) {
  if (!patch) return patch;
  const ids = new Set(operationIds);
  const rejectedNodeIds = new Set();
  for (const operation of patch.operations || []) if (ids.has(operation.id) && kindOf(operation) === "addNode" && operation.node?.id) rejectedNodeIds.add(operation.node.id);
  return {
    ...patch,
    operations: (patch.operations || []).map((operation) => {
      const blocked = kindOf(operation) === "addEdge" && (rejectedNodeIds.has(operation.edge?.from) || rejectedNodeIds.has(operation.edge?.to));
      return ids.has(operation.id) || blocked ? { ...operation, status: "rejected" } : operation;
    }),
  };
}

export function applyAgentPatchOperations(doc, patch, operationIds) {
  if (!patch) return { doc, appliedIds: [] };
  const requested = new Set(operationIds);
  const include = new Set(requested);
  const pendingNodeOperations = new Map();
  for (const operation of patch.operations || []) {
    if (operation.status === "pending" && kindOf(operation) === "addNode" && operation.node?.id) pendingNodeOperations.set(operation.node.id, operation);
  }
  for (const operation of patch.operations || []) {
    if (!include.has(operation.id) || operation.status !== "pending" || kindOf(operation) !== "addEdge") continue;
    for (const endpoint of [operation.edge?.from, operation.edge?.to]) {
      const dependency = pendingNodeOperations.get(endpoint);
      if (dependency) include.add(dependency.id);
    }
  }
  const selected = (patch.operations || [])
    .filter((operation) => include.has(operation.id) && operation.status === "pending")
    .map((operation) => {
      const adapted = adaptLegacyOperation(operation).operation;
      if (adapted.node) {
        delete adapted.node.__agentPreview;
        delete adapted.node.__patchOpId;
      }
      if (adapted.edge) {
        delete adapted.edge.__agentPreview;
        delete adapted.edge.__patchOpId;
      }
      return adapted;
    });
  const applied = applyOperations(doc, selected, { validateResult: false });
  return applied.ok ? { doc: applied.doc, appliedIds: applied.appliedOperationIds } : { doc, appliedIds: [], errors: applied.errors };
}

export function markAgentPatchOperations(patch, operationIds, status) {
  if (!patch) return patch;
  const ids = new Set(operationIds);
  return { ...patch, operations: (patch.operations || []).map((operation) => ids.has(operation.id) ? { ...operation, status } : operation) };
}
