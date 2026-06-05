// App.jsx — top toolbar, three-pane layout, state, undo/redo, candidate menu, export, tweaks.
// Ported from the design prototype (app.jsx); window globals → ES imports.
import React from "react";
import {
  NODE_TYPES, NODE_TYPE_META, RELATION_META,
  sampleDoc, nextId, TYPE_PREFIX,
  validateDoc, diffDoc, diffCount, buildChangeSet,
  toExportDoc, toAcmMd, toMermaid, toYaml, inferRelation, parseAcmMd, layoutGraph, layoutGraphElk,
  computeHidden, containsChildren, collapseToDepth, computeGroupOf,
  DOMAIN_PROFILES, DOMAIN_PROFILE_META, PROFILE_LABELS, setActiveProfile, typeLabel,
} from "./acm/data.js";
import { GraphCanvas } from "./acm/FlowCanvas.jsx";
import { LeftRail, Inspector, DiffPanel, ValidatePanel, ghostBtn } from "./acm/Panels.jsx";
import {
  useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakRadio, TweakColor,
} from "./acm/TweaksPanel.jsx";
import { Home } from "./acm/Home.jsx";
import * as store from "./storage/store.js";
import { openTextFile, saveTextFile } from "./storage/files.js";

const { useState, useRef, useMemo, useCallback: useCb, useEffect: useFx } = React;

const clone = (o) => JSON.parse(JSON.stringify(o));

// Placeholder document held in state before a real one is loaded from the store.
// Never shown to the user (the Home/loading view covers it) but keeps the diff /
// validate memos below safe to run unconditionally.
const BLANK_DOC = { schema_version: "acm-md/0.1", doc_id: "", meta: { title: "" }, nodes: [], edges: [] };

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
  const [view, setView] = useState("loading"); // loading | home | editor
  const [docId, setDocId] = useState(null);     // current document id in the local store
  const [recent, setRecent] = useState([]);     // recent documents for the Home page
  const [doc, setDoc] = useState(BLANK_DOC);
  const [base, setBase] = useState(BLANK_DOC);
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
  const [rankdir, setRankdir] = useState("LR"); // layout direction: LR (横向) | TB (纵向)
  // Layout engine — PURE view state (never part of doc/export): "dagre" (sync, fast,
  // default) | "elk" (async, orthogonal-routed edges & — in 阶段 D — nested containers).
  const [engine, setEngine] = useState("dagre");
  const [layouting, setLayouting] = useState(false); // ELK is async → show a loading veil
  // ELK orthogonal edge routes: { [edgeId]: [{x,y}…] } for the custom elkEdge. PURE view
  // state — regenerated on each ELK layout, never written into doc/export, and dropped
  // (→ smoothstep fallback) whenever node positions could have shifted (drag/undo/dagre).
  const [elkRoutes, setElkRoutes] = useState(null);
  // Grouping (阶段 D) — all PURE view state, never written into doc/export:
  //   grouping   "none" | "module" | "type" — the active dimension (implies ELK nesting).
  //   groupOf    { [nodeId]: groupId } so the canvas can parent members into their frame.
  //   groupBoxes { [groupId]: {x,y,width,height,label,count,type} } container geometry.
  const [grouping, setGrouping] = useState("none");
  const [groupOf, setGroupOf] = useState(null);
  const [groupBoxes, setGroupBoxes] = useState(null);
  // D-4: whole-group fold. Set<groupId>; members of a collapsed group join the hidden set
  // (reusing A's computeHidden render/layout pipeline) while the frame stays as a header.
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  // Mirror ref so onToggleGroup reads the LATEST fold set even across rapid same-frame
  // clicks (closure state would be stale until the next render).
  const collapsedGroupsRef = useRef(collapsedGroups);
  collapsedGroupsRef.current = collapsedGroups;
  // Folded `contains` subtrees. PURE view state — same level as profile / viewport:
  // never written into doc, undo, layout or any export (ACM-MD v0.1 stays untouched).
  const [collapsed, setCollapsed] = useState(() => new Set()); // Set<nodeId>

  const undoRef = useRef([]); const redoRef = useRef([]);
  const lastKeyRef = useRef(null);
  // layoutTokenRef guards against overlapping ELK runs (only the latest applies + owns the
  // loading veil). docEpochRef bumps on EVERY doc mutation (commit/undo/redo/open) so an
  // async ELK result computed from a now-stale doc is discarded instead of clobbering a
  // concurrent drag/undo/edit — the token alone can't see doc changes.
  const layoutTokenRef = useRef(0);
  const docEpochRef = useRef(0);
  const [, force] = useState(0);

  useFx(() => { const id = setTimeout(() => setFitSignal((s) => s + 1), 160); return () => clearTimeout(id); }, []);

  const diff = useMemo(() => diffDoc(base, doc), [base, doc]);
  const dirty = diffCount(diff) > 0 || diff.layout_changes.length > 0;
  const errCount = useMemo(() => validateDoc(doc).filter((i) => i.level === "error").length, [doc]);

  // Derived collapse view: which nodes have a `contains` subtree (toggle target),
  // which are currently hidden, and the per-node hidden-descendant count (badge).
  const childrenMap = useMemo(() => containsChildren(doc), [doc.nodes, doc.edges]);
  const hasChildren = useMemo(() => {
    const s = new Set();
    for (const [pid, kids] of childrenMap) if (kids && kids.length) s.add(pid);
    return s;
  }, [childrenMap]);
  const { hidden, descCount } = useMemo(() => computeHidden(doc, collapsed), [doc.nodes, doc.edges, collapsed]);
  // D-4: members of a collapsed group join A's hidden set, so the existing canvas filter
  // hides them and their edges while the frame stays visible as a header (count badge).
  const hiddenAll = useMemo(() => {
    if (!groupOf || !collapsedGroups.size) return hidden;
    const s = new Set(hidden);
    for (const id in groupOf) if (collapsedGroups.has(groupOf[id])) s.add(id);
    return s;
  }, [hidden, groupOf, collapsedGroups]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1900); };

  // ---- persistence (local store: SQLite on desktop, localStorage in browser dev) ----
  const saveTimer = useRef(null);
  const refreshRecent = useCb(() => { store.listDocuments().then(setRecent).catch(() => {}); }, []);

  const loadRecord = (rec, savedVp) => {
    const pid = rec.domain_profile || "software";
    docEpochRef.current++; // new doc → discard any ELK layout still in flight for the old one
    setProfile(pid); setActiveProfile(pid);
    setDoc(rec.body);
    setBase(rec.base_snapshot ? rec.base_snapshot : clone(rec.body));
    setDocId(rec.doc_id);
    setSelection(null);
    setCollapsed(new Set()); // collapse is per-document view state — reset on open/switch
    setElkRoutes(null);      // edge routes belong to the previous doc's coords — clear
    setGrouping("none"); setGroupOf(null); setGroupBoxes(null); setCollapsedGroups(new Set()); // grouping is per-doc view state
    undoRef.current = []; redoRef.current = []; lastKeyRef.current = null;
    setView("editor");
    if (savedVp && typeof savedVp.scale === "number") setVp(savedVp);       // restore working viewport
    else setTimeout(() => setFitSignal((s) => s + 1), 60);                  // or fit to content
  };

  const persistAndOpen = async (body, profileId, sourcePath = null) => {
    const id = body.doc_id;
    const title = (body.meta && body.meta.title) || "未命名图谱";
    try {
      await store.upsertDocument({ doc_id: id, title, domain_profile: profileId, body,
        base_snapshot: body, source_path: sourcePath, dirty: false, created_at: body.meta && body.meta.created_at });
      await store.setAppState("last_opened_doc_id", id);
    } catch (e) { console.warn("[acm] create failed", e); }
    loadRecord({ doc_id: id, title, domain_profile: profileId, body, base_snapshot: clone(body) });
    refreshRecent();
  };

  // boot: restore last working session if any, otherwise show the Home page
  useFx(() => {
    let alive = true;
    (async () => {
      try {
        const list = await store.listDocuments();
        if (alive) setRecent(list);
        const lastId = await store.getAppState("last_opened_doc_id", null);
        if (lastId) {
          const rec = await store.getDocument(lastId);
          if (alive && rec) {
            const savedVp = await store.getAppState("vp:" + lastId, null);
            if (alive) loadRecord(rec, savedVp);
            return;
          }
        }
      } catch (e) { console.warn("[acm] restore failed", e); }
      if (alive) setView("home");
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // debounced autosave of the working document body (does not move the diff baseline)
  useFx(() => {
    if (view !== "editor" || !docId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      store.saveBody(docId, { title: (doc.meta && doc.meta.title) || "未命名图谱",
        domain_profile: profile, body: doc, dirty }).then(refreshRecent).catch(() => {});
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [doc, dirty, view, docId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // debounced persistence of the canvas viewport, restored on next open
  useFx(() => {
    if (view !== "editor" || !docId) return;
    const id = setTimeout(() => { store.setAppState("vp:" + docId, vp).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [vp, view, docId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Give the canvas its space back: the right panel (Inspector) auto-collapses when
  // nothing is selected (it would only show an empty-state then) and re-opens on
  // selection. The Diff/校验 tabs open the panel explicitly, so they are unaffected.
  useFx(() => {
    if (selection) { setRightPanelOpen(true); setTab("inspector"); }
    else if (tab === "inspector") setRightPanelOpen(false);
  }, [selection, tab]);

  const commit = useCb((next, coalesceKey = null) => {
    docEpochRef.current++; // doc is changing → invalidate any in-flight async ELK layout
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

  // undo/redo can restore different node coords → stale ELK routes & group frames; drop
  // them (edges → smoothstep, render flattens). The grouping MODE is kept so re-layout
  // restores the frames. clearViewLayout centralises that "positions changed" reset.
  const clearViewLayout = () => { setElkRoutes(null); setGroupOf(null); setGroupBoxes(null); };
  const undo = () => { if (!undoRef.current.length) return; docEpochRef.current++; redoRef.current.push(doc); setDoc(undoRef.current.pop()); lastKeyRef.current = null; clearViewLayout(); force((n) => n + 1); };
  const redo = () => { if (!redoRef.current.length) return; docEpochRef.current++; undoRef.current.push(doc); setDoc(redoRef.current.pop()); lastKeyRef.current = null; clearViewLayout(); force((n) => n + 1); };

  // ---- mutations ----
  const patchNode = (id, patch) => commit((d) => ({ ...d, nodes: d.nodes.map((n) => n.id === id ? { ...n, ...patch } : n) }),
    "node:" + id + ":" + Object.keys(patch).join(","));
  const patchEdge = (id, patch) => commit((d) => ({ ...d, edges: d.edges.map((e) => e.id === id ? { ...e, ...patch } : e) }),
    "edge:" + id + ":" + Object.keys(patch).join(","));
  const moveNode = (id, x, y) => {
    commit((d) => ({ ...d, nodes: d.nodes.map((n) => n.id === id ? { ...n, x, y } : n) }), "move:" + id);
    // A dragged node invalidates the ELK routes of its incident edges (their orthogonal
    // polyline no longer meets the node) → drop just those so they revert to smoothstep.
    setElkRoutes((r) => {
      if (!r) return r;
      let touched = false; const next = { ...r };
      for (const e of doc.edges) if ((e.from === id || e.to === id) && next[e.id]) { delete next[e.id]; touched = true; }
      return touched ? next : r;
    });
  };

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

  const onSave = async () => {
    if (view !== "editor" || !docId) return;
    setBase(clone(doc));
    undoRef.current = []; redoRef.current = []; lastKeyRef.current = null;
    try {
      await store.saveBody(docId, { title: (doc.meta && doc.meta.title) || "未命名图谱", domain_profile: profile, body: doc, dirty: false });
      await store.saveBaseline(docId, doc);
      await store.addSnapshot(docId, "手动保存", doc);
      refreshRecent();
      showToast("已保存（新版基线已更新）");
    } catch (e) { showToast("保存失败：" + (e?.message || e)); }
  };
  const createFromTemplate = (profileId) => {
    setPicker(false);
    persistAndOpen(minimalDoc(profileId), profileId);
    showToast(`已新建「${DOMAIN_PROFILE_META[profileId].label}」模板`);
  };
  // onNew(): open template picker; onNew("generic"): create that template directly.
  const onNew = (presetProfile) => { if (typeof presetProfile === "string") createFromTemplate(presetProfile); else setPicker(true); };
  const viewSample = () => { persistAndOpen(sampleDoc(), "software"); showToast("已载入示例图谱"); };
  const openRecent = async (id) => {
    const rec = await store.getDocument(id);
    if (!rec) { showToast("记录不存在或已删除"); refreshRecent(); return; }
    try { await store.setAppState("last_opened_doc_id", id); } catch {}
    const savedVp = await store.getAppState("vp:" + id, null);
    loadRecord(rec, savedVp);
  };
  const renameDoc = (title) => commit((d) => ({ ...d, meta: { ...(d.meta || {}), title } }), "meta:title");
  const deleteRecent = async (id) => {
    await store.deleteDocument(id);
    if (id === docId) { setDocId(null); try { await store.setAppState("last_opened_doc_id", null); } catch {} }
    refreshRecent();
    showToast("已从本地删除该图谱");
  };
  const goHome = () => { refreshRecent(); setSelection(null); setView("home"); };
  const onImport = async () => {
    const f = await openTextFile();
    if (!f) return;
    const res = parseAcmMd(f.text);
    if (!res.doc) { showToast("导入失败：" + (res.errors[0] || "无法解析")); return; }
    await persistAndOpen(res.doc, "generic", f.path);
    const note = res.warnings && res.warnings.length ? "（" + res.warnings.join("；") + "）" : "";
    showToast("已导入 " + (f.name || "文件") + note);
  };
  // Hierarchical tree auto-layout (shared with import). The `contains` tree is the
  // backbone; parents are centered over their children; annotation nodes sit to the
  // right of what they touch; disconnected clusters are laid out and stacked apart.
  // Lay out only the VISIBLE subgraph; nodes folded away keep their current coords
  // (collapse is a view filter, so hidden nodes shouldn't reserve space). dagre is
  // synchronous; ELK is async (await + a loading veil) — both end in a SINGLE commit
  // so undo/redo semantics are identical. `eng` lets the engine toggle lay out with
  // the NEW engine before its setState has flushed. A token guards against the ELK
  // async race: if a newer layout starts mid-await, the stale result is dropped.
  // `grp` !== "none" forces ELK nested layout (grouping needs hierarchy); else `eng`
  // chooses dagre/ELK-flat. Both `eng`/`grp` are explicit so the engine & grouping
  // toggles can lay out with their NEW value before setState has flushed. Two guards on
  // the async ELK path: `token` drops a result superseded by a newer layout (and owns the
  // loading veil); `epoch` drops a result whose source `doc` was mutated mid-await by a
  // concurrent drag / undo / edit / open — so layout never clobbers the user's change.
  const applyLayout = async (dir, eng = engine, grp = grouping, cg = collapsedGroups) => {
    const { hidden: hid } = computeHidden(doc, collapsed);
    const vis = {
      nodes: doc.nodes.filter((n) => !hid.has(n.id)),
      edges: doc.edges.filter((e) => !hid.has(e.from) && !hid.has(e.to)),
    };
    const token = ++layoutTokenRef.current;
    const epoch = docEpochRef.current;
    const useElk = grp !== "none" || eng === "elk";
    if (useElk) {
      setLayouting(true);
      try {
        let gOf = null, groups = null;
        if (grp !== "none") { const r = computeGroupOf(vis, grp); gOf = r.groupOf; groups = r.groups; }
        const { pos, routes, containers } = await layoutGraphElk(vis, { rankdir: dir, groupOf: gOf, groups, collapsedGroups: cg });
        // apply only if no newer layout AND the doc hasn't changed under us
        if (token === layoutTokenRef.current && epoch === docEpochRef.current) {
          commit((d) => ({ ...d, nodes: d.nodes.map((n) => ({ ...n, ...(pos[n.id] || {}) })) }));
          setElkRoutes(routes);
          setGroupOf(grp !== "none" ? gOf : null);
          setGroupBoxes(grp !== "none" ? containers : null);
        }
      } finally {
        if (token === layoutTokenRef.current) setLayouting(false); // latest run clears the veil
      }
    } else {
      const pos = layoutGraph(vis, { rankdir: dir });
      commit((d) => ({ ...d, nodes: d.nodes.map((n) => ({ ...n, ...(pos[n.id] || {}) })) }));
      setElkRoutes(null); setGroupOf(null); setGroupBoxes(null); // dagre is flat — no routes/frames
    }
    setTimeout(() => setFitSignal((s) => s + 1), 30);
  };
  const autoLayout = () => {
    applyLayout(rankdir);
    showToast(grouping !== "none" ? "正在用 ELK 分组布局（容器+正交边，⌘Z 可撤销）"
      : engine === "elk" ? "正在用 ELK 布局（正交路由，⌘Z 可撤销）" : "已自动布局（dagre 分层，⌘Z 可撤销）");
  };
  const toggleDir = () => {
    const nd = rankdir === "LR" ? "TB" : "LR";
    setRankdir(nd); applyLayout(nd);
    showToast(nd === "LR" ? "已切换为横向布局（LR · 根在左）" : "已切换为纵向布局（TB · 根在上）");
  };
  // Toggle dagre↔ELK and immediately re-lay out with the new engine (state hasn't
  // flushed yet, so pass it explicitly). dagre is flat-only, so switching to it also
  // turns grouping off. ELK adds orthogonal routing & nesting; dagre stays the fast
  // default and the回退 path if ELK ever fails.
  const toggleEngine = () => {
    const ne = engine === "dagre" ? "elk" : "dagre";
    const ng = ne === "dagre" ? "none" : grouping;
    setEngine(ne);
    if (ng !== grouping) { setGrouping(ng); setCollapsedGroups(new Set()); }
    applyLayout(rankdir, ne, ng);
    showToast(ne === "elk" ? "已切换布局引擎：ELK（正交边·避让，异步布局）" : "已切换布局引擎：dagre（分层·快速·同步）");
  };
  // Cycle the grouping dimension 关闭→按模块→按类型→关闭. Grouping implies ELK nesting,
  // so enabling it flips the engine to ELK; turning it off keeps whatever engine was set.
  // The dimension change invalidates any per-group folds → reset them.
  const cycleGrouping = () => {
    const next = grouping === "none" ? "module" : grouping === "module" ? "type" : "none";
    const ne = next !== "none" ? "elk" : engine;
    setGrouping(next); setCollapsedGroups(new Set());
    if (ne !== engine) setEngine(ne);
    applyLayout(rankdir, ne, next);
    showToast(next === "module" ? "已按模块分组（容器=Goal 下各模块）"
      : next === "type" ? "已按类型分组（每种节点类型一组）" : "已关闭分组（回到扁平图）");
  };
  // Whole-group fold (D-4): toggle the group in `collapsedGroups` and RE-LAYOUT with the
  // new fold set. The re-layout is what makes both directions correct — collapsing
  // compacts the frame to a header (members excluded from layout), expanding restores a
  // full-size frame with its members properly re-placed (a render-only fold would leave
  // re-shown members clamped inside the stale compact box). Pass the next set explicitly
  // since setState hasn't flushed yet.
  const onToggleGroup = useCb((gid) => {
    const next = new Set(collapsedGroupsRef.current); // latest set, robust to rapid toggles
    if (next.has(gid)) next.delete(gid); else next.add(gid);
    collapsedGroupsRef.current = next; // so a second same-frame toggle builds on this
    setCollapsedGroups(next);
    applyLayout(rankdir, "elk", grouping, next);
  }, [rankdir, grouping, collapsed, doc]); // eslint-disable-line react-hooks/exhaustive-deps
  // Collapse / expand are PURE view ops: they only touch the `collapsed` set and
  // re-fit. They never commit to undo, never mutate node coords — folding a subtree
  // is not a document edit. Run 自动布局 to re-pack the visible subgraph after.
  const onToggleCollapse = useCb((id) => {
    setCollapsed((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setTimeout(() => setFitSignal((s) => s + 1), 30);
  }, []);
  const onCollapseAll = () => {
    setCollapsed((prev) => (prev.size > 0 ? new Set() : collapseToDepth(doc, 1)));
    setTimeout(() => setFitSignal((s) => s + 1), 30);
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

  if (view === "loading") {
    return <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#f7f8fa", color: "#98a2b3", fontSize: 13 }}>正在载入工作现场…</div>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#fff", color: "#1d2433" }}>
      {view === "home" ? (
        <Home recent={recent} onNew={onNew} onViewSample={viewSample} onOpenRecent={openRecent}
          onDeleteRecent={deleteRecent} onImport={onImport} persistenceMode={store.persistenceMode} accent={accent} />
      ) : (
      <>
      <Toolbar {...{ onHome: goHome, onNew, onImport, onSave, onRename: renameDoc, undo, redo, autoLayout, toggleDir, rankdir, dirty, errCount,
        engine, onToggleEngine: toggleEngine, layouting,
        grouping, onCycleGrouping: cycleGrouping,
        onCollapseAll, collapseAll: collapsed.size > 0, collapseAble: hasChildren.size > 0,
        title: (doc.meta && doc.meta.title) || "",
        canUndo: undoRef.current.length > 0, canRedo: redoRef.current.length > 0,
        onValidate: () => { setTab("validate"); setRightPanelOpen(true); }, onExport: () => setExportTab("acmmd"), accent }} />
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
            onCreateEdge={createEdge} rankdir={rankdir} showGrid={t.showGrid} fitSignal={fitSignal} typeFilter={legendFilter}
            hidden={hiddenAll} collapsed={collapsed} descCount={descCount} hasChildren={hasChildren} onToggleCollapse={onToggleCollapse}
            engine={engine} elkRoutes={elkRoutes} groupOf={groupOf} groupBoxes={groupBoxes}
            collapsedGroups={collapsedGroups} onToggleGroup={onToggleGroup} />
          <CanvasHint />
          {layouting && <LayoutVeil />}
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
      </>
      )}

      {picker && <TemplatePicker current={profile} onPick={createFromTemplate} onClose={() => setPicker(false)} />}
      {candidate && <CandidateMenu cand={candidate} onPick={pickCandidate} onClose={() => setCandidate(null)} nameOf={nameOf} doc={doc} />}
      {exportTab && <ExportModal doc={doc} base={base} diff={diff} tab={exportTab} setTab={setExportTab} onClose={() => setExportTab(null)} showToast={showToast} />}
      {toast && <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "#1d2433",
        color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: 12.5, zIndex: 60, boxShadow: "0 10px 30px -10px rgba(0,0,0,.4)" }}>{toast}</div>}

      {view === "editor" && (
      <TweaksPanel>
        <TweakSection label="节点卡片" />
        <TweakRadio label="卡片样式" value={t.cardStyle} options={["bar", "chip", "minimal"]} onChange={(v) => setTweak("cardStyle", v)} />
        <TweakToggle label="点阵网格" value={t.showGrid} onChange={(v) => setTweak("showGrid", v)} />
        <TweakSection label="主题" />
        <TweakColor label="主色" value={t.accent} options={["#6366f1", "#2563eb", "#0d9488", "#e11d48"]} onChange={(v) => setTweak("accent", v)} />
      </TweaksPanel>
      )}
    </div>
  );
}

function Toolbar({ onHome, onNew, onImport, onSave, onRename, undo, redo, autoLayout, toggleDir, rankdir, dirty, errCount, canUndo, canRedo, onValidate, onExport, accent, title, onCollapseAll, collapseAll, collapseAble, engine, onToggleEngine, layouting, grouping, onCycleGrouping }) {
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
      <Btn onClick={onHome} title="返回开始页（编辑已自动保存）"><span style={{ fontFamily: "var(--mono)" }}>‹</span>开始页</Btn>
      <Div />
      <Btn onClick={() => onNew()} title="新建图谱（选择领域模板）"><span style={{ fontFamily: "var(--mono)" }}>＋</span>新建</Btn>
      <Btn onClick={onImport} title="导入 ACM-MD 文件（.md / .acm.md）">导入</Btn>
      <Btn onClick={onSave} title="保存为新版基线 (⌘S)">保存{dirty && <span style={{ width: 6, height: 6, borderRadius: 9, background: "#d97706" }} />}</Btn>
      <input value={title} onChange={(e) => onRename(e.target.value)} placeholder="未命名图谱" title="点击修改图谱标题"
        style={{ marginLeft: 6, fontSize: 12.5, color: "#1d2433", fontWeight: 600, border: "1px solid transparent",
          borderRadius: 7, padding: "4px 8px", width: 200, background: "transparent", fontFamily: "inherit", outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = "#dfe3ea"; e.target.style.background = "#fff"; }}
        onBlur={(e) => { e.target.style.borderColor = "transparent"; e.target.style.background = "transparent"; }} />
      {dirty && <span style={{ fontSize: 11, color: "#d97706", whiteSpace: "nowrap" }}>· 未保存</span>}
      <Div />
      <Btn onClick={undo} disabled={!canUndo} title="撤销 (⌘Z)">↶</Btn>
      <Btn onClick={redo} disabled={!canRedo} title="重做 (⇧⌘Z)">↷</Btn>
      <Div />
      <Btn onClick={autoLayout} disabled={layouting} title={engine === "elk" ? "自动布局（ELK 分层 · 正交边）" : "自动布局（dagre 分层）"}>⊞ 自动布局</Btn>
      <Btn onClick={toggleDir} disabled={layouting} title="切换布局方向：LR 横向（根在左）/ TB 纵向（根在上）">
        {rankdir === "LR" ? "⇄ 横向" : "⇅ 纵向"}
      </Btn>
      <Btn onClick={onToggleEngine} disabled={layouting}
        title={engine === "elk" ? "布局引擎：ELK（正交边·避让·嵌套，异步）— 点击切回 dagre" : "布局引擎：dagre（分层·快速·同步）— 点击切到 ELK 正交边"}>
        {layouting ? "✦ 布局中…" : engine === "elk" ? "✦ ELK" : "⊞ dagre"}
      </Btn>
      <Btn onClick={onCycleGrouping} disabled={layouting}
        title="分组容器：关闭 / 按模块（Goal 下各模块）/ 按类型（每种节点一组）。纯派生视图，不写入文档或导出">
        {grouping === "module" ? "▦ 按模块" : grouping === "type" ? "▦ 按类型" : "▦ 分组"}
      </Btn>
      <Btn onClick={onCollapseAll} disabled={!collapseAble}
        title={collapseAll ? "展开所有折叠的子树" : "折叠子树到第一层（仅视图状态，不写入文档/导出）"}>
        {collapseAll ? "⊞ 展开全部" : "⊟ 折叠子树"}
      </Btn>
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
  const safeTitle = ((doc.meta && doc.meta.title) || "context-map").replace(/[\\/:*?"<>|]/g, "_");
  const fileName = tab === "json" ? "graph.json" : tab === "mermaid" ? "preview.mmd" : tab === "diff" ? safeTitle + ".changeset.acm.md" : safeTitle + ".acm.md";
  const saveToFile = async () => {
    try { const r = await saveTextFile(content, { defaultName: fileName }); if (r) showToast("已保存到 " + r.path); }
    catch (e) { showToast("保存失败：" + (e?.message || e)); }
  };
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
            <button key={id} onClick={() => setTab(id)} style={{ padding: "7px 13px",
              // all-longhand borders: mixing `border` shorthand with `borderBottom` makes
              // React warn on rerender (shorthand vs non-shorthand for the same value).
              borderTop: "1px solid " + (tab === id ? "#dfe1e6" : "transparent"),
              borderLeft: "1px solid " + (tab === id ? "#dfe1e6" : "transparent"),
              borderRight: "1px solid " + (tab === id ? "#dfe1e6" : "transparent"),
              borderBottom: "none", background: tab === id ? "#f7f8fa" : "transparent", borderRadius: "8px 8px 0 0", fontSize: 12.5,
              fontWeight: 600, color: tab === id ? "#1d2433" : "#98a2b3", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, margin: "0 16px 16px", border: "1px solid #ebedf1", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "7px 12px", borderBottom: "1px solid #f0f1f4", background: "#fafbfc" }}>
            <span style={{ fontSize: 11, color: "#98a2b3", fontFamily: "var(--mono)" }}>{tab === "json" ? "graph.json" : tab === "mermaid" ? "preview.mmd" : tab === "diff" ? "changeset.acm" : "context-map.acm.md"}</span>
            <span style={{ flex: 1 }} />
            <button onClick={saveToFile} style={{ ...ghostBtn, padding: "4px 10px", fontSize: 11.5 }}>保存到文件</button>
            <button onClick={copy} style={{ ...ghostBtn, padding: "4px 10px", fontSize: 11.5, marginLeft: 6 }}>复制</button>
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

// Lightweight loading veil shown while ELK lays out (a large graph can take ~a second).
// Non-blocking visually but covers the canvas so the mid-layout jump isn't jarring.
function LayoutVeil() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 25,
      background: "rgba(247,248,250,.55)", backdropFilter: "blur(1px)", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", color: "#475467",
        border: "1px solid #e7e9ee", borderRadius: 999, padding: "7px 15px", fontSize: 12.5, fontWeight: 600,
        boxShadow: "0 10px 30px -12px rgba(16,24,40,.35)" }}>
        <span style={{ width: 13, height: 13, borderRadius: 999, border: "2px solid #c7cdda", borderTopColor: "#6366f1",
          display: "inline-block", animation: "acmspin .7s linear infinite" }} />
        ELK 正在布局…
      </div>
      <style>{`@keyframes acmspin{to{transform:rotate(360deg)}}`}</style>
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
