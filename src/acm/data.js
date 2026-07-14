// data.js — ACM controlled vocabulary, visual tokens, sample graph, pure helpers.
import dagre from "@dagrejs/dagre";
import {
  NODE_TYPES,
  NODE_STATUSES,
  RELATION_TYPES,
  PRIORITIES,
  TYPE_PREFIX,
  nextId,
  agentPatchStats as coreAgentPatchStats,
  createMockAgentPatch as coreCreateMockAgentPatch,
  previewAgentPatchDoc as corePreviewAgentPatchDoc,
  updateAgentPatchOperation as coreUpdateAgentPatchOperation,
  rejectAgentPatchOperations as coreRejectAgentPatchOperations,
  applyAgentPatchOperations as coreApplyAgentPatchOperations,
  markAgentPatchOperations as coreMarkAgentPatchOperations,
  validateDoc as coreValidateDoc,
  diffDoc as coreDiffDoc,
  diffCount as coreDiffCount,
  buildChangeSet as coreBuildChangeSet,
  toExportDoc as coreToExportDoc,
  toYaml as coreToYaml,
  toAcmMd as coreToAcmMd,
  parseAcmMdPreview,
} from "../../packages/acm-core/src/index.js";
// Ported from the design prototype (data.jsx); window globals → ES exports.

// ---- Controlled vocabulary (ACM-MD v0.1 §7/§8/§10) ----
export { NODE_TYPES, NODE_STATUSES, RELATION_TYPES, PRIORITIES, TYPE_PREFIX, nextId };

export const NODE_TYPE_META = {
  Goal:       { label: "目标",     hue: 250, c: "#6366f1", glyph: "◎" },
  Module:     { label: "模块",     hue: 217, c: "#2563eb", glyph: "▤" },
  Feature:    { label: "功能",     hue: 160, c: "#0d9488", glyph: "◆" },
  Page:       { label: "页面",     hue: 190, c: "#0891b2", glyph: "▭" },
  DataEntity: { label: "数据对象", hue: 38,  c: "#d97706", glyph: "⛁" },
  API:        { label: "接口",     hue: 24,  c: "#ea580c", glyph: "⇄" },
  Constraint: { label: "约束",     hue: 215, c: "#475569", glyph: "▣" },
  Risk:       { label: "风险",     hue: 350, c: "#e11d48", glyph: "△" },
  Assumption: { label: "假设",     hue: 28,  c: "#92775a", glyph: "≈" },
  Question:   { label: "问题",     hue: 280, c: "#9333ea", glyph: "?" },
  Decision:   { label: "决策",     hue: 150, c: "#16a34a", glyph: "✓" },
  Task:       { label: "任务",     hue: 205, c: "#0284c7", glyph: "☑" },
};

export const STATUS_META = {
  confirmed:        { label: "已确认",  c: "#16a34a", dot: "#16a34a" },
  suggested:        { label: "建议",    c: "#d97706", dot: "#f59e0b" },
  needs_validation: { label: "待验证",  c: "#9333ea", dot: "#a855f7" },
  deprecated:       { label: "已弃用",  c: "#94a3b8", dot: "#cbd5e1" },
};

export const RELATION_META = {
  contains:        { label: "包含",   c: "#94a3b8" },
  depends_on:      { label: "依赖",   c: "#2563eb" },
  impacts:         { label: "影响",   c: "#e11d48" },
  conflicts_with:  { label: "冲突",   c: "#dc2626" },
  requires:        { label: "需要",   c: "#7c3aed" },
  replaces:        { label: "替代",   c: "#0891b2" },
  references:      { label: "引用",   c: "#d97706" },
  constrains:      { label: "约束",   c: "#475569" },
  answers:         { label: "回答",   c: "#16a34a" },
  needs_validation:{ label: "待验证", c: "#9333ea" },
};

// ---- Domain Profiles / Templates (plan §6.5, §8.7) ----
// Profiles only remap UI DISPLAY NAMES over the same stable ACM-MD NodeType
// vocabulary. They never touch underlying types, ids, edges or Agent Diff.
export const DOMAIN_PROFILES = [
  { id: "generic",  label: "通用逻辑",   glyph: "◇", desc: "任何带逻辑关联的任务或思考" },
  { id: "software", label: "软件开发",   glyph: "▤", desc: "产品 / 模块 / 功能 / 任务" },
  { id: "research", label: "研究分析",   glyph: "◎", desc: "目标 / 维度 / 论点 / 证据" },
  { id: "writing",  label: "写作策划",   glyph: "✎", desc: "篇章 / 论点 / 素材 / 待写" },
  { id: "bid",      label: "投标准备",   glyph: "▣", desc: "标段 / 响应 / 资质 / 风险" },
  { id: "decision", label: "个人决策",   glyph: "⚖", desc: "选项 / 理由 / 风险 / 决定" },
];
export const DOMAIN_PROFILE_META = Object.fromEntries(DOMAIN_PROFILES.map((p) => [p.id, p]));

// per-profile display name for each canonical NodeType
export const PROFILE_LABELS = {
  generic:  { Goal: "目标", Module: "主题", Feature: "要点", Page: "视角", DataEntity: "资料", API: "交接点", Constraint: "约束", Risk: "风险", Assumption: "假设", Question: "问题", Decision: "决策", Task: "下一步" },
  software: { Goal: "产品目标", Module: "模块", Feature: "功能", Page: "页面", DataEntity: "数据对象", API: "接口", Constraint: "规则/验收", Risk: "技术风险", Assumption: "前提假设", Question: "待澄清问题", Decision: "技术取舍", Task: "开发任务" },
  research: { Goal: "研究目标", Module: "分析维度", Feature: "发现/论点", Page: "观察视角", DataEntity: "证据/资料", API: "外部来源", Constraint: "边界条件", Risk: "不确定性", Assumption: "研究假设", Question: "待验证问题", Decision: "判断/结论", Task: "研究任务" },
  writing:  { Goal: "写作目标", Module: "篇章/板块", Feature: "论点/段落", Page: "场景", DataEntity: "素材", API: "引用来源", Constraint: "体例/字数", Risk: "风险点", Assumption: "预设", Question: "待定问题", Decision: "取舍", Task: "待写" },
  bid:      { Goal: "投标目标", Module: "标段/章节", Feature: "响应要点", Page: "场景", DataEntity: "资质/材料", API: "评分/依赖", Constraint: "招标要求", Risk: "废标风险", Assumption: "前提假设", Question: "待澄清条款", Decision: "策略决策", Task: "待办" },
  decision: { Goal: "想要的结果", Module: "考量维度", Feature: "选项/理由", Page: "情境", DataEntity: "事实/信息", API: "外部因素", Constraint: "限制条件", Risk: "风险", Assumption: "假设", Question: "待想清楚", Decision: "决定", Task: "下一步" },
};

// Active profile is local UI state (NOT written into exported ACM-MD v0.1).
// Set synchronously at the top of <App> render so all children read it.
let ACTIVE_PROFILE = "software";
export function setActiveProfile(id) { if (PROFILE_LABELS[id]) ACTIVE_PROFILE = id; }
export function typeLabel(type) {
  const m = PROFILE_LABELS[ACTIVE_PROFILE];
  return (m && m[type]) || (NODE_TYPE_META[type] && NODE_TYPE_META[type].label) || type;
}

// ---- Relation inference rules (ACM-MD v0.1 §11, plan §6.5) ----
// key: "FromType>ToType" -> { auto?: relation, candidates: [relation,...] }
const INFERENCE = {
  "Goal>Module":      { auto: "contains", candidates: ["contains"] },
  "Goal>Task":        { auto: "contains", candidates: ["contains"] },
  "Goal>Feature":     { auto: "contains", candidates: ["contains"] },
  "Module>Feature":   { auto: "contains", candidates: ["contains"] },
  "Module>Page":      { auto: "contains", candidates: ["contains"] },
  "Module>Module":    { candidates: ["depends_on", "contains"] },
  "Feature>API":      { auto: "depends_on", candidates: ["depends_on"] },
  "Feature>DataEntity":{ auto: "references", candidates: ["references"] },
  "Feature>Page":     { auto: "references", candidates: ["references"] },
  "Feature>Feature":  { candidates: ["depends_on", "impacts", "conflicts_with"] },
  "Constraint>Feature":{ auto: "constrains", candidates: ["constrains"] },
  "Constraint>Module":{ auto: "constrains", candidates: ["constrains"] },
  "Risk>Feature":     { auto: "impacts", candidates: ["impacts"] },
  "Risk>Module":      { auto: "impacts", candidates: ["impacts"] },
  "Decision>Question":{ auto: "answers", candidates: ["answers"] },
  "Decision>Feature": { candidates: ["impacts", "replaces"] },
};

export function inferRelation(fromType, toType) {
  // Question -> anything = needs_validation
  if (fromType === "Question") return { auto: "needs_validation", candidates: ["needs_validation"] };
  const rule = INFERENCE[`${fromType}>${toType}`];
  if (rule) return rule;
  return { candidates: RELATION_TYPES.slice() }; // fallback: let user pick
}

// ---- Sample graph: the ACM tool's OWN requirements (self-referential) ----
export function sampleDoc() {
  const N = (id, type, title, x, y, extra = {}) => ({
    id, type, title, status: "confirmed",
    description: "", priority: "", source: "task-decomposer",
    confidence: 0.9, tags: [], notes: "", x, y, ...extra,
  });
  const E = (id, from, to, type, extra = {}) => ({
    id, from, to, type, status: "confirmed",
    reason: "", source: "inference", confidence: 0.9, ...extra,
  });

  const nodes = [
    N("goal_001", "Goal", "闭环可用的需求图谱工具", 40, 380, {
      priority: "P0", confidence: 0.96,
      description: "把对话式任务拆解结果，转成可视化、可编辑、可校验、可交给 Agent 继续执行的结构化需求图谱。",
      tags: ["闭环", "MVP"],
    }),
    N("module_001", "Module", "Parser 解析器", 360, 70, { description: "读取 Markdown，提取 acm 代码块并转为 GraphDocument。", confidence: 0.93 }),
    N("module_002", "Module", "Schema 校验", 360, 250, { description: "受控词表与协议合法性校验，以 ACM-MD v0.1 为唯一来源。", confidence: 0.94 }),
    N("module_003", "Module", "Canvas 画布", 360, 430, { description: "节点渲染、拖拽、连线、缩放、平移、布局兜底。", confidence: 0.92 }),
    N("module_004", "Module", "Diff 引擎", 360, 610, { description: "对比原始快照与当前图谱，生成字段级 before/after。", confidence: 0.9 }),
    N("module_005", "Module", "Export 导出", 360, 790, { description: "导出完整 ACM-MD / Agent Diff / JSON / Mermaid。", confidence: 0.9 }),

    N("feature_001", "Feature", "ACM-MD 导入", 700, 40, { priority: "P0", description: "定位主 acm 代码块，解析 YAML，保留 validation 透传。", confidence: 0.91 }),
    N("feature_002", "Feature", "协议校验", 700, 230, { priority: "P0", description: "Error / Warning 分级；id 唯一、悬空边、confidence 范围。", confidence: 0.9 }),
    N("feature_003", "Feature", "节点拖拽", 700, 410, { priority: "P1", description: "拖动节点改变位置并写回 layout。", confidence: 0.9 }),
    N("feature_004", "Feature", "关系连线推断", 700, 540, { priority: "P1", description: "拖线后本地推断候选关系，低歧义自动落为 suggested。", confidence: 0.85, status: "suggested" }),
    N("feature_005", "Feature", "字段级 Diff", 700, 690, { priority: "P2", description: "每字段一条 before/after，便于 Agent 精确理解。", confidence: 0.88 }),
    N("feature_006", "Feature", "Agent Diff 导出", 700, 820, { priority: "P2", description: "ChangeSet + 确定性模板生成的 summary / instructions。", confidence: 0.87 }),

    N("api_001", "API", "Tauri FS API", 1040, 40, { description: "本地文件读写。", confidence: 0.86 }),
    N("data_001", "DataEntity", "GraphDocument", 1040, 180, { description: "schema_version / doc_id / meta / nodes / edges / layout。", confidence: 0.92 }),
    N("constraint_001", "Constraint", "ACM-MD v0.1 协议", 1040, 320, { priority: "P0", description: "唯一数据契约来源；受控词表不得偏离规范。", confidence: 0.97 }),
    N("risk_001", "Risk", "协议漂移导致往返不忠实", 1040, 470, { description: "工具内部类型与规范不一致，合法文档被判非法。", confidence: 0.8 }),
    N("question_001", "Question", "大图是否需要虚拟化", 1040, 620, { status: "needs_validation", description: "超过 100 节点 / 200 边时 React Flow 性能是否足够。", confidence: 0.6 }),
    N("task_001", "Task", "P0 对齐协议与解析器", 1040, 760, { priority: "P0", description: "完成解析、校验、最小渲染与 layout 兜底。", confidence: 0.9 }),
  ];

  const edges = [
    E("edge_001", "goal_001", "module_001", "contains"),
    E("edge_002", "goal_001", "module_002", "contains"),
    E("edge_003", "goal_001", "module_003", "contains"),
    E("edge_004", "goal_001", "module_004", "contains"),
    E("edge_005", "goal_001", "module_005", "contains"),
    E("edge_006", "module_001", "feature_001", "contains"),
    E("edge_007", "module_002", "feature_002", "contains"),
    E("edge_008", "module_003", "feature_003", "contains"),
    E("edge_009", "module_003", "feature_004", "contains"),
    E("edge_010", "module_004", "feature_005", "contains"),
    E("edge_011", "module_005", "feature_006", "contains"),
    E("edge_012", "feature_001", "api_001", "depends_on"),
    E("edge_013", "feature_001", "data_001", "references"),
    E("edge_014", "constraint_001", "module_002", "constrains"),
    E("edge_015", "constraint_001", "feature_002", "constrains", { status: "suggested", confidence: 0.78 }),
    E("edge_016", "risk_001", "feature_002", "impacts"),
    E("edge_017", "question_001", "module_003", "needs_validation", { status: "needs_validation", confidence: 0.6 }),
    E("edge_018", "feature_006", "feature_005", "depends_on", { status: "suggested", confidence: 0.82 }),
    E("edge_019", "goal_001", "task_001", "contains"),
  ];

  return {
    schema_version: "acm-md/0.1",
    doc_id: "acm_20260603_001",
    meta: {
      title: "Agent Context Map 工具自描述图谱",
      created_by: "task-decomposer",
      created_at: "2026-06-03T09:00:00Z",
      updated_at: "2026-06-03T09:00:00Z",
      purpose: "演示 ACM 编辑器：导入 → 编辑 → 导出 Agent Diff 的闭环",
      source: "01-Agent-Context-Map-工具开发Plan.md",
    },
    nodes,
    edges,
    // validation: opaque passthrough field (must survive round-trip)
    validation: { profile: "strict", note: "tool passthrough — not interpreted" },
  };
}

// ---- Agent co-edit pending patch (PURE VIEW STATE; never exported until applied) ----
export function agentPatchStats(patch, status = "pending") {
  return coreAgentPatchStats(patch, status);
}

export function createMockAgentPatch(doc, baseNodeId, prompt = "") {
  const patch = coreCreateMockAgentPatch(doc, baseNodeId, prompt);
  return {
    ...patch,
    operations: patch.operations.map(({ op, fields, ...operation }) => ({
      ...operation,
      op: op === "addNode" ? "add_node" : op === "addEdge" ? "add_edge" : "update_node",
      ...(fields ? { patch: fields } : {}),
    })),
  };
}

export function previewAgentPatchDoc(doc, patch) {
  return corePreviewAgentPatchDoc(doc, patch);
}

export function updateAgentPatchOperation(patch, opId, updater) {
  return coreUpdateAgentPatchOperation(patch, opId, updater);
}

export function rejectAgentPatchOperations(patch, operationIds) {
  return coreRejectAgentPatchOperations(patch, operationIds);
}

export function applyAgentPatchOperations(doc, patch, operationIds) {
  return coreApplyAgentPatchOperations(doc, patch, operationIds);
}

export function markAgentPatchOperations(patch, operationIds, status) {
  return coreMarkAgentPatchOperations(patch, operationIds, status);
}

// ---- Validation (plan §4.1 H, §10) ----
export function validateDoc(doc) {
  return coreValidateDoc(doc, { mode: "tolerant" });
}

// ---- Diff (plan §6.6) ----
export function diffDoc(base, cur) {
  return coreDiffDoc(base, cur);
}

export function diffCount(d) {
  return coreDiffCount(d);
}

// Deterministic summary + agent_instructions (plan §6.6, no AI)
export function buildChangeSet(base, cur, d) {
  return coreBuildChangeSet(base, cur, d, {
    typeName: typeLabel,
    relationName: (type) => RELATION_META[type]?.label || type,
  });
}

// ---- Export serializers ----

export function toExportDoc(doc, changeSet) {
  return coreToExportDoc(doc, changeSet);
}

export function toYaml(obj, indent = 0) {
  return coreToYaml(obj, indent);
}

export function toAcmMd(doc, changeSet) {
  return coreToAcmMd(doc, changeSet);
}

export function toMermaid(doc) {
  const lines = ["graph LR"];
  const safe = (id) => id.replace(/[^a-zA-Z0-9_]/g, "_");
  for (const n of doc.nodes) lines.push(`  ${safe(n.id)}["${typeLabel(n.type)}: ${n.title}"]`);
  for (const e of doc.edges) lines.push(`  ${safe(e.from)} -- ${RELATION_META[e.type]?.label || e.type} --> ${safe(e.to)}`);
  return lines.join("\n");
}

// ---- Auto-layout via dagre (layered directed-graph layout) ----
// ACM graphs are layered DAGs (Goal → Modules → Features) with cross relations
// (depends_on / impacts / replaces …). dagre's Sugiyama layout assigns ranks and
// minimizes edge crossings across ALL relations — the job a hand-rolled grid can't
// do. We feed approximate node sizes and read back top-left corners for the canvas.
// `rankdir` "LR" puts roots on the left and flows rightward (a mind-map feel).
// Returns { [nodeId]: { x, y } }. Used by both ACM-MD import and the toolbar button.
const NODE_W = 210, NODE_H = 104;   // fallback card size; real height is estimated per node below

// Estimate a card's rendered size from its content so dagre reserves the right
// vertical space. Inner card width is fixed at 210 (AcmNode in FlowCanvas); height
// grows with the title's wrapped line count plus the optional priority/confidence
// row. Without this, dagre assumes every node is 104px tall and adjacent ranks
// overlap once titles wrap. Pure function of the node — no DOM, no async.
function estimateNodeSize(n) {
  const W = 210;
  const titleLen = (n?.title || "").length;
  const titleLines = Math.min(3, Math.max(1, Math.ceil(titleLen / 13))); // ~13 全角字/行 近似
  const hasMetaRow = !!(n?.priority || n?.confidence != null);
  const H = 20 /*padding*/ + 22 /*type pill*/ + titleLines * 19 /*title*/ + (hasMetaRow ? 26 : 0) /*meta row*/ + 14 /*buffer*/;
  return { width: W, height: H };
}

export function layoutGraph(doc, opts = {}) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  if (!nodes.length) return {};
  try {
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({
      rankdir: opts.rankdir || "LR",
      // layer / sibling gaps grow with graph size so dense graphs breathe instead
      // of clumping; small graphs keep the original tight spacing
      ranksep: opts.ranksep ?? (nodes.length > 60 ? 160 : nodes.length > 30 ? 140 : 120),
      nodesep: opts.nodesep ?? (nodes.length > 60 ? 64 : nodes.length > 30 ? 52 : 40),
      edgesep: 24,
      marginx: 60, marginy: 60,
      ranker: "network-simplex",
    });
    g.setDefaultEdgeLabel(() => ({}));
    const idSet = new Set(nodes.map((n) => n.id));
    for (const n of nodes) g.setNode(n.id, estimateNodeSize(n));
    for (const e of edges) {
      if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to) continue;
      g.setEdge(e.from, e.to, {}, e.id);   // edge id as name → tolerates parallel edges
    }
    dagre.layout(g);
    const pos = {};
    for (const n of nodes) {
      const gn = g.node(n.id);
      // dagre returns the node CENTER; the canvas positions by the TOP-LEFT corner.
      // Offset by each node's OWN reserved size (dagre preserves what we set above)
      // so a tall card isn't shifted by the wrong half-height.
      if (gn && isFinite(gn.x) && isFinite(gn.y)) pos[n.id] = { x: Math.round(gn.x - gn.width / 2), y: Math.round(gn.y - gn.height / 2) };
    }
    // any fully-isolated node dagre dropped → tuck into a grid below the graph
    let maxY = 0; for (const p of Object.values(pos)) maxY = Math.max(maxY, p.y);
    let gx = 0;
    for (const n of nodes) if (!pos[n.id]) { pos[n.id] = { x: 60 + gx * (NODE_W + 40), y: maxY + NODE_H + 80 }; gx++; }
    return pos;
  } catch (err) {
    // Never let a layout failure break import / auto-layout — fall back to a grid.
    console.warn("[acm] dagre layout failed, using grid fallback", err);
    const pos = {}, cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    nodes.forEach((n, i) => { pos[n.id] = { x: 60 + (i % cols) * (NODE_W + 60), y: 40 + Math.floor(i / cols) * (NODE_H + 60) }; });
    return pos;
  }
}

// ---- Auto-layout via elkjs (orthogonal-routed layered layout) ----
// ELK ("Eclipse Layout Kernel") is an industrial layered-layout engine. Versus dagre
// it adds ORTHOGONAL edge routing (right-angle bends that avoid nodes) and — later in
// 阶段 D — true nested/container layout. Same job as layoutGraph (assign {x,y} per
// node) but ASYNC: elk.layout() returns a Promise, so applyLayout must await it and
// show a loading state. Reuses estimateNodeSize so card sizing matches dagre exactly.
//
// Returns { pos, routes, containers }:
//   pos        — { [id]: {x,y} } LEAF-node TOP-LEFT corners in ABSOLUTE canvas coords
//                (ELK reports top-left, not center; for grouped members we add the
//                container origin so the doc keeps storing ABSOLUTE coords as always).
//   routes     — { [edgeId]: [{x,y}…] } per-edge orthogonal polyline (start + bendPoints
//                + end) in ABSOLUTE coords, consumed by C-3's custom elkEdge.
//   containers — { [groupId]: {x,y,width,height,label,count,type} } titled frames for
//                阶段 D (empty {} in flat mode). Absolute coords; PURE view state.
// Grouping (阶段 D) is opt-in via opts.groupOf ({nodeId:groupId}) + opts.groups (labels):
// each group becomes a nested ELK subgraph, ELK lays out members WITHIN each frame and
// frames against each other (hierarchyHandling INCLUDE_CHILDREN routes cross-group edges
// orthogonally). A recursive walk flattens ELK's relative coords back to absolute, so
// containers/groups never touch doc/layout/export — the ACM-MD contract is untouched.
// elkjs (~1.4 MB) is DYNAMICALLY imported on first ELK layout, so the default dagre
// path never downloads or instantiates it — ELK is fully opt-in, code-split into its
// own chunk by Vite. The module + instance are cached after the first call.
let _elkMod = null, _elk = null;
async function getElk() {
  if (!_elk) {
    _elkMod = _elkMod || (await import("elkjs/lib/elk.bundled.js"));
    _elk = new _elkMod.default();
  }
  return _elk;
}

export async function layoutGraphElk(doc, opts = {}) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  if (!nodes.length) return { pos: {}, routes: {}, containers: {} };
  const dir = (opts.rankdir || "LR") === "TB" ? "DOWN" : "RIGHT";
  const idSet = new Set(nodes.map((n) => n.id));
  // spacing scales with graph size, mirroring layoutGraph's adaptive gaps so the
  // dagre↔ELK toggle keeps a consistent density.
  const big = nodes.length > 60, mid = nodes.length > 30;
  const sizeOf = (n) => ({ id: n.id, ...estimateNodeSize(n) }); // reuse B 的尺寸估算
  const validEdges = edges.filter((e) => e && idSet.has(e.from) && idSet.has(e.to) && e.from !== e.to);
  const groupOf = opts.groupOf && Object.keys(opts.groupOf).length ? opts.groupOf : null;
  const groupMeta = {}; for (const gm of opts.groups || []) groupMeta[gm.id] = gm;
  const groupIds = new Set(groupOf ? Object.values(groupOf) : []);
  // D-4: a collapsed group lays out as a small header-only box; its members are dropped
  // from the layout (and their edges skipped), so re-layout compacts collapsed frames
  // instead of reserving full space — the same "hidden nodes don't reserve space" rule A
  // applies to folded subtrees.
  const collapsedG = opts.collapsedGroups instanceof Set ? opts.collapsedGroups : new Set();
  const memberHidden = (id) => { const gg = groupOf && groupOf[id]; return !!(gg && collapsedG.has(gg)); };

  let g;
  if (groupOf) {
    // --- NESTED: one ELK subgraph per group; ungrouped nodes stay at root ---
    const groupsMap = new Map(); const rootChildren = [];
    for (const n of nodes) {
      const gid = groupOf[n.id];
      if (!gid) { rootChildren.push(sizeOf(n)); continue; }
      if (collapsedG.has(gid)) {                       // collapsed → header-only leaf, no members
        if (!groupsMap.has(gid)) groupsMap.set(gid, { id: gid, width: 230, height: 40 });
        continue;
      }
      if (!groupsMap.has(gid)) groupsMap.set(gid, {
        id: gid, children: [], edges: [],
        layoutOptions: {
          "elk.algorithm": "layered", "elk.direction": dir,
          "elk.padding": "[top=40,left=16,bottom=16,right=16]", // top band reserved for our title
          "elk.spacing.nodeNode": String(mid ? 40 : 32),
          "elk.layered.spacing.nodeNodeBetweenLayers": String(mid ? 96 : 76),
        },
      });
      groupsMap.get(gid).children.push(sizeOf(n));
    }
    const rootEdges = [];
    for (const e of validEdges) {
      if (memberHidden(e.from) || memberHidden(e.to)) continue; // edge to a collapsed member → drop
      const ge = { id: e.id, sources: [e.from], targets: [e.to] };
      const ga = groupOf[e.from], gb = groupOf[e.to];
      if (ga && ga === gb) groupsMap.get(ga).edges.push(ge); // intra-group → inside the frame
      else rootEdges.push(ge);                                // cross-group / ungrouped → root
    }
    g = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered", "elk.direction": dir,
        "elk.edgeRouting": "ORTHOGONAL", "elk.hierarchyHandling": "INCLUDE_CHILDREN",
        "elk.layered.spacing.nodeNodeBetweenLayers": String(big ? 180 : 150),
        "elk.spacing.nodeNode": String(big ? 80 : 64),
        "elk.spacing.componentComponent": "64",
      },
      children: [...groupsMap.values(), ...rootChildren],
      edges: rootEdges,
    };
  } else {
    // --- FLAT: every node at root (阶段 C) ---
    g = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered", "elk.direction": dir, "elk.edgeRouting": "ORTHOGONAL",
        "elk.layered.spacing.nodeNodeBetweenLayers": String(big ? 160 : mid ? 140 : 120),
        "elk.spacing.nodeNode": String(big ? 64 : mid ? 52 : 44),
        "elk.spacing.edgeNode": "24",
        "elk.layered.crossingMinimization.semiInteractive": "true",
      },
      children: nodes.map(sizeOf),
      edges: validEdges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
    };
  }

  let res;
  try {
    const elk = await getElk();
    res = await elk.layout(g);
  } catch (err) {
    // Never let an ELK failure strand the canvas — fall back to the sync dagre layout.
    console.warn("[acm] elk layout failed, falling back to dagre", err);
    return { pos: layoutGraph(doc, opts), routes: {}, containers: {} };
  }

  // Recursively flatten ELK's (parent-relative) coords to absolute. A node WITH children
  // is a group frame → record its box & recurse; a leaf → record its absolute corner.
  // Each container's `edges` are relative to that container's origin (the walk's offset),
  // so cross- and intra-group routes both come out absolute regardless of where ELK
  // placed them under INCLUDE_CHILDREN.
  const pos = {}, routes = {}, containers = {};
  const walk = (node, ox, oy) => {
    for (const c of node.children || []) {
      const ax = ox + (c.x || 0), ay = oy + (c.y || 0);
      if (groupIds.has(c.id)) {
        const gm = groupMeta[c.id] || {};
        containers[c.id] = {
          x: Math.round(ax), y: Math.round(ay),
          width: Math.round(c.width || 0), height: Math.round(c.height || 0),
          label: gm.label || c.id, count: gm.count || (c.children ? c.children.length : 0), type: gm.type,
        };
        walk(c, ax, ay);
      } else if (isFinite(ax) && isFinite(ay)) {
        pos[c.id] = { x: Math.round(ax), y: Math.round(ay) };
      }
    }
    for (const e of node.edges || []) {
      const sec = (e.sections || [])[0];
      if (!sec) continue;
      const pts = [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint]
        .filter((p) => p && isFinite(p.x) && isFinite(p.y))
        .map((p) => ({ x: Math.round(ox + p.x), y: Math.round(oy + p.y) }));
      if (pts.length >= 2) routes[e.id] = pts;
    }
  };
  walk(res, 0, 0);
  // anything ELK genuinely dropped → tuck into a grid below (parity with dagre's
  // isolated-node net). Members of a COLLAPSED group are intentionally absent from the
  // ELK input, so skip them here — otherwise they'd be reassigned garbage grid coords
  // (committed to the doc) and lose their real position until the group re-expands.
  let maxY = 0; for (const p of Object.values(pos)) maxY = Math.max(maxY, p.y);
  let gx = 0;
  for (const n of nodes) if (!pos[n.id] && !groupIds.has(n.id) && !memberHidden(n.id)) { pos[n.id] = { x: 60 + gx * (NODE_W + 40), y: maxY + NODE_H + 120 }; gx++; }
  return { pos, routes, containers };
}

// ---- Collapse / expand subtrees (PURE VIEW STATE — never written into ACM-MD) ----
// `collapsed` is a Set<nodeId> of nodes whose `contains` subtree is folded away. It
// lives at the same level as the active profile / viewport: derived UI state that is
// never part of `doc`, `layout`, or any export format. These helpers walk ONLY the
// `contains` forest (Goal → Module → Feature) — the layout backbone — never the
// cross relations (depends_on / impacts / references …).

// parentId -> [childId] over `contains` edges (skips dangling ends & self-loops).
export function containsChildren(doc) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  const ids = new Set(nodes.map((n) => n.id));
  const children = new Map();
  for (const e of edges) {
    if (!e || e.type !== "contains") continue;
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue;
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from).push(e.to);
  }
  return children;
}

// From the collapsed set, derive which nodes are hidden and how many descendants
// hide under each collapsed node (for the "▸ N" badge). v1 rule: a node hides if
// ANY of its contains-ancestors is collapsed — simple and predictable; multi-parent
// nodes hide if any containing path is folded (a documented simplification).
export function computeHidden(doc, collapsed) {
  const children = containsChildren(doc);
  const collapsedSet = collapsed instanceof Set ? collapsed : new Set(collapsed || []);
  const hidden = new Set();
  const descCount = new Map();
  for (const root of collapsedSet) {
    // Seed `seen` with the root so a contains-cycle (a→…→a) can never hide the
    // collapsed root itself (which would make its expand button vanish) or count it.
    const seen = new Set([root]);
    let count = 0;
    const queue = [...(children.get(root) || [])];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      hidden.add(id);
      count++;
      for (const c of children.get(id) || []) if (!seen.has(c)) queue.push(c);
    }
    descCount.set(root, count);
  }
  return { hidden, descCount };
}

// Returns the set of nodes to FOLD so only contains-depth ≤ `depth` stays visible.
// Every node at depth ≥ `depth` that has children is added to the collapsed set — the
// node itself stays visible, only its deeper subtree folds away. So
// collapseToDepth(doc, 1) keeps roots + their direct children and folds everything
// below; expanding one node then reveals exactly the next level. Roots are the
// contains-orphans (no incoming `contains` edge).
export function collapseToDepth(doc, depth = 1) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const children = containsChildren(doc);
  const childIds = new Set();
  for (const kids of children.values()) for (const k of kids) childIds.add(k);
  const roots = nodes.filter((n) => !childIds.has(n.id)).map((n) => n.id);
  const out = new Set();
  const seen = new Set();
  const queue = roots.map((id) => [id, 0]);
  while (queue.length) {
    const [id, d] = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const kids = children.get(id) || [];
    if (d >= depth && kids.length) out.add(id);
    for (const k of kids) if (!seen.has(k)) queue.push([k, d + 1]);
  }
  return out;
}

// ---- Grouping dimension (PURE VIEW STATE — never written into ACM-MD) ----
// Derive how nodes cluster into titled containers for 阶段 D. Two modes:
//   "type"   — one group per NodeType present (≤12). Deterministic, simplest.
//   "module" — each first-level `contains` child of a contains-root (a Module under a
//              Goal) is a group; every descendant joins its nearest module-ancestor.
//              Contains-roots (Goals) and nodes unreachable from a module stay
//              UNGROUPED (rendered at the top level). Closer to "project structure".
// Returns { groupOf: { [nodeId]: groupId }, groups: [{ id, label, type, count }] }.
// groupId is a synthetic, view-only id ("type:Risk" / "mod:module_003") — it never
// touches doc / layout / export. Multi-parent contains nodes pick their FIRST parent.
export function computeGroupOf(doc, mode) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groupOf = {};
  const order = []; const meta = new Map(); // groupId -> { id, label, type, count }
  const bump = (gid, label, type) => {
    if (!meta.has(gid)) { meta.set(gid, { id: gid, label, type, count: 0 }); order.push(gid); }
    meta.get(gid).count++;
  };
  if (mode === "type") {
    for (const n of nodes) { const gid = "type:" + n.type; groupOf[n.id] = gid; bump(gid, typeLabel(n.type), n.type); }
  } else if (mode === "module") {
    const children = containsChildren(doc);
    const parentOf = new Map(); // first contains-parent of each node
    for (const [p, kids] of children) for (const k of kids) if (!parentOf.has(k)) parentOf.set(k, p);
    const roots = nodes.filter((n) => !parentOf.has(n.id)).map((n) => n.id); // contains-orphans (Goals)
    const rootSet = new Set(roots);
    const moduleSet = new Set();
    for (const r of roots) for (const k of (children.get(r) || [])) moduleSet.add(k); // first level = modules
    // walk up to the nearest module ancestor (cycle-safe)
    const moduleOf = (id) => {
      let cur = id; const seen = new Set();
      while (cur != null && !seen.has(cur)) { seen.add(cur); if (moduleSet.has(cur)) return cur; cur = parentOf.get(cur); }
      return null;
    };
    for (const n of nodes) {
      if (rootSet.has(n.id)) continue;       // Goals sit above modules → ungrouped
      const m = moduleOf(n.id);
      if (m == null) continue;               // unreachable from a module → ungrouped
      const gid = "mod:" + m;
      groupOf[n.id] = gid;
      const mn = byId.get(m);
      bump(gid, mn?.title || "模块", mn?.type);
    }
  }
  return { groupOf, groups: order.map((id) => meta.get(id)) };
}

export function parseAcmMd(text) {
  return parseAcmMdPreview(text, { layoutDocument: layoutGraph });
}
