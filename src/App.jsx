// App.jsx — top toolbar, three-pane layout, state, undo/redo, candidate menu, export, tweaks.
// Ported from the design prototype (app.jsx); window globals → ES imports.
import React from "react";
import {
  NODE_TYPES, NODE_TYPE_META, RELATION_META,
  sampleDoc, nextId, TYPE_PREFIX,
  validateDoc, diffDoc, diffCount, buildChangeSet,
  toExportDoc, toAcmMd, toMermaid, toYaml, inferRelation,
  DOMAIN_PROFILES, DOMAIN_PROFILE_META, PROFILE_LABELS, setActiveProfile, typeLabel,
} from "./acm/data.js";
import { GraphCanvas } from "./acm/Canvas.jsx";
import { LeftRail, Inspector, DiffPanel, ValidatePanel, ghostBtn } from "./acm/Panels.jsx";
import {
  useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakColor,
} from "./acm/TweaksPanel.jsx";

const { useState, useRef, useMemo, useCallback: useCb, useEffect: useFx } = React;

const clone = (o) => JSON.parse(JSON.stringify(o));

const TWEAK_DEFAULTS = {
  cardStyle: "chip",
  showGrid: true,
  accent: "#6366f1",
};

function minimalDoc(profileId) {
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seedLabel = (PROFILE_LABELS[profileId] && PROFILE_LABELS[profileId].Goal) || "目标";
  return {
    schema_version: "acm-md/0.1",
    doc_id: `acm_${ts}_${String(Math.floor(Math.random() * 900 + 100))}`,
    meta: { title: "未命名图谱", created_by: "acm-editor", created_at: new Date().toISOString(), purpose: "", source: "" },
    nodes: [{ id: "goal_001", type: "Goal", title: `新${seedLabel}`, status: "confirmed", description: "", priority: "P0",
      source: "manual", confidence: 0.9, tags: [], notes: "", x: 120, y: 200 }],
    edges: [],
  };
}

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [profile, setProfile] = useState("software"); // domain template — display names only
  setActiveProfile(profile); // sync global so all children render the right labels
  const [doc, setDoc] = useState(() => sampleDoc());
  const [base, setBase] = useState(() => sampleDoc());
  const [selection, setSelection] = useState(null);
  const [vp, setVp] = useState({ x: 40, y: 30, scale: 0.82 });
  const [tab, setTab] = useState("inspector");
  const [legendFilter, setLegendFilter] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [candidate, setCandidate] = useState(null); // {from,to,pos,options}
  const [exportTab, setExportTab] = useState(null);  // null | acmmd | diff | json | mermaid
  const [picker, setPicker] = useState(false);       // new-document template picker
  const [toast, setToast] = useState(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const undoRef = useRef([]); const redoRef = useRef([]);
  const lastKeyRef = useRef(null);
  const [, force] = useState(0);

  useFx(() => { const id = setTimeout(() => setFitSignal((s) => s + 1), 160); return () => clearTimeout(id); }, []);

  const diff = useMemo(() => diffDoc(base, doc), [base, doc]);
  const dirty = diffCount(diff) > 0 || diff.layout_changes.length > 0;
  const errCount = useMemo(() => validateDoc(doc).filter((i) => i.level === "error").length, [doc]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1900); };

  const commit = useCb((next, coalesceKey = null) => {
    setDoc((prev) => {
      if (!(coalesceKey && coalesceKey === lastKeyRef.current)) {
        undoRef.current.push(prev);
        if (undoRef.current.length > 120) undoRef.current.shift();
        redoRef.current = [];
      }
      lastKeyRef.current = coalesceKey;
      return typeof next === "function" ? next(prev) : next;
    });
    force((n) => n + 1);
  }, []);

  const undo = () => { if (!undoRef.current.length) return; redoRef.current.push(doc); setDoc(undoRef.current.pop()); lastKeyRef.current = null; force((n) => n + 1); };
  const redo = () => { if (!redoRef.current.length) return; undoRef.current.push(doc); setDoc(redoRef.current.pop()); lastKeyRef.current = null; force((n) => n + 1); };

  // ---- mutations ----
  const patchNode = (id, patch) => commit((d) => ({ ...d, nodes: d.nodes.map((n) => n.id === id ? { ...n, ...patch } : n) }),
    "node:" + id + ":" + Object.keys(patch).join(","));
  const patchEdge = (id, patch) => commit((d) => ({ ...d, edges: d.edges.map((e) => e.id === id ? { ...e, ...patch } : e) }),
    "edge:" + id + ":" + Object.keys(patch).join(","));
  const moveNode = (id, x, y) => commit((d) => ({ ...d, nodes: d.nodes.map((n) => n.id === id ? { ...n, x, y } : n) }), "move:" + id);

  const addNode = (type) => {
    commit((d) => {
      const id = nextId(TYPE_PREFIX[type], d.nodes.map((n) => n.id));
      const cx = (-vp.x + 360) / vp.scale, cy = (-vp.y + 240) / vp.scale;
      const node = { id, type, title: `新${typeLabel(type)}`, status: "confirmed", description: "",
        priority: "", source: "manual", confidence: 0.9, tags: [], notes: "", x: Math.round(cx + Math.random() * 40), y: Math.round(cy + Math.random() * 40) };
      setTimeout(() => setSelection({ kind: "node", id }), 0);
      return { ...d, nodes: [...d.nodes, node] };
    });
  };
  const deleteNode = (id) => {
    commit((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== id), edges: d.edges.filter((e) => e.from !== id && e.to !== id) }));
    setSelection(null);
  };
  const deleteEdge = (id) => { commit((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) })); setSelection(null); };

  const makeEdge = (d, from, to, type, status) => {
    const id = nextId("edge", d.edges.map((e) => e.id));
    return { id, from, to, type, status, reason: "", source: "inference", confidence: status === "suggested" ? 0.8 : 0.9 };
  };
  const createEdge = (from, to, screenPos) => {
    const fromN = doc.nodes.find((n) => n.id === from), toN = doc.nodes.find((n) => n.id === to);
    if (doc.edges.some((e) => e.from === from && e.to === to)) { showToast("关系已存在"); return; }
    const inf = inferRelation(fromN.type, toN.type);
    if (inf.auto && inf.candidates.length === 1) {
      let newId = null;
      commit((d) => { const e = makeEdge(d, from, to, inf.auto, "suggested"); newId = e.id; return { ...d, edges: [...d.edges, e] }; });
      setTimeout(() => { if (newId) setSelection({ kind: "edge", id: newId }); }, 0);
      showToast(`已推断关系：${RELATION_META[inf.auto].label}（suggested，待确认）`);
    } else {
      setCandidate({ from, to, pos: screenPos, options: inf.candidates });
    }
  };
  const pickCandidate = (type) => {
    const { from, to } = candidate; let newId = null;
    commit((d) => { const e = makeEdge(d, from, to, type, "suggested"); newId = e.id; return { ...d, edges: [...d.edges, e] }; });
    setCandidate(null);
    setTimeout(() => { if (newId) setSelection({ kind: "edge", id: newId }); }, 0);
  };
  const confirmEdge = (id) => patchEdge(id, { status: "confirmed" });

  const onSave = () => { setBase(clone(doc)); undoRef.current = []; redoRef.current = []; lastKeyRef.current = null; showToast("已保存为新基线，下一轮 diff 已重置"); };
  const createFromTemplate = (profileId) => {
    setProfile(profileId); setActiveProfile(profileId);
    const nd = minimalDoc(profileId);
    setDoc(nd); setBase(clone(nd)); setSelection(null);
    undoRef.current = []; redoRef.current = []; lastKeyRef.current = null;
    setPicker(false);
    showToast(`已新建「${DOMAIN_PROFILE_META[profileId].label}」模板的最小合法 ACM-MD 文档`);
    setTimeout(() => setFitSignal((s) => s + 1), 30);
  };
  const onNew = () => setPicker(true);
  const onOpen = () => { const nd = sampleDoc(); setDoc(nd); setBase(clone(nd)); setSelection(null); undoRef.current = []; redoRef.current = []; showToast("已载入示例图谱"); setTimeout(() => setFitSignal((s) => s + 1), 30); };
  // Hierarchical tree auto-layout: the `contains` tree is the backbone; parents
  // are vertically centered over their children, and annotation nodes (risk /
  // constraint / question / api / entity …) sit to the RIGHT of what they touch,
  // aligned to that node's height — instead of being dumped into column 0.
  const autoLayout = () => {
    commit((d) => {
      const COL_W = 320, ROW_H = 132, X0 = 60, Y0 = 40;
      const ids = d.nodes.map((n) => n.id);
      const idSet = new Set(ids);
      const baseY = Object.fromEntries(d.nodes.map((n) => [n.id, n.y]));
      const kids = {}; ids.forEach((id) => (kids[id] = []));      // contains children
      const cparent = {}; ids.forEach((id) => (cparent[id] = 0)); // contains in-degree
      const nbr = {}; ids.forEach((id) => (nbr[id] = []));        // all neighbors
      for (const e of d.edges) {
        if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
        nbr[e.from].push(e.to); nbr[e.to].push(e.from);
        if (e.type === "contains") { kids[e.from].push(e.to); cparent[e.to]++; }
      }
      // ---- columns ----
      // backbone roots have contains-children but no contains-parent (e.g. Goal)
      const col = {};
      const roots = ids.filter((id) => cparent[id] === 0 && kids[id].length > 0);
      const queue = [...roots]; roots.forEach((id) => (col[id] = 0));
      while (queue.length) {
        const u = queue.shift();
        for (const v of kids[u]) {
          const c = col[u] + 1;
          if (col[v] == null || c > col[v]) { col[v] = c; queue.push(v); }
        }
      }
      // annotation / unplaced nodes: one column right of their best-placed neighbor
      for (let pass = 0; pass < ids.length; pass++) {
        let changed = false;
        for (const id of ids) {
          if (col[id] != null) continue;
          let best = null;
          for (const v of nbr[id]) if (col[v] != null) best = Math.max(best ?? 0, col[v] + 1);
          if (best != null) { col[id] = best; changed = true; }
        }
        if (!changed) break;
      }
      ids.forEach((id) => { if (col[id] == null) col[id] = 0; });
      // ---- vertical: center each parent over its contains-children ----
      const y = {};
      let leaf = 0;
      const dfs = (id) => {
        if (y[id] != null) return y[id];
        const ch = kids[id];
        if (!ch.length) { y[id] = Y0 + leaf * ROW_H; leaf++; return y[id]; }
        const cys = ch.map(dfs).filter((v) => v != null);
        y[id] = cys.length ? (Math.min(...cys) + Math.max(...cys)) / 2 : (Y0 + (leaf++) * ROW_H);
        return y[id];
      };
      roots.sort((a, b) => baseY[a] - baseY[b]).forEach(dfs);
      // backbone nodes unreached by a root (cycles) → stack as leaves
      for (const id of ids) if ((kids[id].length || cparent[id]) && y[id] == null) { y[id] = Y0 + leaf * ROW_H; leaf++; }
      // annotation nodes: align to the average height of their placed neighbors
      for (const id of ids) {
        if (y[id] != null) continue;
        const nys = nbr[id].map((v) => y[v]).filter((v) => v != null);
        y[id] = nys.length ? nys.reduce((s, v) => s + v, 0) / nys.length : Y0 + (leaf++) * ROW_H;
      }
      // ---- resolve in-column overlaps (keep order, push down by ROW_H) ----
      const byCol = {};
      for (const id of ids) (byCol[col[id]] ||= []).push(id);
      Object.values(byCol).forEach((group) => {
        group.sort((a, b) => y[a] - y[b]);
        for (let i = 1; i < group.length; i++) if (y[group[i]] < y[group[i - 1]] + ROW_H) y[group[i]] = y[group[i - 1]] + ROW_H;
      });
      const pos = {};
      for (const id of ids) pos[id] = { x: X0 + col[id] * COL_W, y: Math.round(y[id]) };
      return { ...d, nodes: d.nodes.map((n) => ({ ...n, ...pos[n.id] })) };
    });
    setTimeout(() => setFitSignal((s) => s + 1), 30);
    showToast("已自动布局（层级树形，⌘Z 可撤销）");
  };

  const nameOf = (id) => (doc.nodes.find((n) => n.id === id) || base.nodes.find((n) => n.id === id) || {}).title || id;
  const goTo = (ref) => {
    if (doc.nodes.find((n) => n.id === ref)) { setSelection({ kind: "node", id: ref }); setTab("inspector"); }
    else if (doc.edges.find((e) => e.id === ref)) { setSelection({ kind: "edge", id: ref }); setTab("inspector"); }
  };

  // keyboard shortcuts: ⌘Z / ⇧⌘Z / ⌘S / Delete
  useFx(() => {
    const h = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); onSave(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection?.kind === "node") deleteNode(selection.id);
        else if (selection?.kind === "edge") deleteEdge(selection.id);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const accent = t.accent || "#6366f1";
  const diffN = diffCount(diff);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#fff", color: "#1d2433" }}>
      <Toolbar {...{ onNew, onOpen, onSave, undo, redo, autoLayout, dirty, errCount,
        canUndo: undoRef.current.length > 0, canRedo: redoRef.current.length > 0,
        onValidate: () => setTab("validate"), onExport: () => setExportTab("acmmd"), accent }} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {leftPanelOpen ? (
          <div style={{ position: "relative", flex: "0 0 auto", minHeight: 0 }}>
            <LeftRail doc={doc} dirty={dirty} onAddNode={addNode} onFit={() => setFitSignal((s) => s + 1)}
              legendFilter={legendFilter} setLegendFilter={setLegendFilter}
              profile={profile} onChangeProfile={(p) => { setProfile(p); showToast(`已切换显示为「${DOMAIN_PROFILE_META[p].label}」（仅改界面名，不改协议）`); }} />
            <PanelToggle side="left" open onClick={() => setLeftPanelOpen(false)} />
          </div>
        ) : (
          <CollapsedPanel side="left" onClick={() => setLeftPanelOpen(true)} label="展开左栏" />
        )}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <GraphCanvas doc={doc} selection={selection} onSelect={setSelection} onMoveNode={moveNode}
            onCreateEdge={createEdge} vp={vp} setVp={setVp} cardStyle={t.cardStyle} showGrid={t.showGrid} fitSignal={fitSignal} typeFilter={legendFilter} />
          <CanvasHint />
        </div>
        {rightPanelOpen ? (
          <div style={{ position: "relative", flex: "0 0 auto", minHeight: 0 }}>
            <PanelToggle side="right" open onClick={() => setRightPanelOpen(false)} />
            <RightPanel {...{ tab, setTab, doc, base, selection, patchNode, patchEdge, deleteNode, deleteEdge, confirmEdge, nameOf, goTo, diffN, errCount }} />
          </div>
        ) : (
          <CollapsedPanel side="right" onClick={() => setRightPanelOpen(true)} label="展开右栏" />
        )}
      </div>

      {picker && <TemplatePicker current={profile} onPick={createFromTemplate} onClose={() => setPicker(false)} />}
      {candidate && <CandidateMenu cand={candidate} onPick={pickCandidate} onClose={() => setCandidate(null)} nameOf={nameOf} doc={doc} />}
      {exportTab && <ExportModal doc={doc} base={base} diff={diff} tab={exportTab} setTab={setExportTab} onClose={() => setExportTab(null)} showToast={showToast} />}
      {toast && <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "#1d2433",
        color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: 12.5, zIndex: 60, boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)" }}>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="节点卡片" />
        <TweakRadio label="卡片样式" value={t.cardStyle} options={["bar", "chip", "minimal"]} onChange={(v) => setTweak("cardStyle", v)} />
        <TweakToggle label="点阵网格" value={t.showGrid} onChange={(v) => setTweak("showGrid", v)} />
        <TweakSection label="主题" />
        <TweakColor label="主色" value={t.accent} options={["#6366f1", "#2563eb", "#0d9488", "#e11d48"]} onChange={(v) => setTweak("accent", v)} />
      </TweaksPanel>
    </div>
  );
}

function Toolbar({ onNew, onOpen, onSave, undo, redo, autoLayout, dirty, errCount, canUndo, canRedo, onValidate, onExport, accent }) {
  const Btn = ({ onClick, disabled, children, title }) => (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e7e9ee", background: "#fff",
        borderRadius: 8, padding: "6px 11px", fontSize: 12.5, color: disabled ? "#cbd2dc" : "#344054",
        cursor: disabled ? "default" : "pointer", fontFamily: "inherit", fontWeight: 500, whiteSpace: "nowrap" }}>{children}</button>
  );
  const Div = () => <span style={{ width: 1, height: 20, background: "#eceef2", margin: "0 3px" }} />;
  return (
    <div style={{ height: 52, flex: "0 0 52px", borderBottom: "1px solid #ebedf1", display: "flex", alignItems: "center",
      gap: 6, padding: "0 14px", background: "#fff", zIndex: 20 }}>
      <Btn onClick={onNew} title="新建图谱（选择领域模板）"><span style={{ fontFamily: "var(--mono)" }}>＋</span>新建</Btn>
      <Btn onClick={onOpen} title="载入示例图谱">打开</Btn>
      <Btn onClick={onSave} title="保存为新基线 (⌘S)">保存{dirty && <span style={{ width: 6, height: 6, borderRadius: 9, background: "#d97706" }} />}</Btn>
      <Div />
      <Btn onClick={undo} disabled={!canUndo} title="撤销 (⌘Z)">↶</Btn>
      <Btn onClick={redo} disabled={!canRedo} title="重做 (⇧⌘Z)">↷</Btn>
      <Div />
      <Btn onClick={autoLayout} title="自动布局">⊞ 自动布局</Btn>
      <Btn onClick={onValidate} title="校验">
        ◇ 校验{errCount > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#e11d48", background: "#fef2f2", padding: "0 5px", borderRadius: 999, fontFamily: "var(--mono)" }}>{errCount}</span>}
      </Btn>
      <span style={{ flex: 1 }} />
      <button onClick={onExport} style={{ display: "flex", alignItems: "center", gap: 7, border: "none",
        background: accent, color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: `0 6px 16px -8px ${accent}` }}>↗ 导出给 Agent</button>
    </div>
  );
}

function RightPanel({ tab, setTab, doc, base, selection, patchNode, patchEdge, deleteNode, deleteEdge, confirmEdge, nameOf, goTo, diffN, errCount }) {
  const Tab = ({ id, label, badge, badgeColor }) => (
    <button onClick={() => setTab(id)} style={{ flex: 1, padding: "10px 4px", border: "none", background: "transparent",
      borderBottom: "2px solid " + (tab === id ? "#1d2433" : "transparent"), color: tab === id ? "#1d2433" : "#98a2b3",
      fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
      {label}{badge != null && badge !== 0 && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)",
        color: "#fff", background: badgeColor, borderRadius: 999, padding: "0 5px", minWidth: 14, textAlign: "center" }}>{badge}</span>}
    </button>
  );
  return (
    <div style={{ width: 320, flex: "0 0 320px", borderLeft: "1px solid #ebedf1", display: "flex", flexDirection: "column", background: "#fff", minHeight: 0 }}>
      <div style={{ display: "flex", borderBottom: "1px solid #ebedf1", flex: "0 0 auto" }}>
        <Tab id="inspector" label="Inspector" />
        <Tab id="diff" label="Agent Diff" badge={diffN} badgeColor="#6366f1" />
        <Tab id="validate" label="校验" badge={errCount} badgeColor="#e11d48" />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "inspector" && <Inspector doc={doc} selection={selection} patchNode={patchNode} patchEdge={patchEdge} deleteNode={deleteNode} deleteEdge={deleteEdge} confirmEdge={confirmEdge} />}
        {tab === "diff" && <DiffPanel base={base} cur={doc} nameOf={nameOf} />}
        {tab === "validate" && <ValidatePanel doc={doc} onGoTo={goTo} />}
      </div>
    </div>
  );
}

function CandidateMenu({ cand, onPick, onClose, nameOf, doc }) {
  const fromN = doc.nodes.find((n) => n.id === cand.from), toN = doc.nodes.find((n) => n.id === cand.to);
  const x = Math.min(cand.pos.x, window.innerWidth - 250), y = Math.min(cand.pos.y, window.innerHeight - 60 - cand.options.length * 40);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div style={{ position: "fixed", left: x, top: y, zIndex: 41, background: "#fff", border: "1px solid #e7e9ee",
        borderRadius: 12, boxShadow: "0 18px 44px -14px rgba(16,24,40,.32)", width: 236, overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f1f4", background: "#fafbfc" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#98a2b3", letterSpacing: ".04em" }}>选择关系类型</div>
          <div style={{ fontSize: 11.5, color: "#475467", marginTop: 4, lineHeight: 1.4 }}>
            {typeLabel(fromN.type)}「{fromN.title}」 → {typeLabel(toN.type)}「{toN.title}」
          </div>
        </div>
        <div style={{ padding: 6 }}>
          {cand.options.map((o) => (
            <button key={o} onClick={() => onPick(o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", border: "none", background: "transparent", borderRadius: 8, cursor: "pointer",
              textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f6f8")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: RELATION_META[o].c }} />
              <span style={{ fontSize: 13, color: "#1d2433", fontWeight: 600, flex: 1 }}>{RELATION_META[o].label}</span>
              <span style={{ fontSize: 10.5, color: "#98a2b3", fontFamily: "var(--mono)" }}>{o}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "7px 12px", borderTop: "1px solid #f0f1f4", fontSize: 10.5, color: "#98a2b3" }}>新建关系将落为 <b style={{ color: "#d97706" }}>suggested</b>，需在 Inspector 确认</div>
      </div>
    </>
  );
}

function ExportModal({ doc, base, diff, tab, setTab, onClose, showToast }) {
  const cs = useMemo(() => buildChangeSet(base, doc, diff), [base, doc, diff]);
  const content = useMemo(() => {
    if (tab === "acmmd") return toAcmMd(doc, cs);
    if (tab === "diff") return "```acm-changes\n" + toYaml(cs) + "\n```\n";
    if (tab === "json") return JSON.stringify(toExportDoc(doc, cs), null, 2);
    if (tab === "mermaid") return toMermaid(doc);
    return "";
  }, [tab, doc, cs]);
  const copy = () => { navigator.clipboard?.writeText(content); showToast("已复制到剪贴板"); };
  const tabs = [["acmmd", "完整 ACM-MD"], ["diff", "Agent Diff"], ["json", "图谱 JSON"], ["mermaid", "Mermaid 预览"]];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.34)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", inset: "7vh 8vw", zIndex: 51, background: "#fff", borderRadius: 16, display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px -20px rgba(16,24,40,.5)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #ebedf1" }}>
          <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>↗ 导出给 Agent</div>
          <span style={{ marginLeft: 10, fontSize: 11.5, color: "#98a2b3" }}>{diffCount(diff)} 处变更 · 本地确定性生成，无 AI</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ border: "none", background: "#f2f4f7", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#667085" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "10px 16px 0" }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "7px 13px", border: "1px solid " + (tab === id ? "#dfe1e6" : "transparent"),
              borderBottom: "none", background: tab === id ? "#f7f8fa" : "transparent", borderRadius: "8px 8px 0 0", fontSize: 12.5,
              fontWeight: 600, color: tab === id ? "#1d2433" : "#98a2b3", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, margin: "0 16px 16px", border: "1px solid #ebedf1", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "7px 12px", borderBottom: "1px solid #f0f1f4", background: "#fafbfc" }}>
            <span style={{ fontSize: 11, color: "#98a2b3", fontFamily: "var(--mono)" }}>{tab === "json" ? "graph.json" : tab === "mermaid" ? "preview.mmd" : tab === "diff" ? "changeset.acm" : "context-map.acm.md"}</span>
            <span style={{ flex: 1 }} />
            <button onClick={copy} style={{ ...ghostBtn, padding: "4px 10px", fontSize: 11.5 }}>复制</button>
          </div>
          <pre style={{ flex: 1, margin: 0, overflow: "auto", padding: "14px 16px", fontSize: 12, lineHeight: 1.6,
            fontFamily: "var(--mono)", color: "#344054", background: "#fff", whiteSpace: "pre" }}>{content}</pre>
        </div>
      </div>
    </>
  );
}

function TemplatePicker({ current, onPick, onClose }) {
  const PREVIEW = ["Goal", "Module", "Feature", "Task", "Risk", "Question"];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.34)", zIndex: 50, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 51, width: 620, maxWidth: "92vw",
        background: "#fff", borderRadius: 16, boxShadow: "0 30px 80px -20px rgba(16,24,40,.5)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1d2433" }}>新建逻辑上下文图谱</div>
          <div style={{ fontSize: 12, color: "#98a2b3", marginTop: 4, lineHeight: 1.5 }}>
            选择领域模板。模板只改变界面显示名，底层 ACM-MD v0.1 类型、id 和关系保持不变。
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 20px 20px" }}>
          {DOMAIN_PROFILES.map((p) => {
            const active = p.id === current;
            return (
              <button key={p.id} onClick={() => onPick(p.id)}
                style={{ textAlign: "left", border: "1px solid " + (active ? "#6366f1" : "#e7e9ee"), background: active ? "#f5f5ff" : "#fff",
                  borderRadius: 12, padding: "12px 13px", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 8 }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "#cdd2dc"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "#e7e9ee"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: active ? "#6366f1" : "#f2f4f7", color: active ? "#fff" : "#475467",
                    display: "grid", placeItems: "center", fontSize: 14, flex: "0 0 26px" }}>{p.glyph}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1d2433" }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: "#98a2b3", marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {PREVIEW.map((tp) => (
                    <span key={tp} style={{ fontSize: 10, color: "#667085", background: "#f2f4f7", borderRadius: 5, padding: "1px 6px",
                      border: `1px solid color-mix(in oklch, ${NODE_TYPE_META[tp].c} 22%, white)` }}>
                      {(PROFILE_LABELS[p.id] && PROFILE_LABELS[p.id][tp]) || NODE_TYPE_META[tp].label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CanvasHint() {
  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, fontSize: 10.5, color: "#b3bac6", fontFamily: "var(--mono)",
      background: "#ffffffd0", border: "1px solid #eef0f3", borderRadius: 8, padding: "5px 9px", pointerEvents: "none" }}>
      拖动空白平移 · 滚轮缩放 · 拖节点圆点连线
    </div>
  );
}

function PanelToggle({ side, open, onClick }) {
  const isLeft = side === "left";
  return (
    <button onClick={onClick} title={open ? (isLeft ? "收起左栏" : "收起右栏") : (isLeft ? "展开左栏" : "展开右栏")}
      style={{ position: "absolute", top: 14, [isLeft ? "right" : "left"]: -13, zIndex: 30,
        width: 26, height: 26, borderRadius: 999, border: "1px solid #dfe3ea", background: "#fff",
        color: "#667085", boxShadow: "0 4px 12px -8px rgba(16,24,40,.45)", cursor: "pointer",
        display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
      {open ? (isLeft ? "‹" : "›") : (isLeft ? "›" : "‹")}
    </button>
  );
}

function CollapsedPanel({ side, onClick, label }) {
  const isLeft = side === "left";
  return (
    <div style={{ width: 30, flex: "0 0 30px", position: "relative", background: "#fff",
      borderRight: isLeft ? "1px solid #ebedf1" : "none", borderLeft: isLeft ? "none" : "1px solid #ebedf1" }}>
      <button onClick={onClick} title={label}
        style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          width: 24, height: 24, borderRadius: 999, border: "1px solid #dfe3ea", background: "#fff",
          color: "#667085", boxShadow: "0 4px 12px -8px rgba(16,24,40,.45)", cursor: "pointer",
          display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 13 }}>
        {isLeft ? "›" : "‹"}
      </button>
      <div style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", writingMode: "vertical-rl",
        fontSize: 10.5, color: "#98a2b3", letterSpacing: ".08em", userSelect: "none", whiteSpace: "nowrap" }}>
        {label}
      </div>
    </div>
  );
}
