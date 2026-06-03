// data.js — ACM controlled vocabulary, visual tokens, sample graph, pure helpers.
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
  for (const n of d.added_nodes) instr.push(`处理新增${NODE_TYPE_META[n.type]?.label || n.type}「${n.title}」(${n.id})。`);
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
  for (const n of doc.nodes) lines.push(`  ${safe(n.id)}["${NODE_TYPE_META[n.type]?.label || n.type}: ${n.title}"]`);
  for (const e of doc.edges) lines.push(`  ${safe(e.from)} -- ${RELATION_META[e.type]?.label || e.type} --> ${safe(e.to)}`);
  return lines.join("\n");
}
