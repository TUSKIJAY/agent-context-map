// Panels.jsx — left rail, Inspector, Diff panel, Validation panel + small field controls.
// Ported from the design prototype (panels.jsx); window globals → ES imports.
import React from "react";
import {
  NODE_TYPES, NODE_TYPE_META, NODE_STATUSES, STATUS_META,
  RELATION_TYPES, RELATION_META, PRIORITIES,
  validateDoc, diffDoc, diffCount, buildChangeSet,
  DOMAIN_PROFILES, DOMAIN_PROFILE_META, typeLabel, agentPatchStats,
} from "./data.js";

// ---------- small controls ----------
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#667085", marginBottom: 5, letterSpacing: ".02em" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </label>
  );
}
// confidence → qualitative tier (低 / 中 / 高) + color, used in the confidence labels
function confTier(v) {
  if (v == null) return { t: "—", c: "#98a2b3" };
  if (v < 0.5) return { t: "低", c: "#e11d48" };
  if (v < 0.8) return { t: "中", c: "#d97706" };
  return { t: "高", c: "#16a34a" };
}
function ConfLabel({ value }) {
  const tier = confTier(value);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ whiteSpace: "nowrap" }}>置信度</span>
      <span style={{ fontFamily: "var(--mono)", color: "#344054" }}>{value != null ? value.toFixed(2) : "—"}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: tier.c, background: `color-mix(in oklch, ${tier.c} 12%, white)`,
        padding: "0 6px", borderRadius: 999 }}>{tier.t}</span>
    </span>
  );
}
// confidence (machine signal) → a SUGGESTED status (human decision). Never auto-applied.
function suggestStatus(conf) {
  if (conf == null) return null;
  if (conf < 0.5) return "needs_validation";
  if (conf < 0.8) return "suggested";
  return "confirmed";
}
// banner shown when the machine's confidence implies a different status than the human set
function StatusSuggestion({ conf, status, onApply }) {
  if (status === "deprecated") return null; // deprecation is a deliberate human call
  const sug = suggestStatus(conf);
  if (!sug || sug === status) return null;
  const sm = STATUS_META[sug];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffaf0", border: "1px solid #fbe8c8",
      borderRadius: 8, padding: "7px 10px", margin: "-4px 0 12px" }}>
      <span style={{ fontSize: 13, color: "#d97706" }}>↳</span>
      <span style={{ flex: 1, fontSize: 11, color: "#92611a", lineHeight: 1.45 }}>
        置信度{conf != null ? ` ${conf.toFixed(2)}` : ""} 偏{confTier(conf).t}，建议状态改为
        <b style={{ color: sm.c }}>「{sm.label}」</b>
      </span>
      <button onClick={() => onApply(sug)} style={{ border: "1px solid #f0d9b0", background: "#fff", color: "#b45309",
        borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>应用</button>
    </div>
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

// Domain-template dropdown — only remaps display names, never the protocol.
function ProfileSelect({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e3e6ec", borderRadius: 8,
      padding: "6px 9px", background: "#fff" }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, background: "#f2f4f7", display: "grid", placeItems: "center",
        fontSize: 12, color: "#475467", flex: "0 0 20px" }}>{DOMAIN_PROFILE_META[value]?.glyph}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, color: "#1d2433", cursor: "pointer", appearance: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23889' fill='none' stroke-width='1.5'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat", backgroundPosition: "right center" }}>
        {DOMAIN_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </div>
  );
}

// ---------- Left rail ----------
export function LeftRail({ doc, dirty, onAddNode, onFit, legendFilter, setLegendFilter, profile, onChangeProfile }) {
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

      <div style={{ padding: "12px 16px", borderBottom: "1px solid #ebedf1" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".06em" }}>图谱模板</div>
          <span title="只改界面显示名，不改底层 ACM-MD 类型、id 和关系" style={{ fontSize: 10, color: "#cbd2dc", fontFamily: "var(--mono)" }}>仅显示</span>
        </div>
        <ProfileSelect value={profile} onChange={onChangeProfile} />
        <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 6, lineHeight: 1.5 }}>{DOMAIN_PROFILE_META[profile]?.desc}</div>
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
              <span style={{ fontSize: 12.5, color: "#344054", flex: 1 }}>{typeLabel(t)}</span>
              <span style={{ fontSize: 11, color: "#98a2b3", fontFamily: "var(--mono)" }}>{counts[t]}</span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid #ebedf1", display: "grid", gap: 7 }}>
        <Select value={"__add"} onChange={(t) => t !== "__add" && onAddNode(t)}
          options={["__add", ...NODE_TYPES]} render={(o) => o === "__add" ? "+ 新增节点…" : `+ ${typeLabel(o)} ${o}`} />
        <button onClick={onFit} style={{ ...ghostBtn }}>适应窗口</button>
      </div>
    </div>
  );
}
export const ghostBtn = { border: "1px solid #e3e6ec", background: "#fff", borderRadius: 8, padding: "7px 10px",
  fontSize: 12.5, color: "#344054", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };

// ---------- Inspector ----------
export function Inspector({ doc, selection, patchNode, patchEdge, deleteNode, deleteEdge, confirmEdge, pendingAgentPatch, onAgentAction, onAcceptAgentAll, onRejectAgentAll }) {
  if (!selection) {
    return <Empty glyph="◎" title="未选择对象" sub="点击画布中的节点或关系线查看并编辑属性；从节点右侧圆点拖出可创建关系。" />;
  }
  const pendingStats = agentPatchStats(pendingAgentPatch, "pending");
  if (selection.kind === "node") {
    const n = doc.nodes.find((x) => x.id === selection.id);
    if (!n) return null;
    const meta = NODE_TYPE_META[n.type];
    return (
      <div style={panelBody}>
        <HeaderRow color={meta.c} glyph={meta.glyph} kind={typeLabel(n.type)} id={n.id} onDelete={() => deleteNode(n.id)} />
        <AgentQuickActions pendingStats={pendingStats} onAction={onAgentAction} onAcceptAll={onAcceptAgentAll} onRejectAll={onRejectAgentAll} />
        <Field label="标题"><TextInput value={n.title} onChange={(e) => patchNode(n.id, { title: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="类型"><Select value={n.type} onChange={(v) => patchNode(n.id, { type: v })}
            options={NODE_TYPES} render={(o) => typeLabel(o) + " · " + o} /></Field>
          <Field label="状态" hint="人工评审决策（≠ 置信度）">
            <Select value={n.status} onChange={(v) => patchNode(n.id, { status: v })}
            options={NODE_STATUSES} render={(o) => STATUS_META[o].label} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="优先级"><Select value={n.priority || ""} onChange={(v) => patchNode(n.id, { priority: v })}
            options={["", ...PRIORITIES]} render={(o) => o || "—"} /></Field>
          <Field label={<ConfLabel value={n.confidence} />}
            hint="机器拆解时的把握度（0–1），是“信号”而非“决策”。改动它只会给出状态建议，不会自动改状态。">
            <input type="range" min="0" max="1" step="0.01" value={n.confidence ?? 0.9}
              onChange={(e) => patchNode(n.id, { confidence: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: meta.c }} />
          </Field>
        </div>
        <StatusSuggestion conf={n.confidence} status={n.status} onApply={(s) => patchNode(n.id, { status: s })} />
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
      <Field label={<ConfLabel value={e.confidence} />}
        hint="机器对“这条关系成立”的把握度（0–1），是信号而非人工决策。">
        <input type="range" min="0" max="1" step="0.01" value={e.confidence ?? 0.9}
          onChange={(ev) => patchEdge(e.id, { confidence: parseFloat(ev.target.value) })} style={{ width: "100%", accentColor: rc }} />
      </Field>
      <StatusSuggestion conf={e.confidence} status={e.status} onApply={(s) => patchEdge(e.id, { status: s })} />
      <Field label="原因 reason" hint="删除或关键修改时建议填写"><TextArea value={e.reason || ""} onChange={(ev) => patchEdge(e.id, { reason: ev.target.value })} placeholder="为什么存在这条关系…" style={{ minHeight: 44 }} /></Field>
      <MetaCell label="来源" value={e.source || "—"} />
    </div>
  );
}

function AgentQuickActions({ pendingStats, onAction, onAcceptAll, onRejectAll }) {
  const hasPending = pendingStats.total > 0;
  if (!onAction) return null;
  return (
    <div style={{ border: "1px solid #ebe7ff", background: "#fbfaff", borderRadius: 8, padding: 9, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", letterSpacing: ".04em" }}>AGENT 动作</div>
        <span style={{ flex: 1 }} />
        {hasPending && <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "#6d28d9" }}>待确认 {pendingStats.total}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button onClick={() => onAction("expand")} style={{ ...miniAgentBtn }}>展开此节点</button>
        <button onClick={() => onAction("plan")} style={{ ...miniAgentBtn }}>生成方案</button>
        <button onClick={() => onAction("rerun")} style={{ ...miniAgentBtn }}>重新推理</button>
        <button onClick={onAcceptAll} disabled={!hasPending} style={{ ...miniAgentBtn, borderColor: hasPending ? "#8b5cf6" : "#e3e6ec", color: hasPending ? "#6d28d9" : "#cbd2dc" }}>采纳建议</button>
        <button onClick={onRejectAll} disabled={!hasPending} style={{ ...miniAgentBtn, color: hasPending ? "#dc2626" : "#cbd2dc" }}>拒绝</button>
      </div>
    </div>
  );
}
const miniAgentBtn = { ...ghostBtn, padding: "5px 8px", fontSize: 11.5, borderRadius: 7, lineHeight: 1.2 };

// ---------- Agent panel ----------
export function AgentPanel({ doc, selection, pendingAgentPatch, messages, input, onInput, onSubmit, onAgentAction, onOpenSuggestions, busy = false, source = "idle", error = "" }) {
  const selected = selection?.kind === "node" ? doc.nodes.find((n) => n.id === selection.id) : null;
  const stats = agentPatchStats(pendingAgentPatch, "pending");
  const hasPending = stats.total > 0;
  const promptChips = ["新增批量导入需求文档", "补充风险和待确认项", "把此节点拆成子模块"];
  const statusText = busy ? "agy 同步中" : source === "agy_sdk" ? "agy SDK" : source === "agent_mock" ? "mock fallback" : "待连接";
  return (
    <div style={{ ...panelBody, position: "absolute", inset: 0, height: "auto", display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
      <section style={{ flex: "0 0 auto", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle>当前上下文</SectionTitle>
          <span style={{ flex: 1 }} />
          <span title={error || statusText} style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: source === "agent_mock" ? "#d97706" : busy ? "#2563eb" : source === "agy_sdk" ? "#16a34a" : "#98a2b3",
            border: "1px solid #eef0f3", borderRadius: 999, padding: "1px 7px", background: "#fff" }}>{statusText}</span>
        </div>
        {selected ? <NodeContextCard node={selected} /> : (
          <div style={{ fontSize: 12, color: "#98a2b3", border: "1px solid #eef0f3", borderRadius: 9, padding: 10 }}>未选中节点。Agent 将基于当前图谱整体生成建议。</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
          <button disabled={busy} onClick={() => onAgentAction("expand")} style={{ ...compactActionBtn, color: busy ? "#cbd2dc" : compactActionBtn.color }}>展开</button>
          <button disabled={busy} onClick={() => onAgentAction("plan")} style={{ ...compactActionBtn, color: busy ? "#cbd2dc" : compactActionBtn.color }}>方案</button>
          <button disabled={busy} onClick={() => onAgentAction("rerun")} style={{ ...compactActionBtn, color: busy ? "#cbd2dc" : compactActionBtn.color }}>重推理</button>
        </div>
        {error && <div style={{ fontSize: 11, color: "#b45309", background: "#fffaf0", border: "1px solid #fbe8c8", borderRadius: 8, padding: "7px 9px", marginTop: 8, lineHeight: 1.45 }}>
          agy 暂不可用，当前建议来自 mock fallback。{error}
        </div>}
      </section>

      {hasPending && (
        <section style={{ flex: "0 0 auto", border: "1px solid #e8e5ff", background: "#fbfaff", borderRadius: 8, padding: "9px 10px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5b21b6", flex: 1 }}>本轮建议</div>
            <Chip color="#8b5cf6">+{stats.nodes} 节点</Chip>
            <Chip color="#2563eb">+{stats.edges} 关系</Chip>
          </div>
          <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 7, lineHeight: 1.45 }}>{pendingAgentPatch.summary}</div>
          <button onClick={onOpenSuggestions} style={{ ...ghostBtn, width: "100%", marginTop: 8, padding: "6px 9px", fontSize: 11.5, borderColor: "#ddd6fe", color: "#6d28d9", fontWeight: 700 }}>查看并处理建议变更</button>
        </section>
      )}

      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", marginBottom: 12 }}>
        <SectionTitle>对话</SectionTitle>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 8, alignContent: "start",
          padding: 10, border: "1px solid #eef0f6", background: "#fcfcff", borderRadius: 10 }}>
          {messages.map((m) => <ChatBubble key={m.id} role={m.role} text={m.text} time={m.time} />)}
        </div>
      </section>

      {!hasPending && (
        <div style={{ flex: "0 0 auto", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {promptChips.map((p) => (
            <button key={p} type="button" onClick={() => onInput(p)}
              disabled={busy}
              style={{ border: "1px solid #ebe7ff", background: "#fbfaff", color: "#6d28d9", borderRadius: 999,
                padding: "4px 9px", fontSize: 11.5, fontFamily: "inherit", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{p}</button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={{ flex: "0 0 auto", display: "flex", gap: 7, paddingTop: 10, paddingRight: 48, borderTop: "1px solid #f0f1f4" }}>
        <TextInput value={input} disabled={busy} onChange={(e) => onInput(e.target.value)} placeholder={busy ? "正在请求 agy…" : "给 Agent 发送消息…"} style={{ flex: 1, minHeight: 38 }} />
        <button type="submit" disabled={busy} style={{ flex: "0 0 48px", border: "1px solid " + (busy ? "#e3e6ec" : "#7c3aed"), background: "#fff", color: busy ? "#cbd2dc" : "#6d28d9",
          borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}>{busy ? "…" : "发送"}</button>
      </form>
    </div>
  );
}
const compactActionBtn = { ...ghostBtn, padding: "6px 8px", fontSize: 11.5, borderRadius: 8, fontWeight: 700 };

function SectionTitle({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".06em", marginBottom: 8 }}>{children}</div>;
}

function NodeContextCard({ node }) {
  const meta = NODE_TYPE_META[node.type];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid #e7e9ee", borderRadius: 9, padding: "9px 10px", background: "#fff" }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center", background: `color-mix(in oklch, ${meta.c} 12%, white)`, color: meta.c, fontFamily: "var(--mono)", flex: "0 0 26px" }}>{meta.glyph}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1d2433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.title}</div>
        <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 3 }}>{typeLabel(node.type)} · {node.type} · {STATUS_META[node.status]?.label}</div>
      </div>
    </div>
  );
}

function ChatBubble({ role, text, time }) {
  const user = role === "user";
  return (
    <div style={{ justifySelf: user ? "end" : "start", maxWidth: "92%", background: user ? "#eaf2ff" : "#f3f0ff",
      border: "1px solid " + (user ? "#d7e6ff" : "#e4dcff"), borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: user ? "#2563eb" : "#6d28d9" }}>{user ? "你" : "Agent"}</span>
        <span style={{ fontSize: 10, color: "#98a2b3", fontFamily: "var(--mono)" }}>{time}</span>
      </div>
      <div style={{ fontSize: 12.2, color: "#344054", lineHeight: 1.5, textWrap: "pretty" }}>{text}</div>
    </div>
  );
}

// ---------- Suggested changes panel ----------
export function SuggestionsPanel({ doc, pendingAgentPatch, onAcceptOp, onRejectOp, onAcceptAll, onRejectAll, onUpdateOp, nameOf, onGoTo }) {
  if (!pendingAgentPatch) return <Empty glyph="✦" title="暂无 Agent 建议" sub="在 Agent tab 中发送需求，agy 会返回 pending graph patch；不可用时走 mock fallback。未采纳前不会写入正式图谱。" />;
  const pending = agentPatchStats(pendingAgentPatch, "pending");
  const all = agentPatchStats(pendingAgentPatch, "all");
  const ops = pendingAgentPatch.operations || [];
  return (
    <div style={panelBody}>
      <div style={{ border: "1px solid #e8e5ff", background: "linear-gradient(135deg,#fbfaff,#ffffff)", borderRadius: 10, padding: 11, marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6d28d9", letterSpacing: ".05em", marginBottom: 5 }}>PENDING GRAPH PATCH</div>
        <div style={{ fontSize: 12.5, color: "#312e81", lineHeight: 1.5 }}>{pendingAgentPatch.summary}</div>
        <div style={{ fontSize: 10.5, color: pendingAgentPatch.source === "agy_sdk" ? "#16a34a" : "#d97706", marginTop: 6, fontFamily: "var(--mono)" }}>
          source: {pendingAgentPatch.source}{pendingAgentPatch.fallbackReason ? ` · ${pendingAgentPatch.fallbackReason}` : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <StatPill c="#16a34a" label="节点" n={`+${pending.nodes}`} />
          <StatPill c="#2563eb" label="关系" n={`+${pending.edges}`} />
          <StatPill c="#d97706" label="待确认" n={pending.questions} />
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
          <button onClick={onAcceptAll} disabled={!pending.total} style={{ ...ghostBtn, flex: 1, borderColor: pending.total ? "#8b5cf6" : "#e3e6ec", color: pending.total ? "#6d28d9" : "#cbd2dc", fontWeight: 700 }}>全部采纳</button>
          <button onClick={onRejectAll} disabled={!pending.total} style={{ ...ghostBtn, flex: 1, color: pending.total ? "#dc2626" : "#cbd2dc" }}>全部拒绝</button>
        </div>
        <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 8, fontFamily: "var(--mono)" }}>{pendingAgentPatch.id} · {all.total} ops</div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {ops.map((op) => (
          <OperationCard key={op.id} op={op} doc={doc} nameOf={nameOf} onAccept={() => onAcceptOp(op.id)}
            onReject={() => onRejectOp(op.id)} onUpdate={(updater) => onUpdateOp(op.id, updater)} onGoTo={onGoTo} />
        ))}
      </div>
    </div>
  );
}

function OperationCard({ op, doc, nameOf, onAccept, onReject, onUpdate, onGoTo }) {
  const pending = op.status === "pending";
  const c = op.op === "add_node" ? "#16a34a" : op.op === "add_edge" ? "#2563eb" : "#d97706";
  const typeText = op.op === "add_node" ? "新增节点" : op.op === "add_edge" ? "新增关系" : "修改节点";
  const targetId = op.node?.id || op.edge?.id || op.nodeId;
  return (
    <div style={{ border: `1px solid ${pending ? "#e7e9ee" : "#eef0f3"}`, background: pending ? "#fff" : "#fafbfc", borderRadius: 9, padding: 10, opacity: pending ? 1 : 0.62 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ width: 18, height: 18, borderRadius: 6, background: `color-mix(in oklch, ${c} 12%, white)`, color: c, display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700 }}>{op.op === "add_edge" ? "→" : "+"}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#344054", flex: 1 }}>{typeText}</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: pending ? c : "#98a2b3" }}>{op.status}</span>
      </div>
      {op.op === "add_node" && <NodeOpEditor op={op} onUpdate={onUpdate} />}
      {op.op === "add_edge" && <EdgeOpEditor op={op} doc={doc} nameOf={nameOf} onUpdate={onUpdate} />}
      {op.op === "update_node" && <UpdateOpEditor op={op} nameOf={nameOf} onUpdate={onUpdate} />}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
        <button onClick={() => targetId && onGoTo(targetId)} disabled={!targetId} style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11 }}>定位</button>
        <span style={{ flex: 1, fontSize: 9.5, color: "#cbd2dc", fontFamily: "var(--mono)", overflow: "hidden", textOverflow: "ellipsis" }}>{op.id}</span>
        <button onClick={onAccept} disabled={!pending} style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11, color: pending ? "#16a34a" : "#cbd2dc" }}>采纳</button>
        <button onClick={onReject} disabled={!pending} style={{ ...ghostBtn, padding: "4px 8px", fontSize: 11, color: pending ? "#dc2626" : "#cbd2dc" }}>拒绝</button>
      </div>
    </div>
  );
}

function NodeOpEditor({ op, onUpdate }) {
  const n = op.node;
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <TextInput value={n.title || ""} disabled={op.status !== "pending"} onChange={(e) => onUpdate((cur) => ({ node: { ...cur.node, title: e.target.value } }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <Select value={n.type} onChange={(v) => onUpdate((cur) => ({ node: { ...cur.node, type: v } }))} options={NODE_TYPES} render={(o) => typeLabel(o)} />
        <Select value={n.status} onChange={(v) => onUpdate((cur) => ({ node: { ...cur.node, status: v } }))} options={NODE_STATUSES} render={(o) => STATUS_META[o].label} />
      </div>
      <div style={{ fontSize: 11.5, color: "#667085", lineHeight: 1.45 }}>{n.description || "—"}</div>
    </div>
  );
}

function EdgeOpEditor({ op, nameOf, onUpdate }) {
  const e = op.edge;
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ fontSize: 12, color: "#344054", lineHeight: 1.45 }}>{nameOf(e.from)} <span style={{ color: RELATION_META[e.type]?.c }}>→</span> {nameOf(e.to)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <Select value={e.type} onChange={(v) => onUpdate((cur) => ({ edge: { ...cur.edge, type: v } }))} options={RELATION_TYPES} render={(o) => RELATION_META[o].label} />
        <Select value={e.status} onChange={(v) => onUpdate((cur) => ({ edge: { ...cur.edge, status: v } }))} options={NODE_STATUSES} render={(o) => STATUS_META[o].label} />
      </div>
      {e.reason && <div style={{ fontSize: 11.5, color: "#667085", lineHeight: 1.45 }}>{e.reason}</div>}
    </div>
  );
}

function UpdateOpEditor({ op, nameOf, onUpdate }) {
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ fontSize: 12, color: "#344054" }}>修改「{nameOf(op.nodeId)}」</div>
      <TextArea value={JSON.stringify(op.patch || {}, null, 2)} onChange={(e) => {
        try { onUpdate({ patch: JSON.parse(e.target.value || "{}") }); } catch {}
      }} style={{ minHeight: 70, fontFamily: "var(--mono)", fontSize: 11 }} />
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

      <DiffGroup title="新增节点" color="#16a34a" items={d.added_nodes} render={(n) => <DiffLine c="#16a34a" sign="+" text={`${typeLabel(n.type)}「${n.title}」`} id={n.id} />} />
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
