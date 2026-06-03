// Panels.jsx — left rail, Inspector, Diff panel, Validation panel + small field controls.
// Ported from the design prototype (panels.jsx); window globals → ES imports.
import React from "react";
import {
  NODE_TYPES, NODE_TYPE_META, NODE_STATUSES, STATUS_META,
  RELATION_TYPES, RELATION_META, PRIORITIES,
  validateDoc, diffDoc, diffCount, buildChangeSet,
} from "./data.js";

// ---------- small controls ----------
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 5, letterSpacing: ".02em" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 4 }}>{hint}</div>}
    </label>
  );
}
const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #e3e6ec", borderRadius: 8,
  padding: "7px 9px", fontSize: 13, color: "#1d2433", background: "#fff", fontFamily: "inherit", outline: "none",
};
function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }}
    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
    onBlur={(e) => (e.target.style.borderColor = "#e3e6ec")} />;
}
function TextArea(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 60, lineHeight: 1.5, ...(props.style || {}) }}
    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
    onBlur={(e) => (e.target.style.borderColor = "#e3e6ec")} />;
}
function Select({ value, onChange, options, render }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23889' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: 26 }}>
      {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
    </select>
  );
}
export function Chip({ children, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: `color-mix(in oklch, ${color} 10%, white)`,
    border: `1px solid color-mix(in oklch, ${color} 22%, white)`, padding: "2px 8px", borderRadius: 999 }}>{children}</span>;
}

// ---------- Left rail ----------
export function LeftRail({ doc, dirty, onAddNode, onFit, legendFilter, setLegendFilter }) {
  const counts = {};
  for (const n of doc.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
  const used = NODE_TYPES.filter((t) => counts[t]);
  return (
    <div style={{ width: 232, flex: "0 0 232px", borderRight: "1px solid #ebedf1", background: "#fcfcfd",
      display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #ebedf1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "grid", placeItems: "center", color: "#fff", fontSize: 15, fontFamily: "var(--mono)" }}>◎</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1d2433", lineHeight: 1.2 }}>Agent Context Map</div>
            <div style={{ fontSize: 10, color: "#98a2b3", fontFamily: "var(--mono)", marginTop: 2 }}>{doc.schema_version}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ebedf1" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".06em", marginBottom: 7 }}>当前文档</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1d2433", lineHeight: 1.35, textWrap: "pretty" }}>{doc.meta.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "#667085", background: "#f2f4f7", padding: "2px 6px", borderRadius: 5 }}>{doc.doc_id}</span>
          {dirty && <Chip color="#d97706">● 未保存</Chip>}
        </div>
        {doc.validation && (
          <div style={{ marginTop: 8, fontSize: 10.5, color: "#98a2b3", fontFamily: "var(--mono)" }}>
            validation: {doc.validation.profile} <span title="协议允许但工具不解释的字段，往返保留">ⓘ</span>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".06em" }}>节点类型</div>
        <span style={{ fontSize: 10.5, color: "#cbd2dc", fontFamily: "var(--mono)" }}>{doc.nodes.length}个</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 10px" }}>
        {used.map((t) => {
          const meta = NODE_TYPE_META[t];
          const active = legendFilter === t;
          return (
            <button key={t} onClick={() => setLegendFilter(active ? null : t)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", marginBottom: 1,
                border: "1px solid " + (active ? "#dfe1e6" : "transparent"), borderRadius: 7, cursor: "pointer",
                background: active ? "#f2f4f7" : "transparent", textAlign: "left" }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: meta.c, display: "grid", placeItems: "center",
                color: "#fff", fontSize: 11, fontFamily: "var(--mono)", flex: "0 0 18px" }}>{meta.glyph}</span>
              <span style={{ fontSize: 12.5, color: "#344054", flex: 1 }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: "#98a2b3", fontFamily: "var(--mono)" }}>{counts[t]}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid #ebedf1", display: "grid", gap: 7 }}>
        <Select value={"__add"} onChange={(t) => t !== "__add" && onAddNode(t)}
          options={["__add", ...NODE_TYPES]} render={(o) => o === "__add" ? "+ 新增节点…" : `+ ${NODE_TYPE_META[o].label} ${o}`} />
        <button onClick={onFit} style={{ ...ghostBtn }}>适应窗口</button>
      </div>
    </div>
  );
}
export const ghostBtn = { border: "1px solid #e3e6ec", background: "#fff", borderRadius: 8, padding: "7px 10px",
  fontSize: 12.5, color: "#344054", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };

// ---------- Inspector ----------
export function Inspector({ doc, selection, patchNode, patchEdge, deleteNode, deleteEdge, confirmEdge }) {
  if (!selection) {
    return <Empty glyph="◎" title="未选择对象" sub="点击画布中的节点或关系线查看并编辑属性；从节点右侧圆点拖出可创建关系。" />;
  }
  if (selection.kind === "node") {
    const n = doc.nodes.find((x) => x.id === selection.id);
    if (!n) return null;
    const meta = NODE_TYPE_META[n.type];
    return (
      <div style={panelBody}>
        <HeaderRow color={meta.c} glyph={meta.glyph} kind={meta.label} id={n.id} onDelete={() => deleteNode(n.id)} />
        <Field label="标题"><TextInput value={n.title} onChange={(e) => patchNode(n.id, { title: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="类型"><Select value={n.type} onChange={(v) => patchNode(n.id, { type: v })}
            options={NODE_TYPES} render={(o) => NODE_TYPE_META[o].label + " · " + o} /></Field>
          <Field label="状态"><Select value={n.status} onChange={(v) => patchNode(n.id, { status: v })}
            options={NODE_STATUSES} render={(o) => STATUS_META[o].label} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="优先级"><Select value={n.priority || ""} onChange={(v) => patchNode(n.id, { priority: v })}
            options={["", ...PRIORITIES]} render={(o) => o || "—"} /></Field>
          <Field label={`置信度 ${n.confidence != null ? n.confidence.toFixed(2) : "—"}`}>
            <input type="range" min="0" max="1" step="0.01" value={n.confidence ?? 0.9}
              onChange={(e) => patchNode(n.id, { confidence: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: meta.c }} />
          </Field>
        </div>
        <Field label="描述"><TextArea value={n.description || ""} onChange={(e) => patchNode(n.id, { description: e.target.value })} placeholder="节点描述…" /></Field>
        <Field label="标签" hint="逗号分隔">
          <TextInput value={(n.tags || []).join(", ")} onChange={(e) => patchNode(n.id, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="例如 闭环, MVP" />
        </Field>
        <Field label="备注"><TextArea value={n.notes || ""} onChange={(e) => patchNode(n.id, { notes: e.target.value })} placeholder="备注…" style={{ minHeight: 44 }} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <MetaCell label="来源" value={n.source || "—"} />
          <MetaCell label="出/入边" value={`${doc.edges.filter((e) => e.from === n.id).length} / ${doc.edges.filter((e) => e.to === n.id).length}`} />
        </div>
      </div>
    );
  }
  // edge
  const e = doc.edges.find((x) => x.id === selection.id);
  if (!e) return null;
  const from = doc.nodes.find((x) => x.id === e.from), to = doc.nodes.find((x) => x.id === e.to);
  const rc = RELATION_META[e.type].c;
  return (
    <div style={panelBody}>
      <HeaderRow color={rc} glyph="⇄" kind="关系" id={e.id} onDelete={() => deleteEdge(e.id)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8f9fb", border: "1px solid #eceef2",
        borderRadius: 9, padding: "9px 11px", marginBottom: 12 }}>
        <NodeMini node={from} /><span style={{ color: rc, fontWeight: 700 }}>→</span><NodeMini node={to} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="关系类型"><Select value={e.type} onChange={(v) => patchEdge(e.id, { type: v })}
          options={RELATION_TYPES} render={(o) => RELATION_META[o].label + " · " + o} /></Field>
        <Field label="状态"><Select value={e.status} onChange={(v) => patchEdge(e.id, { status: v })}
          options={NODE_STATUSES} render={(o) => STATUS_META[o].label} /></Field>
      </div>
      {e.status === "suggested" && (
        <button onClick={() => confirmEdge(e.id)} style={{ ...ghostBtn, width: "100%", marginBottom: 12,
          borderColor: "#16a34a", color: "#16a34a", background: "#f0fdf4", fontWeight: 600 }}>✓ 确认此关系（suggested → confirmed）</button>
      )}
      <Field label={`置信度 ${e.confidence != null ? e.confidence.toFixed(2) : "—"}`}>
        <input type="range" min="0" max="1" step="0.01" value={e.confidence ?? 0.9}
          onChange={(ev) => patchEdge(e.id, { confidence: parseFloat(ev.target.value) })} style={{ width: "100%", accentColor: rc }} />
      </Field>
      <Field label="原因 reason" hint="删除或关键修改时建议填写"><TextArea value={e.reason || ""} onChange={(ev) => patchEdge(e.id, { reason: ev.target.value })} placeholder="为什么存在这条关系…" style={{ minHeight: 44 }} /></Field>
      <MetaCell label="来源" value={e.source || "—"} />
    </div>
  );
}
const panelBody = { padding: "14px 16px", overflowY: "auto", height: "100%", boxSizing: "border-box" };
function HeaderRow({ color, glyph, kind, id, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 12 }}>{glyph}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1d2433" }}>{kind}</span>
      <span style={{ fontSize: 10.5, color: "#cbd2dc", fontFamily: "var(--mono)" }}>{id}</span>
      <span style={{ flex: 1 }} />
      <button onClick={onDelete} title="删除" style={{ border: "1px solid #f0d3d3", background: "#fff", color: "#e11d48",
        borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 14 }}>🗑</button>
    </div>
  );
}
function MetaCell({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "#344054", fontFamily: "var(--mono)" }}>{value}</div>
    </div>
  );
}
function NodeMini({ node }) {
  if (!node) return <span style={{ color: "#98a2b3" }}>?</span>;
  const meta = NODE_TYPE_META[node.type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.c, flex: "0 0 7px" }} />
      <span style={{ fontSize: 12, color: "#344054", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 78 }}>{node.title}</span>
    </span>
  );
}
function Empty({ glyph, title, sub }) {
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 30, color: "#dfe3ea", fontFamily: "var(--mono)" }}>{glyph}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#667085", marginTop: 10 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#98a2b3", marginTop: 6, lineHeight: 1.6, maxWidth: 230 }}>{sub}</div>
      </div>
    </div>
  );
}

// ---------- Diff panel ----------
export function DiffPanel({ base, cur, nameOf }) {
  const d = diffDoc(base, cur);
  const total = diffCount(d);
  const cs = buildChangeSet(base, cur, d);
  if (total === 0 && d.layout_changes.length === 0) {
    return <Empty glyph="≋" title="暂无变更" sub="相对导入快照没有结构性改动。编辑节点、连接关系或拖动后，这里会实时显示面向 Agent 的 diff。" />;
  }
  return (
    <div style={panelBody}>
      <div style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", border: "1px solid #e0e3ff", borderRadius: 10, padding: "11px 13px", marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6366f1", letterSpacing: ".05em", marginBottom: 5 }}>SUMMARY · 确定性模板生成</div>
        <div style={{ fontSize: 12.5, color: "#312e81", lineHeight: 1.55, textWrap: "pretty" }}>{cs.summary}</div>
        <div style={{ marginTop: 8, fontSize: 10.5, color: "#818cf8", fontFamily: "var(--mono)" }}>{cs.change_set_id} · base {cs.base_doc_id}</div>
      </div>

      <DiffGroup title="新增节点" color="#16a34a" items={d.added_nodes} render={(n) => <DiffLine c="#16a34a" sign="+" text={`${NODE_TYPE_META[n.type].label}「${n.title}」`} id={n.id} />} />
      <DiffGroup title="删除节点" color="#e11d48" items={d.removed_nodes} render={(n) => <DiffLine c="#e11d48" sign="−" text={`「${n.title}」`} id={n.id} />} />
      <DiffGroup title="修改节点字段" color="#d97706" items={d.modified_nodes} render={(m) => <FieldChange c="#d97706" name={nameOf(m.id)} field={m.field} before={m.before} after={m.after} />} />
      <DiffGroup title="新增关系" color="#2563eb" items={d.added_edges} render={(e) => <DiffLine c="#2563eb" sign="+" text={`${nameOf(e.from)} —${RELATION_META[e.type].label}→ ${nameOf(e.to)}`} id={e.id} />} />
      <DiffGroup title="删除关系" color="#e11d48" items={d.removed_edges} render={(e) => <DiffLine c="#e11d48" sign="−" text={`${nameOf(e.from)} → ${nameOf(e.to)}`} id={e.id} />} />
      <DiffGroup title="修改关系字段" color="#d97706" items={d.modified_edges} render={(m) => <FieldChange c="#d97706" name={m.id} field={m.field} before={m.before} after={m.after} />} />
      <DiffGroup title="布局变更" color="#94a3b8" items={d.layout_changes} render={(l) => <DiffLine c="#94a3b8" sign="◇" text={`位置 (${l.after.x}, ${l.after.y})`} id={l.id} />} />

      <div style={{ marginTop: 6, borderTop: "1px solid #ebedf1", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".05em", marginBottom: 8 }}>AGENT_INSTRUCTIONS</div>
        <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          {cs.agent_instructions.map((s, i) => (
            <li key={i} style={{ fontSize: 11.5, color: "#475467", lineHeight: 1.5, fontFamily: "var(--mono)" }}>{s}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
function DiffGroup({ title, color, items, render }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#344054" }}>{title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color, background: `color-mix(in oklch, ${color} 12%, white)`, padding: "0 6px", borderRadius: 999, fontFamily: "var(--mono)" }}>{items.length}</span>
      </div>
      <div style={{ display: "grid", gap: 5 }}>{items.map((it, i) => <div key={i}>{render(it)}</div>)}</div>
    </div>
  );
}
function DiffLine({ c, sign, text, id }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", background: "#fbfbfc", border: "1px solid #eef0f3", borderRadius: 7, padding: "6px 9px" }}>
      <span style={{ color: c, fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13 }}>{sign}</span>
      <span style={{ fontSize: 12, color: "#344054", flex: 1, lineHeight: 1.4, textWrap: "pretty" }}>{text}</span>
      <span style={{ fontSize: 9.5, color: "#cbd2dc", fontFamily: "var(--mono)" }}>{id}</span>
    </div>
  );
}
function FieldChange({ c, name, field, before, after }) {
  const fmt = (v) => v === "" || v == null ? "∅" : (typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div style={{ background: "#fbfbfc", border: "1px solid #eef0f3", borderRadius: 7, padding: "7px 9px" }}>
      <div style={{ fontSize: 11.5, color: "#344054", marginBottom: 4 }}>「{name}」· <span style={{ fontFamily: "var(--mono)", color: c }}>{field}</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 11, flexWrap: "wrap" }}>
        <span style={{ color: "#98a2b3", textDecoration: "line-through", background: "#fef2f2", padding: "1px 5px", borderRadius: 4 }}>{fmt(before)}</span>
        <span style={{ color: "#cbd2dc" }}>→</span>
        <span style={{ color: "#166534", background: "#f0fdf4", padding: "1px 5px", borderRadius: 4 }}>{fmt(after)}</span>
      </div>
    </div>
  );
}

// ---------- Validation panel ----------
export function ValidatePanel({ doc, onGoTo }) {
  const issues = validateDoc(doc);
  const errs = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warning");
  return (
    <div style={panelBody}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatPill c="#e11d48" label="Error" n={errs.length} />
        <StatPill c="#d97706" label="Warning" n={warns.length} />
        <StatPill c="#16a34a" label={errs.length ? "未通过" : "可导出"} n={errs.length ? "✕" : "✓"} />
      </div>
      {issues.length === 0 && <Empty glyph="✓" title="校验通过" sub="无 Error / Warning。" />}
      {[...errs, ...warns].map((it, i) => (
        <button key={i} onClick={() => it.ref && onGoTo(it.ref)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 9,
          alignItems: "flex-start", background: it.level === "error" ? "#fef4f4" : "#fffaf0",
          border: "1px solid " + (it.level === "error" ? "#fadbd8" : "#fbe8c8"), borderRadius: 8, padding: "9px 11px",
          marginBottom: 7, cursor: it.ref ? "pointer" : "default", fontFamily: "inherit" }}>
          <span style={{ fontSize: 12, color: it.level === "error" ? "#e11d48" : "#d97706", fontWeight: 700 }}>{it.level === "error" ? "✕" : "!"}</span>
          <span style={{ flex: 1, fontSize: 12, color: "#475467", lineHeight: 1.45, textWrap: "pretty" }}>{it.msg}</span>
          {it.ref && <span style={{ fontSize: 9.5, color: "#cbd2dc", fontFamily: "var(--mono)" }}>{it.ref}</span>}
        </button>
      ))}
    </div>
  );
}
function StatPill({ c, label, n }) {
  return (
    <div style={{ flex: 1, background: `color-mix(in oklch, ${c} 7%, white)`, border: `1px solid color-mix(in oklch, ${c} 18%, white)`,
      borderRadius: 9, padding: "8px 10px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: c, fontFamily: "var(--mono)", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 10.5, color: "#667085", marginTop: 3 }}>{label}</div>
    </div>
  );
}
