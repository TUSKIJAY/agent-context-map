// FlowCanvas.jsx — graph canvas built on React Flow (@xyflow/react).
//
// Replaces the hand-rolled Canvas.jsx renderer. React Flow gives professional
// pan/zoom, routed edges, arrowheads, edge labels and a minimap. Node positions
// come from the layout engine (dagre) in data.js; this file renders the ACM
// document and wires interactions back to the contract App expects:
//   onSelect({kind,id}) · onMoveNode(id,x,y) · onCreateEdge(from,to,screenPos) · fitSignal
//
// Self-contained extras (top-right panel): edge-style toggle (曲线/直角), focus
// highlight of a clicked node's neighbours, and PNG/SVG export of the whole graph.
import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Panel,
  Handle, Position, MarkerType, useReactFlow, useNodesState, getNodesBounds, getViewportForBounds,
  BaseEdge, getStraightPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_TYPE_META, STATUS_META, RELATION_META, typeLabel } from "./data.js";

function AcmNode({ data, selected }) {
  const n = data.node;
  const meta = NODE_TYPE_META[n.type] || { c: "#64748b", glyph: "●" };
  const st = STATUS_META[n.status] || { dot: "#cbd5e1", label: n.status };
  const isDep = n.status === "deprecated";
  const isAgentPreview = data.agentPreview;
  const isH = data.isH;
  const accent = isAgentPreview ? "#8b5cf6" : meta.c;
  const tint = `color-mix(in oklch, ${accent} ${isAgentPreview ? 11 : 8}%, white)`;
  const hStyle = { width: 9, height: 9, background: "#fff", border: `2px solid ${accent}` };
  return (
    <div style={{
      position: "relative",
      width: 210, background: isAgentPreview ? "linear-gradient(135deg,#ffffff,#fbfaff)" : "#fff", borderRadius: 12, overflow: "hidden",
      opacity: data.dimmed ? 0.18 : 1, transition: "opacity .15s, box-shadow .12s",
      border: `${isAgentPreview ? 1.5 : 1}px ${isAgentPreview || n.status === "suggested" ? "dashed" : "solid"} ${selected ? accent : data.related ? `${accent}99` : isAgentPreview ? "#a78bfa" : "#e7e9ee"}`,
      boxShadow: selected ? `0 0 0 2px ${accent}, 0 12px 28px -12px ${accent}66`
        : isAgentPreview ? "0 10px 24px -18px rgba(109,40,217,.55)"
        : data.related ? `0 0 0 1.5px ${accent}55, 0 6px 18px -10px ${accent}55`
        : "0 1px 2px rgba(16,24,40,.06), 0 4px 14px -8px rgba(16,24,40,.18)",
    }}>
      <Handle type="target" position={isH ? Position.Left : Position.Top} style={hStyle} />
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
            color: meta.c, background: tint, border: `1px solid color-mix(in oklch, ${meta.c} 22%, white)`, padding: "2px 8px", borderRadius: 999 }}>
            <span style={{ fontFamily: "var(--mono)" }}>{meta.glyph}</span>{typeLabel(n.type)}
          </span>
          <span style={{ flex: 1 }} />
          {data.hasChildren && (
            <button className="nodrag nopan" title={data.collapsed ? "展开子树" : "折叠子树"}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); data.onToggle && data.onToggle(n.id); }}
              style={{ width: 18, height: 18, padding: 0, lineHeight: "16px", borderRadius: 6,
                border: `1px solid ${meta.c}33`, background: tint, color: meta.c, cursor: "pointer",
                fontFamily: "var(--mono)", fontSize: 11, display: "grid", placeItems: "center" }}>
              {data.collapsed ? "▸" : "▾"}
            </button>
          )}
          <span title={st.label} style={{ width: 8, height: 8, borderRadius: 999, background: st.dot, boxShadow: `0 0 0 3px ${st.dot}22` }} />
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, color: "#1d2433", textDecoration: isDep ? "line-through" : "none" }}>{n.title}</div>
        {(n.priority || n.confidence != null) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            {n.priority && <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "var(--mono)", color: "#475467", background: "#f2f4f7", padding: "1px 6px", borderRadius: 5 }}>{n.priority}</span>}
            {n.confidence != null && <span style={{ fontSize: 10.5, color: "#98a2b3", fontFamily: "var(--mono)" }}>conf {Number(n.confidence).toFixed(2)}</span>}
          </div>
        )}
      </div>
      {isAgentPreview && (
        <div style={{ position: "absolute", top: 7, right: 8, fontSize: 10, fontWeight: 800, color: "#6d28d9",
          background: "#f3e8ff", border: "1px solid #ddd6fe", borderRadius: 999, padding: "1px 7px", pointerEvents: "none" }}>
          AI 建议
        </div>
      )}
      {data.collapsed && data.hiddenCount > 0 && (
        <div title={`已折叠 ${data.hiddenCount} 个子节点`} style={{ position: "absolute", right: 8, bottom: 6,
          fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color: meta.c, background: tint,
          border: `1px solid ${meta.c}33`, borderRadius: 6, padding: "1px 6px", pointerEvents: "none" }}>
          ▸ {data.hiddenCount}
        </div>
      )}
      <Handle type="source" position={isH ? Position.Right : Position.Bottom} style={hStyle} />
    </div>
  );
}
const GROUP_HEADER_H = 32; // collapsed-frame height (just the title bar)

// Container frame (阶段 D) — a synthetic RENDER-ONLY node (never in doc/export) that
// React Flow uses as the `parentId` for its members. FigJam-Frame look: dashed rounded
// border, faint type-tinted fill, a title bar (group label + member count) in the top
// padding band ELK reserved. The body is pointer-events:none so dragging empty frame
// area still pans the canvas and member cards (separate DOM, rendered above) stay
// clickable; only the title bar (and its collapse caret) is interactive.
function AcmGroup({ data }) {
  const accent = (data.type && NODE_TYPE_META[data.type]?.c) || "#6366f1";
  const tint = `color-mix(in oklch, ${accent} 6%, white)`;
  return (
    <div style={{ width: "100%", height: "100%", boxSizing: "border-box", borderRadius: 14,
      background: tint, border: `1.5px dashed ${accent}59`, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, display: "flex",
        alignItems: "center", gap: 6, padding: "0 10px", pointerEvents: "auto" }}>
        {data.onToggle && (
          <button className="nodrag nopan" title={data.collapsed ? "展开整组" : "折叠整组"}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); data.onToggle(data.gid); }}
            style={{ width: 18, height: 18, padding: 0, lineHeight: "16px", borderRadius: 6,
              border: `1px solid ${accent}40`, background: "#fff", color: accent, cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: 11, display: "grid", placeItems: "center", flex: "0 0 18px" }}>
            {data.collapsed ? "▸" : "▾"}
          </button>
        )}
        <span style={{ fontSize: 12, fontWeight: 700, color: accent, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis" }}>{data.label}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "var(--mono)", color: `${accent}aa` }}>{data.count}</span>
      </div>
    </div>
  );
}
const nodeTypes = { acm: AcmNode, group: AcmGroup };

// Point at half the arc-length of a polyline — where the relation label sits so it
// rides the middle of the routed (possibly multi-bend) edge, not a chord midpoint.
function polyMidpoint(pts) {
  const segs = []; let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(len); total += len;
  }
  let half = total / 2;
  for (let i = 1; i < pts.length; i++) {
    if (half <= segs[i - 1] || i === pts.length - 1) {
      const t = segs[i - 1] ? half / segs[i - 1] : 0.5;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    half -= segs[i - 1];
  }
  return pts[pts.length - 1];
}

// Custom edge that draws ELK's ORTHOGONAL route — the right-angle polyline through the
// bend points ELK computed (absolute canvas coords in `data.points`). We only ever
// assign this type when a route exists; the straight-path branch is a defensive guard.
// Every visual prop (color/width/dash via `style`, arrowhead via `markerEnd`, the
// relation label + its bg) is forwarded straight to BaseEdge, so elkEdge is visually
// identical to the default/smoothstep edges apart from the routing. Endpoints come from
// ELK, so after a node drag App drops that edge's route and it falls back to smoothstep.
function ElkEdge({ data, style, markerEnd, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, sourceX, sourceY, targetX, targetY }) {
  const pts = data?.points;
  let path, lx, ly;
  if (pts && pts.length >= 2) {
    path = "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ");
    const mid = polyMidpoint(pts);
    lx = mid.x; ly = mid.y;
  } else {
    [path, lx, ly] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  }
  return (
    <BaseEdge path={path} markerEnd={markerEnd}
      style={{ ...style, strokeLinejoin: "round", strokeLinecap: "round" }}
      label={label} labelX={lx} labelY={ly} labelStyle={labelStyle}
      labelShowBg={labelShowBg} labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding} labelBgBorderRadius={labelBgBorderRadius} />
  );
}
const edgeTypes = { elkEdge: ElkEdge };

function FlowInner({ doc, selection, onSelect, onMoveNode, onCreateEdge, onMoveAgentNode, fitSignal, typeFilter, rankdir, showGrid,
  hidden, collapsed, descCount, hasChildren, onToggleCollapse, engine, elkRoutes, groupOf, groupBoxes,
  collapsedGroups, onToggleGroup, showToast, exportAdapter, hostCapabilities, imageExportEnabled = true }) {
  const rf = useReactFlow();
  const wrapRef = useRef(null);
  const isH = (rankdir || "LR") !== "TB";
  const [edgeStyle, setEdgeStyle] = useState("bezier"); // bezier (曲线) | smoothstep (直角)
  const [exporting, setExporting] = useState(false);

  // focus highlight: when a node is selected, surface only it + its direct neighbours
  const focus = useMemo(() => {
    if (selection?.kind !== "node") return null;
    const id = selection.id;
    const nodes = new Set([id]); const edges = new Set();
    for (const e of doc.edges) {
      if (e.from === id) { nodes.add(e.to); edges.add(e.id); }
      if (e.to === id) { nodes.add(e.from); edges.add(e.id); }
    }
    return { nodes, edges };
  }, [selection, doc.edges]);

  // Derived nodes are the source of truth for *what* to render (position, styling,
  // selection/focus state). React Flow, however, needs to own a mutable node list so
  // it can apply live position changes while a node is being dragged — otherwise the
  // node only moves once onNodeDragStop persists to the doc and we re-derive, making
  // it jump to the end position with no in-between motion.
  // Grouping is active only when we have BOTH the membership map and box geometry; on a
  // stale state (e.g. right after undo) groupBoxes is null → render flat.
  const grouped = !!(groupOf && groupBoxes && Object.keys(groupBoxes).length);
  const derivedNodes = useMemo(() => {
    const out = [];
    // Container frames MUST precede their members in the array (React Flow requires the
    // parent before any child). They carry no `node` payload — purely synthetic.
    if (grouped) {
      for (const gid of Object.keys(groupBoxes)) {
        const box = groupBoxes[gid];
        const gCollapsed = collapsedGroups?.has(gid) || false;
        out.push({
          id: gid, type: "group", draggable: false, selectable: false, connectable: false,
          position: { x: box.x, y: box.y },
          // collapsed → shrink to a header bar (members are hidden); a fresh re-layout
          // already returns a small box, this also covers a fold toggled after layout.
          style: { width: box.width, height: gCollapsed ? GROUP_HEADER_H : box.height },
          data: { label: box.label, count: box.count, type: box.type,
            collapsed: gCollapsed, onToggle: onToggleGroup, gid },
        });
      }
    }
    for (const n of doc.nodes) {
      if (hidden?.has(n.id)) continue;   // collapse: drop nodes folded under a collapsed ancestor
      const filtered = typeFilter != null && n.type !== typeFilter;
      const faded = focus ? !focus.nodes.has(n.id) : false;
      const gid = grouped ? (groupOf?.[n.id] ?? null) : null; // undefined → ungrouped (top level)
      const box = gid ? groupBoxes[gid] : null;
      // Members store ABSOLUTE coords in the doc; React Flow wants a parented child's
      // position RELATIVE to its frame → subtract the frame origin here (and add it back
      // on drag-stop). The doc therefore stays absolute — ACM-MD contract untouched.
      const position = box
        ? { x: (Number.isFinite(n.x) ? n.x : 0) - box.x, y: (Number.isFinite(n.y) ? n.y : 0) - box.y }
        : { x: Number.isFinite(n.x) ? n.x : 0, y: Number.isFinite(n.y) ? n.y : 0 };
      const node = {
        id: n.id, type: "acm", position,
        selected: selection?.kind === "node" && selection.id === n.id,
        data: {
          node: n, isH, dimmed: filtered || faded, agentPreview: !!n.__agentPreview,
          related: focus ? focus.nodes.has(n.id) && selection.id !== n.id : false,
          hasChildren: hasChildren?.has(n.id) || false,
          collapsed: collapsed?.has(n.id) || false,
          hiddenCount: descCount?.get(n.id) || 0,
          onToggle: onToggleCollapse,
        },
      };
      if (box) { node.parentId = gid; node.extent = "parent"; } // confine member to its frame
      out.push(node);
    }
    return out;
  }, [doc.nodes, selection, isH, typeFilter, focus, hidden, collapsed, descCount, hasChildren, onToggleCollapse, grouped, groupOf, groupBoxes, collapsedGroups, onToggleGroup]);

  // React Flow's own node state; onNodesChange applies drag/select changes live.
  // We re-sync from derivedNodes whenever the doc or view state changes — none of
  // which happen mid-drag, so live drag positions are preserved until drag stop.
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  useEffect(() => { setNodes(derivedNodes); }, [derivedNodes, setNodes]);

  const edges = useMemo(() => doc.edges
    .filter((e) => !hidden?.has(e.from) && !hidden?.has(e.to))   // collapse: drop edges touching a hidden node
    .map((e) => {
    const rm = RELATION_META[e.type] || { c: "#94a3b8", label: e.type };
    const sel = selection?.kind === "edge" && selection.id === e.id;
    const preview = !!e.__agentPreview;
    const sug = e.status === "suggested" || preview;
    const onPath = focus ? focus.edges.has(e.id) : null;
    const faded = (focus && !onPath) || (!focus && typeFilter != null);
    const strong = sel || onPath;
    // ELK mode: use the orthogonal route when we have one (elkEdge), else fall back to
    // smoothstep (right-angle, same family) so a re-layout-pending edge still looks
    // orthogonal. dagre mode: honour the local 曲线/直角 toggle exactly as before.
    const route = engine === "elk" ? elkRoutes?.[e.id] : null;
    const type = route ? "elkEdge" : (engine === "elk" ? "smoothstep" : (edgeStyle === "smoothstep" ? "smoothstep" : "default"));
    return {
      id: e.id, source: e.from, target: e.to, type,
      data: route ? { points: route } : undefined,
      label: faded ? undefined : (preview ? `${rm.label} · AI建议` : rm.label), selected: sel, animated: sug && !faded,
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: rm.c },
      style: { stroke: preview ? "#8b5cf6" : rm.c, strokeWidth: strong ? 2.6 : preview ? 1.8 : 1.4, strokeDasharray: sug ? "6 4" : undefined, opacity: faded ? 0.08 : preview ? 0.78 : 0.9 },
      labelStyle: { fontSize: 10, fontWeight: 600, fill: rm.c },
      labelBgStyle: { fill: "#fff", fillOpacity: 0.9 }, labelBgPadding: [4, 2], labelBgBorderRadius: 4,
      zIndex: strong ? 10 : 0,
    };
  }), [doc.edges, selection, typeFilter, focus, edgeStyle, hidden, engine, elkRoutes]);

  useEffect(() => {
    if (!fitSignal) return;
    const t = setTimeout(() => rf.fitView({ padding: 0.18, duration: 350, maxZoom: 1.5 }), 40);
    return () => clearTimeout(t);
  }, [fitSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // A parented node's position is RELATIVE to its frame; add the frame origin back so the
  // doc keeps absolute coords (mirror of the relative subtraction in derivedNodes).
  const onNodeDragStop = useCallback((_, node) => {
    let x = node.position.x, y = node.position.y;
    const box = node.parentId && groupBoxes ? groupBoxes[node.parentId] : null;
    if (box) { x += box.x; y += box.y; }
    if (node.data?.agentPreview) onMoveAgentNode?.(node.id, Math.round(x), Math.round(y));
    else onMoveNode(node.id, Math.round(x), Math.round(y));
  }, [onMoveNode, onMoveAgentNode, groupBoxes]);
  const onNodeClick = useCallback((_, node) => onSelect({ kind: "node", id: node.id }), [onSelect]);
  const onEdgeClick = useCallback((_, edge) => onSelect({ kind: "edge", id: edge.id }), [onSelect]);
  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);
  const onConnect = useCallback((c) => {
    const viewport = hostCapabilities.getViewportSize();
    if (c.source && c.target && c.source !== c.target) onCreateEdge(c.source, c.target, { x: viewport.width / 2, y: viewport.height / 2 });
  }, [onCreateEdge, hostCapabilities]);

  // ---- export the whole graph (not just the visible part) to PNG / SVG ----
  const exportImage = useCallback(async (fmt) => {
    const label = fmt.toUpperCase();
    const viewportEl = wrapRef.current?.querySelector(".react-flow__viewport");
    const all = rf.getNodes();
    if (!viewportEl || !all.length) {
      showToast?.("当前没有可下载的图谱内容");
      return;
    }
    const bounds = getNodesBounds(all);
    const pad = 80;
    const w = Math.ceil(bounds.width) + pad * 2;
    const h = Math.ceil(bounds.height) + pad * 2;
    const vp = getViewportForBounds(bounds, w, h, 0.2, 2, 0.1);
    setExporting(true);
    const opts = {
      backgroundColor: "#ffffff", width: w, height: h, pixelRatio: 2,
      // skipFonts prevents the injected image serializer from reading cssRules from the cross-origin
      // Google Fonts stylesheet (a SecurityError that aborts the export); fonts are
      // already loaded in the page, so the rasterised text still renders correctly.
      skipFonts: true,
      style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      filter: (el) => !el?.classList || !(el.classList.contains("react-flow__minimap") || el.classList.contains("react-flow__controls") || el.classList.contains("react-flow__panel")),
    };
    const safe = (doc.meta?.title || "context-map").replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${safe}.${fmt}`;
    try {
      showToast?.(`正在生成 ${label} 下载…`);
      await exportAdapter.exportGraph({ format: fmt, element: viewportEl, options: opts, defaultName: fileName });
      showToast?.(`已开始下载 ${label}：${fileName}`);
    } catch (e) {
      showToast?.(`${label} 下载失败：${e?.message || e}`);
    } finally { setExporting(false); }
  }, [rf, doc.meta, showToast, exportAdapter]);

  const pillBtn = {
    border: "1px solid #e3e6eb", background: "#fff", borderRadius: 8, padding: "5px 10px",
    fontSize: 12, color: "#344054", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
    boxShadow: "0 2px 8px -4px rgba(16,24,40,.25)", whiteSpace: "nowrap",
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <style>{`.react-flow__node.selected{box-shadow:none!important}.react-flow__attribution{display:none}`}</style>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick} onConnect={onConnect}
        fitView fitViewOptions={{ padding: 0.18, maxZoom: 1.5 }}
        minZoom={0.05} maxZoom={2.5} nodesConnectable elementsSelectable
        proOptions={{ hideAttribution: true }} defaultEdgeOptions={{ type: "default" }}
      >
        {showGrid !== false && <Background gap={22} size={1} color="#e9ecf1" />}
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} maskColor="rgba(247,248,250,.7)"
          nodeColor={(nd) => nd.data?.agentPreview ? "#8b5cf6" : NODE_TYPE_META[nd.data?.node?.type]?.c || "#cbd5e1"} />
        <Panel position="top-right" style={{ display: "flex", gap: 6 }}>
          {engine !== "elk" && (
            <button style={pillBtn} title="切换连线样式：曲线（默认，自动分散避免重叠）/ 直角"
              onClick={() => setEdgeStyle((s) => (s === "bezier" ? "smoothstep" : "bezier"))}>
              {edgeStyle === "bezier" ? "～ 曲线" : "⌐ 直角"}
            </button>
          )}
          {engine === "elk" && (
            <span style={{ ...pillBtn, cursor: "default", color: "#667085", display: "flex", alignItems: "center" }}
              title="ELK 引擎下连线由布局自动正交路由（绕开节点，减少交叉）">⌐ 正交（ELK）</span>
          )}
          <button style={pillBtn} disabled={exporting || !imageExportEnabled} title="导出当前图谱为 PNG" onClick={() => exportImage("png")}>
            {exporting ? "导出中…" : "⤓ PNG"}
          </button>
          <button style={pillBtn} disabled={exporting || !imageExportEnabled} title="导出当前图谱为矢量 SVG" onClick={() => exportImage("svg")}>⤓ SVG</button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props) {
  return (
    <ReactFlowProvider key={props.doc?.doc_id || "doc"}>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
