import {
  NODE_TYPES, NODE_STATUSES, RELATION_TYPES, TYPE_PREFIX,
  nextId, agentPatchStats, createMockAgentPatch, adaptLegacyOperations,
} from "../../packages/acm-core/src/index.js";

const AGY_SOURCE = "agy_sdk";
const FALLBACK_SOURCE = "agent_mock";
const DEFAULT_PROMPT = "我想新增一个批量导入需求文档的功能";

const clone = (o) => JSON.parse(JSON.stringify(o));
const asArray = (v) => Array.isArray(v) ? v : [];
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const clampConfidence = (v, fallback = 0.72) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
};

function normalizeStatus(status, fallback = "suggested") {
  if (status === "confirmed") return "suggested";
  return NODE_STATUSES.includes(status) ? status : fallback;
}

function normalizeNode(raw, usedNodeIds, base, index) {
  const type = NODE_TYPES.includes(raw?.type) ? raw.type : "Feature";
  const id = raw?.id && !usedNodeIds.has(raw.id) ? raw.id : nextId(TYPE_PREFIX[type] || "node", usedNodeIds);
  usedNodeIds.add(id);
  return {
    id,
    type,
    title: String(raw?.title || raw?.label || `Agent 建议 ${index + 1}`),
    status: normalizeStatus(raw?.status),
    description: raw?.description || "",
    priority: raw?.priority || "",
    source: raw?.source || AGY_SOURCE,
    confidence: clampConfidence(raw?.confidence),
    tags: asArray(raw?.tags).length ? raw.tags : ["agent_suggestion"],
    notes: raw?.notes || "",
    x: Number.isFinite(raw?.x) ? Math.round(raw.x) : Math.round((Number.isFinite(base?.x) ? base.x : 120) + 300 + index * 40),
    y: Number.isFinite(raw?.y) ? Math.round(raw.y) : Math.round((Number.isFinite(base?.y) ? base.y : 180) + (index % 3 - 1) * 150),
  };
}

function normalizeEdge(raw, usedEdgeIds) {
  const id = raw?.id && !usedEdgeIds.has(raw.id) ? raw.id : nextId("edge", usedEdgeIds);
  usedEdgeIds.add(id);
  const from = raw?.from || raw?.sourceId || (raw?.to || raw?.target || raw?.targetId ? raw?.source : null);
  const to = raw?.to || raw?.target || raw?.targetId;
  return {
    id,
    from,
    to,
    type: RELATION_TYPES.includes(raw?.type) ? raw.type : "references",
    status: normalizeStatus(raw?.status),
    reason: raw?.reason || "",
    source: raw?.provenance || raw?.agentSource || AGY_SOURCE,
    confidence: clampConfidence(raw?.confidence),
  };
}

function normalizeUpdate(raw) {
  const nodeId = raw?.nodeId || raw?.id || raw?.targetId;
  const fields = isObject(raw?.fields) ? { ...raw.fields } : {};
  if (fields.status) fields.status = normalizeStatus(fields.status);
  return nodeId ? { nodeId, fields } : null;
}

function collectCandidateOperations(raw) {
  const body = raw?.pendingAgentPatch || raw?.agentPatch || raw?.patch || raw;
  const ops = asArray(body?.operations || body?.ops);
  if (ops.length) return { body, ops };

  const generated = [
    ...asArray(body?.nodes || body?.addNodes).map((node) => ({ op: "addNode", node })),
    ...asArray(body?.edges || body?.addEdges).map((edge) => ({ op: "addEdge", edge })),
    ...asArray(body?.updates || body?.updateNodes).map((update) => ({ op: "updateNodeFields", ...update })),
  ];
  return { body, ops: generated };
}

function parseJsonish(raw) {
  if (isObject(raw)) {
    for (const key of ["json", "data", "result", "response", "content", "text"]) {
      const value = raw[key];
      if (isObject(value)) return value;
      if (typeof value === "string") {
        const parsed = parseJsonish(value);
        if (parsed) return parsed;
      }
    }
    return raw;
  }
  if (typeof raw !== "string") return raw;
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try { return JSON.parse(candidate.slice(first, last + 1)); } catch {}
    }
  }
  return raw;
}

export function normalizeAgentPatch(raw, { doc, baseNodeId, prompt }) {
  raw = parseJsonish(raw);
  const { body, ops } = collectCandidateOperations(raw);
  if (!ops.length) throw new Error("agy 返回中没有可用 operations");

  const base = (doc.nodes || []).find((n) => n.id === baseNodeId) || (doc.nodes || [])[0] || { x: 120, y: 180 };
  const usedNodeIds = new Set((doc.nodes || []).map((n) => n.id));
  const usedEdgeIds = new Set((doc.edges || []).map((e) => e.id));
  const availableNodeIds = new Set(usedNodeIds);
  const stamp = Date.now();

  const operations = [];
  for (const rawOp of ops) {
    const opKind = rawOp?.op || rawOp?.type || rawOp?.operation;
    if (opKind === "addNode") {
      const node = normalizeNode(rawOp.node || rawOp.payload || rawOp, usedNodeIds, base, operations.length);
      availableNodeIds.add(node.id);
      operations.push({ id: rawOp.id || `op_${stamp}_${String(operations.length + 1).padStart(2, "0")}`, op: "addNode", status: "pending", node });
    } else if (opKind === "addEdge") {
      const edge = normalizeEdge(rawOp.edge || rawOp.payload || rawOp, usedEdgeIds);
      if (edge.from && edge.to) {
        operations.push({ id: rawOp.id || `op_${stamp}_${String(operations.length + 1).padStart(2, "0")}`, op: "addEdge", status: "pending", edge });
      }
    } else if (opKind === "updateNodeFields") {
      const update = normalizeUpdate(rawOp);
      if (update?.nodeId && availableNodeIds.has(update.nodeId)) {
        operations.push({ id: rawOp.id || `op_${stamp}_${String(operations.length + 1).padStart(2, "0")}`, op: "updateNodeFields", status: "pending", ...update });
      }
    }
  }

  if (!operations.length) throw new Error("agy 返回未能 normalize 成 pendingAgentPatch");
  const stats = agentPatchStats({ operations }, "pending");
  return {
    id: body?.id || body?.patchId || "agent_patch_" + stamp.toString(36),
    createdAt: body?.createdAt || new Date().toISOString(),
    source: AGY_SOURCE,
    prompt: body?.prompt || prompt,
    summary: body?.summary || `agy 建议新增 ${stats.nodes} 个节点和 ${stats.edges} 条关系，其中 ${stats.questions} 处需要人工确认。`,
    baseNodeId: body?.baseNodeId || baseNodeId || null,
    operations,
  };
}

export function createFallbackAgentPatch({ doc, baseNodeId, prompt }, reason) {
  const patch = createMockAgentPatch(doc, baseNodeId, prompt);
  return { ...patch, source: FALLBACK_SOURCE, fallbackReason: reason?.message || String(reason || "agy unavailable") };
}

// Read-only compatibility path for archived fixtures/import diagnostics. Product
// adapters never call this function and never emit legacy snake_case operations.
export function normalizeLegacyAgentPatchForDiagnostics(raw, context) {
  const parsed = parseJsonish(raw);
  const { body, ops } = collectCandidateOperations(parsed);
  const adapted = adaptLegacyOperations(ops);
  const patch = normalizeAgentPatch({ ...body, operations: adapted.operations }, context);
  return { patch, diagnostics: adapted.diagnostics };
}

export async function requestAgentPatch({ doc, baseNodeId, prompt, selection }) {
  const cleanPrompt = (prompt || "").trim() || DEFAULT_PROMPT;
  void selection;
  return createFallbackAgentPatch({ doc: clone(doc), baseNodeId, prompt: cleanPrompt }, "compatibility shim has no host adapter");
}
