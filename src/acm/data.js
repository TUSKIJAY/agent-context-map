// data.js — ACM controlled vocabulary, visual tokens, sample graph, pure helpers.
import { parse as parseYaml } from "yaml";
import dagre from "@dagrejs/dagre";
// Ported from the design prototype (data.jsx); window globals → ES exports.

// ---- Controlled vocabulary (ACM-MD v0.1 §7/§8/§10) ----
export const NODE_TYPES = [
  "Goal", "Module", "Feature", "Page", "DataEntity", "API",
  "Constraint", "Risk", "Assumption", "Question", "Decision", "Task",
];

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

export const NODE_STATUSES = ["confirmed", "suggested", "needs_validation", "deprecated"];
export const STATUS_META = {
  confirmed:        { label: "已确认",  c: "#16a34a", dot: "#16a34a" },
  suggested:        { label: "建议",    c: "#d97706", dot: "#f59e0b" },
  needs_validation: { label: "待验证",  c: "#9333ea", dot: "#a855f7" },
  deprecated:       { label: "已弃用",  c: "#94a3b8", dot: "#cbd5e1" },
};

export const RELATION_TYPES = [
  "contains", "depends_on", "impacts", "conflicts_with", "requires",
  "replaces", "references", "constrains", "answers", "needs_validation",
];
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

export const PRIORITIES = ["P0", "P1", "P2", "P3"];

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
    N("entity_001", "DataEntity", "GraphDocument", 1040, 180, { description: "schema_version / doc_id / meta / nodes / edges / layout。", confidence: 0.92 }),
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
    E("edge_013", "feature_001", "entity_001", "references"),
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

// ---- id generation (plan §7.7) ----
export function nextId(prefix, existing) {
  let max = 0;
  for (const id of existing) {
    const m = new RegExp("^" + prefix + "_(\\d+)$").exec(id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}_${String(max + 1).padStart(3, "0")}`;
}
export const TYPE_PREFIX = {
  Goal: "goal", Module: "module", Feature: "feature", Page: "page",
  DataEntity: "entity", API: "api", Constraint: "constraint", Risk: "risk",
  Assumption: "assumption", Question: "question", Decision: "decision", Task: "task",
};

// ---- Validation (plan §4.1 H, §10) ----
export function validateDoc(doc) {
  const issues = [];
  const err = (msg, ref) => issues.push({ level: "error", msg, ref });
  const warn = (msg, ref) => issues.push({ level: "warning", msg, ref });

  if (!doc.schema_version) err("缺少 schema_version");
  if (!doc.doc_id) err("缺少 doc_id");

  const nodeIds = new Set();
  for (const n of doc.nodes) {
    if (nodeIds.has(n.id)) err(`节点 id 重复：${n.id}`, n.id);
    nodeIds.add(n.id);
    if (!NODE_TYPES.includes(n.type)) err(`非法节点类型：${n.type}`, n.id);
    if (!NODE_STATUSES.includes(n.status)) err(`非法节点状态：${n.status}`, n.id);
    if (!n.title || !n.title.trim()) err(`节点标题为空：${n.id}`, n.id);
    if (n.confidence != null && (n.confidence < 0 || n.confidence > 1)) err(`confidence 超出 0–1：${n.id}`, n.id);
  }

  const edgeIds = new Set();
  for (const e of doc.edges) {
    if (edgeIds.has(e.id)) err(`边 id 重复：${e.id}`, e.id);
    edgeIds.add(e.id);
    if (!RELATION_TYPES.includes(e.type)) err(`非法关系类型：${e.type}`, e.id);
    if (!NODE_STATUSES.includes(e.status)) err(`非法边状态：${e.status}`, e.id);
    if (!nodeIds.has(e.from)) err(`悬空边：${e.id} 的来源 ${e.from} 不存在`, e.id);
    if (!nodeIds.has(e.to)) err(`悬空边：${e.id} 的目标 ${e.to} 不存在`, e.id);
    if (e.confidence != null && (e.confidence < 0 || e.confidence > 1)) err(`confidence 超出 0–1：${e.id}`, e.id);
  }

  // Warning rules
  const outFrom = (id) => doc.edges.filter((e) => e.from === id);
  const anyEdge = (id) => doc.edges.filter((e) => e.from === id || e.to === id);
  const goals = doc.nodes.filter((n) => n.type === "Goal");
  for (const g of goals) if (outFrom(g.id).length === 0) warn(`核心目标无出边：${g.title}`, g.id);
  if (goals.length > 1) {
    const linked = doc.edges.some((e) => goals.find((g) => g.id === e.from) && goals.find((g) => g.id === e.to));
    if (!linked) warn("存在多个 Goal 但未建立关系");
  }
  for (const n of doc.nodes) {
    if (n.type === "Risk" && !outFrom(n.id).some((e) => e.type === "impacts")) warn(`风险无影响对象：${n.title}`, n.id);
    if (n.type === "Question" && anyEdge(n.id).length === 0) warn(`问题无待验证对象：${n.title}`, n.id);
    if (n.type === "Feature") {
      const inModule = doc.edges.some((e) => e.to === n.id && e.type === "contains" && doc.nodes.find((m) => m.id === e.from && m.type === "Module"));
      if (!inModule) warn(`功能无所属模块：${n.title}`, n.id);
    }
    if (n.confidence == null) warn(`节点缺少 confidence：${n.title}`, n.id);
    if (!n.source) warn(`节点缺少 source：${n.title}`, n.id);
  }
  for (const e of doc.edges) if (e.status === "suggested") warn(`存在未确认的 suggested 关系：${RELATION_META[e.type]?.label || e.type}`, e.id);

  return issues;
}

// ---- Diff (plan §6.6) ----
const NODE_FIELDS = ["type", "title", "status", "description", "priority", "source", "confidence", "tags", "notes"];
const EDGE_FIELDS = ["from", "to", "type", "status", "reason", "source", "confidence"];

function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export function diffDoc(base, cur) {
  const baseN = new Map(base.nodes.map((n) => [n.id, n]));
  const curN = new Map(cur.nodes.map((n) => [n.id, n]));
  const baseE = new Map(base.edges.map((e) => [e.id, e]));
  const curE = new Map(cur.edges.map((e) => [e.id, e]));

  const added_nodes = [], removed_nodes = [], modified_nodes = [];
  const added_edges = [], removed_edges = [], modified_edges = [];
  const layout_changes = [];

  for (const [id, n] of curN) {
    if (!baseN.has(id)) { added_nodes.push(n); continue; }
    const b = baseN.get(id);
    for (const f of NODE_FIELDS) if (!eq(b[f], n[f])) modified_nodes.push({ id, field: f, before: b[f], after: n[f] });
    if (b.x !== n.x || b.y !== n.y) layout_changes.push({ id, before: { x: b.x, y: b.y }, after: { x: n.x, y: n.y } });
  }
  for (const [id, n] of baseN) if (!curN.has(id)) removed_nodes.push({ id, title: n.title });

  for (const [id, e] of curE) {
    if (!baseE.has(id)) { added_edges.push(e); continue; }
    const b = baseE.get(id);
    for (const f of EDGE_FIELDS) if (!eq(b[f], e[f])) modified_edges.push({ id, field: f, before: b[f], after: e[f] });
  }
  for (const [id, e] of baseE) if (!curE.has(id)) removed_edges.push({ id, from: e.from, to: e.to, type: e.type });

  return { added_nodes, removed_nodes, modified_nodes, added_edges, removed_edges, modified_edges, layout_changes };
}

export function diffCount(d) {
  return d.added_nodes.length + d.removed_nodes.length + d.modified_nodes.length +
    d.added_edges.length + d.removed_edges.length + d.modified_edges.length;
}

// Deterministic summary + agent_instructions (plan §6.6, no AI)
export function buildChangeSet(base, cur, d) {
  const parts = [];
  if (d.added_nodes.length) parts.push(`新增 ${d.added_nodes.length} 个节点`);
  if (d.removed_nodes.length) parts.push(`删除 ${d.removed_nodes.length} 个节点`);
  if (d.modified_nodes.length) parts.push(`修改 ${d.modified_nodes.length} 处节点字段`);
  if (d.added_edges.length) parts.push(`新增 ${d.added_edges.length} 条关系`);
  if (d.removed_edges.length) parts.push(`删除 ${d.removed_edges.length} 条关系`);
  if (d.modified_edges.length) parts.push(`修改 ${d.modified_edges.length} 处关系字段`);
  const summary = parts.length ? parts.join("，") + "。" : "无结构性变更。";

  const instr = [];
  const nameOf = (id) => (cur.nodes.find((n) => n.id === id) || base.nodes.find((n) => n.id === id) || {}).title || id;
  for (const n of d.added_nodes) instr.push(`处理新增${typeLabel(n.type)}「${n.title}」(${n.id})。`);
  for (const n of d.removed_nodes) instr.push(`移除已删除节点「${n.title}」(${n.id}) 的相关实现。`);
  for (const m of d.modified_nodes) instr.push(`「${nameOf(m.id)}」的 ${m.field}：${JSON.stringify(m.before)} → ${JSON.stringify(m.after)}。`);
  for (const e of d.added_edges) instr.push(`建立关系 ${nameOf(e.from)} —${RELATION_META[e.type]?.label}→ ${nameOf(e.to)}。`);
  for (const e of d.removed_edges) instr.push(`解除关系 ${nameOf(e.from)} → ${nameOf(e.to)}。`);
  for (const m of d.modified_edges) instr.push(`关系 ${m.id} 的 ${m.field}：${JSON.stringify(m.before)} → ${JSON.stringify(m.after)}。`);

  return {
    change_set_id: "changes_" + Date.now().toString(36),
    base_doc_id: base.doc_id,
    summary,
    agent_instructions: instr,
    added_nodes: d.added_nodes,
    modified_nodes: d.modified_nodes,
    removed_nodes: d.removed_nodes,
    added_edges: d.added_edges,
    modified_edges: d.modified_edges,
    removed_edges: d.removed_edges,
    layout_changes: d.layout_changes,
  };
}

// ---- Export serializers ----
function toLayout(doc) {
  const nodes = {};
  for (const n of doc.nodes) nodes[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
  return { engine: "manual", nodes };
}

function cleanNode(n) {
  const o = { id: n.id, type: n.type, title: n.title, status: n.status };
  if (n.description) o.description = n.description;
  if (n.priority) o.priority = n.priority;
  if (n.source) o.source = n.source;
  if (n.confidence != null) o.confidence = n.confidence;
  if (n.tags && n.tags.length) o.tags = n.tags;
  if (n.notes) o.notes = n.notes;
  return o;
}
function cleanEdge(e) {
  const o = { id: e.id, from: e.from, to: e.to, type: e.type, status: e.status };
  if (e.reason) o.reason = e.reason;
  if (e.source) o.source = e.source;
  if (e.confidence != null) o.confidence = e.confidence;
  return o;
}

export function toExportDoc(doc, changeSet) {
  const out = {
    schema_version: doc.schema_version,
    doc_id: doc.doc_id,
    meta: doc.meta,
    nodes: doc.nodes.map(cleanNode),
    edges: doc.edges.map(cleanEdge),
    layout: toLayout(doc),
  };
  if (changeSet && diffCount(changeSet)) out.changes = changeSet;
  if (doc.validation) out.validation = doc.validation; // passthrough preserved
  return out;
}

// Minimal YAML emitter (good enough for the ACM-MD preview)
export function toYaml(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((v) => {
      if (v && typeof v === "object") {
        const body = toYaml(v, indent + 1).replace(new RegExp("^" + pad + "  "), "");
        return `${pad}- ${body.trimStart()}`;
      }
      return `${pad}- ${yamlScalar(v)}`;
    }).join("\n");
  }
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    return keys.map((k) => {
      const v = obj[k];
      if (v && typeof v === "object" && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      if (v && typeof v === "object") return `${pad}${k}: ${Array.isArray(v) ? "[]" : "{}"}`;
      return `${pad}${k}: ${yamlScalar(v)}`;
    }).join("\n");
  }
  return `${pad}${yamlScalar(obj)}`;
}
function yamlScalar(v) {
  if (v == null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  if (s === "" || /[:#\-?\[\]{}&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}

export function toAcmMd(doc, changeSet) {
  const ex = toExportDoc(doc, changeSet);
  return "```acm\n" + toYaml(ex) + "\n```\n";
}

export function toMermaid(doc) {
  const lines = ["graph LR"];
  const safe = (id) => id.replace(/[^a-zA-Z0-9_]/g, "_");
  for (const n of doc.nodes) lines.push(`  ${safe(n.id)}["${typeLabel(n.type)}: ${n.title}"]`);
  for (const e of doc.edges) lines.push(`  ${safe(e.from)} -- ${RELATION_META[e.type]?.label || e.type} --> ${safe(e.to)}`);
  return lines.join("\n");
}

// ---- Hierarchical auto-layout (pure) ----
// The `contains` tree is the backbone (columns = depth); parents are vertically
// centered over their children; annotation nodes (risk / constraint / decision /
// question …) sit one column to the right of what they touch. The graph is first
// split into UNDIRECTED connected components, each laid out independently and
// stacked vertically — so a cluster with no link to the main Goal (e.g. a "砍掉"
// branch) becomes its own small tree instead of collapsing onto column 0.
// Returns { [nodeId]: { x, y } }. Used by both ACM-MD import and the toolbar button.
// ---- Auto-layout via dagre (layered directed-graph layout) ----
// ACM graphs are layered DAGs (Goal → Modules → Features) with cross relations
// (depends_on / impacts / replaces …). dagre's Sugiyama layout assigns ranks and
// minimizes edge crossings across ALL relations — the job a hand-rolled grid can't
// do. We feed approximate node sizes and read back top-left corners for the canvas.
// `rankdir` "LR" puts roots on the left and flows rightward (a mind-map feel).
// Returns { [nodeId]: { x, y } }. Used by both ACM-MD import and the toolbar button.
const NODE_W = 220, NODE_H = 104;   // approx card size; canvas measures the real size at render
export function layoutGraph(doc, opts = {}) {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  if (!nodes.length) return {};
  try {
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({
      rankdir: opts.rankdir || "LR",
      ranksep: opts.ranksep ?? 120,   // gap between depth layers
      nodesep: opts.nodesep ?? 40,    // gap between siblings within a layer
      edgesep: 24,
      marginx: 60, marginy: 60,
      ranker: "network-simplex",
    });
    g.setDefaultEdgeLabel(() => ({}));
    const idSet = new Set(nodes.map((n) => n.id));
    for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
    for (const e of edges) {
      if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to) continue;
      g.setEdge(e.from, e.to, {}, e.id);   // edge id as name → tolerates parallel edges
    }
    dagre.layout(g);
    const pos = {};
    for (const n of nodes) {
      const gn = g.node(n.id);
      // dagre returns the node CENTER; the canvas positions by the TOP-LEFT corner
      if (gn && isFinite(gn.x) && isFinite(gn.y)) pos[n.id] = { x: Math.round(gn.x - NODE_W / 2), y: Math.round(gn.y - NODE_H / 2) };
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

// Legacy hand-rolled layered grid (pre-dagre). Kept as a fallback reference; not used.
function layoutGraphLegacy(doc) {
  const COL_W = 320, ROW_H = 132, X0 = 60, Y0 = 40, COMPONENT_GAP = 96;
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : [];
  const edges = Array.isArray(doc?.edges) ? doc.edges : [];
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const baseY = Object.fromEntries(nodes.map((n) => [n.id, typeof n.y === "number" ? n.y : 0]));

  const kids = {}, cparent = {}, nbr = {};
  ids.forEach((id) => { kids[id] = []; cparent[id] = 0; nbr[id] = []; });
  for (const e of edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
    nbr[e.from].push(e.to); nbr[e.to].push(e.from);
    if (e.type === "contains") { kids[e.from].push(e.to); cparent[e.to]++; }
  }

  // ---- undirected connected components ----
  const comp = {}; let nc = 0;
  for (const id of ids) {
    if (comp[id] != null) continue;
    const stack = [id]; comp[id] = nc;
    while (stack.length) { const u = stack.pop(); for (const v of nbr[u]) if (comp[v] == null) { comp[v] = nc; stack.push(v); } }
    nc++;
  }
  const components = Array.from({ length: nc }, () => []);
  ids.forEach((id) => components[comp[id]].push(id));
  // backbone components (with a contains-root) first, then larger ones, for a stable stack
  const order = components.map((_, i) => i).sort((a, b) => {
    const ra = components[a].some((id) => cparent[id] === 0 && kids[id].length > 0);
    const rb = components[b].some((id) => cparent[id] === 0 && kids[id].length > 0);
    if (ra !== rb) return ra ? -1 : 1;
    return components[b].length - components[a].length;
  });

  const pos = {};
  let yCursor = Y0;
  for (const ci of order) {
    const group = components[ci];
    const gset = new Set(group);
    const col = {};
    // roots: have contains-children but no contains-parent (e.g. Goal). If a
    // component has no contains backbone at all, seed its highest-degree node.
    let roots = group.filter((id) => cparent[id] === 0 && kids[id].length > 0);
    if (!roots.length) {
      let seed = group[0];
      for (const id of group) if (nbr[id].length > nbr[seed].length) seed = id;
      roots = [seed];
    }
    const queue = [...roots]; roots.forEach((id) => (col[id] = 0));
    while (queue.length) {
      const u = queue.shift();
      for (const v of kids[u]) { const c = col[u] + 1; if (col[v] == null || c > col[v]) { col[v] = c; queue.push(v); } }
    }
    // annotation / unplaced nodes: one column right of their best-placed neighbor
    for (let pass = 0; pass < group.length; pass++) {
      let changed = false;
      for (const id of group) {
        if (col[id] != null) continue;
        let best = null;
        for (const v of nbr[id]) if (col[v] != null) best = Math.max(best ?? 0, col[v] + 1);
        if (best != null) { col[id] = best; changed = true; }
      }
      if (!changed) break;
    }
    group.forEach((id) => { if (col[id] == null) col[id] = 0; });

    // ---- vertical: center each parent over its contains-children ----
    const y = {}; let leaf = 0;
    const dfs = (id) => {
      if (y[id] != null) return y[id];
      const ch = kids[id].filter((c) => gset.has(c));
      if (!ch.length) { y[id] = leaf * ROW_H; leaf++; return y[id]; }
      const cys = ch.map(dfs).filter((v) => v != null);
      y[id] = cys.length ? (Math.min(...cys) + Math.max(...cys)) / 2 : (leaf++ * ROW_H);
      return y[id];
    };
    roots.sort((a, b) => baseY[a] - baseY[b]).forEach(dfs);
    for (const id of group) if ((kids[id].length || cparent[id]) && y[id] == null) { y[id] = leaf * ROW_H; leaf++; }
    for (const id of group) {
      if (y[id] != null) continue;
      const nys = nbr[id].map((v) => y[v]).filter((v) => v != null);
      y[id] = nys.length ? nys.reduce((s, v) => s + v, 0) / nys.length : leaf++ * ROW_H;
    }
    // resolve in-column overlaps (keep order, push down by ROW_H)
    const byCol = {};
    for (const id of group) (byCol[col[id]] ||= []).push(id);
    Object.values(byCol).forEach((g) => {
      g.sort((a, b) => y[a] - y[b]);
      for (let i = 1; i < g.length; i++) if (y[g[i]] < y[g[i - 1]] + ROW_H) y[g[i]] = y[g[i - 1]] + ROW_H;
    });

    // Default placement: x by contains-depth (column), y by the centered tree above.
    let place = {};
    for (const id of group) place[id] = { x: col[id] * COL_W, y: y[id] };
    // Bushy-graph remedy: a wide-but-shallow component (one Goal → many modules →
    // many leaves) stacks dozens of same-depth siblings into one tall column, so the
    // tree becomes a thin vertical strip that fits-to-screen as an unreadable thread.
    // When a component is far taller than wide, re-pack it: each depth level's
    // siblings wrap horizontally into a near-square grid (siblings spread sideways
    // and fold into multiple sub-columns) so the aspect ratio matches the canvas.
    let tMaxX = 0, tMinY = Infinity, tMaxY = -Infinity;
    for (const id of group) { tMaxX = Math.max(tMaxX, place[id].x); tMinY = Math.min(tMinY, place[id].y); tMaxY = Math.max(tMaxY, place[id].y); }
    const treeW = tMaxX + COL_W, treeH = (isFinite(tMinY) ? tMaxY - tMinY : 0) + ROW_H;
    if (group.length > 6 && treeH > 1.6 * treeW) {
      place = packBalanced(group, col, kids, gset, baseY, COL_W, ROW_H, 1.3);
    }

    // normalize this component to start at (X0, yCursor), then advance the stack
    let minX = Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of group) { minX = Math.min(minX, place[id].x); minY = Math.min(minY, place[id].y); maxY = Math.max(maxY, place[id].y); }
    if (!isFinite(minY)) { minX = 0; minY = 0; maxY = 0; }
    for (const id of group) pos[id] = { x: Math.round(X0 + place[id].x - minX), y: Math.round(yCursor + place[id].y - minY) };
    yCursor += (maxY - minY) + ROW_H + COMPONENT_GAP;
  }
  return pos;
}

// Re-pack one over-tall component into a balanced grid. Depth still flows left→right,
// but each depth level's nodes wrap into multiple sub-columns (cap = rows per
// sub-column) instead of one tall stack, so the component fills a near-square box.
// Nodes are visited in contains pre-order (sorted by baseY) so a parent's children
// stay grouped; non-tree nodes (annotations/isolates) are appended by depth. The row
// cap is chosen by searching for the aspect ratio closest to `targetAspect`.
// Returns { [id]: { x, y } } in local (0-based) coordinates; caller normalizes.
function packBalanced(group, col, kids, gset, baseY, COL_W, ROW_H, targetAspect) {
  // contains pre-order for sibling grouping, seeded from the shallowest level
  const minCol = Math.min(...group.map((id) => col[id]));
  const seeds = group.filter((id) => col[id] === minCol).sort((a, b) => baseY[a] - baseY[b]);
  const order = [], placed = new Set();
  const visit = (id) => {
    if (placed.has(id)) return;
    placed.add(id); order.push(id);
    kids[id].filter((c) => gset.has(c)).sort((a, b) => baseY[a] - baseY[b]).forEach(visit);
  };
  seeds.forEach(visit);
  group.filter((id) => !placed.has(id)).sort((a, b) => col[a] - col[b] || baseY[a] - baseY[b])
    .forEach((id) => { order.push(id); placed.add(id); });

  // nodes grouped by depth level, in pre-order
  const levels = {};
  order.forEach((id) => { (levels[col[id]] ||= []).push(id); });
  const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);

  // search the rows-per-sub-column cap whose resulting box is closest to target
  let best = null;
  for (let cap = 3; cap <= group.length; cap++) {
    const pos = {}; let physCol = 0, maxRow = 0;
    for (const lvl of levelKeys) {
      const arr = levels[lvl];
      arr.forEach((id, i) => {
        const sc = Math.floor(i / cap), sr = i % cap;
        pos[id] = { x: (physCol + sc) * COL_W, y: sr * ROW_H };
        if (sr > maxRow) maxRow = sr;
      });
      physCol += Math.ceil(arr.length / cap);
    }
    const W = physCol * COL_W, H = (maxRow + 1) * ROW_H;
    const score = Math.abs(W / H - targetAspect);
    if (!best || score < best.score) best = { score, pos };
  }
  return best.pos;
}

// ---- Import: parse an ACM-MD markdown file back into a runtime GraphDocument ----
// Inverse of toAcmMd: pull the ```acm fenced YAML, merge layout into node x/y, and
// preserve protocol fields (validation / changes) for lossless round-trip.
export function parseAcmMd(text) {
  const warnings = [];
  if (!text || !text.trim()) return { doc: null, errors: ["文件为空"], warnings };

  const re = /```acm[^\n]*\n([\s\S]*?)```/g;
  const blocks = [];
  let m;
  while ((m = re.exec(text)) !== null) blocks.push(m[1]);

  let yamlText;
  if (blocks.length === 0) {
    // tolerate a raw YAML file without a fence as a fallback
    yamlText = text;
    warnings.push("未找到 ```acm 代码块，按整份 YAML 尝试解析");
  } else {
    if (blocks.length > 1) warnings.push(`发现 ${blocks.length} 个 acm 代码块，仅使用第 1 个`);
    yamlText = blocks[0];
  }

  let raw;
  try { raw = parseYaml(yamlText); }
  catch (e) { return { doc: null, errors: ["YAML 解析失败：" + (e?.message || e)], warnings }; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { doc: null, errors: ["acm 内容不是有效的图谱对象"], warnings };
  }

  const nodes = Array.isArray(raw.nodes) ? raw.nodes.map((n) => ({ ...n })) : [];
  const edges = Array.isArray(raw.edges) ? raw.edges.map((e) => ({ ...e })) : [];
  // Coordinate sources, in priority order:
  //   1) layout.nodes[id]   2) inline node.x/y   3) hierarchical auto-layout   4) grid
  const lay = (raw.layout && raw.layout.nodes) || {};
  let positioned = 0;
  nodes.forEach((n) => {
    const p = lay[n.id];
    if (p && typeof p.x === "number" && typeof p.y === "number") { n.x = p.x; n.y = p.y; positioned++; }
    else if (typeof n.x === "number" && typeof n.y === "number") { positioned++; }
  });
  // No usable coordinates in the file → lay out by graph structure (layered tree,
  // grouped by connected component) instead of a structure-blind grid.
  if (positioned === 0 && nodes.length) {
    const pos = layoutGraph({ nodes, edges });
    nodes.forEach((n) => { const p = pos[n.id]; if (p) { n.x = p.x; n.y = p.y; } });
    if (blocks.length) warnings.push("文件无 layout，已按图谱结构自动布局");
  }
  // Final safety net: anything still unplaced (e.g. layout listed only some nodes) gets a grid slot.
  nodes.forEach((n, i) => {
    if (typeof n.x !== "number" || typeof n.y !== "number") {
      n.x = 80 + (i % 4) * 240; n.y = 60 + Math.floor(i / 4) * 150;
    }
  });

  const doc = {
    schema_version: raw.schema_version || "acm-md/0.1",
    doc_id: raw.doc_id || `acm_import_${Date.now()}`,
    meta: (raw.meta && typeof raw.meta === "object") ? { ...raw.meta } : {},
    nodes,
    edges,
  };
  if (!doc.meta.title) doc.meta.title = "导入的图谱";
  if (raw.changes) doc.changes = raw.changes;       // ChangeSet passthrough
  if (raw.validation) doc.validation = raw.validation; // validation passthrough (v0.1)

  const errors = [];
  if (!Array.isArray(raw.nodes)) errors.push("缺少 nodes 数组");
  if (!Array.isArray(raw.edges)) warnings.push("缺少 edges，按空数组处理");
  return { doc, errors, warnings };
}
