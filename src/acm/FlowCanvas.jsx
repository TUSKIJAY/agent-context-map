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
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import "@xyflow/react/dist/style.css";
import { NODE_TYPE_META, STATUS_META, RELATION_META, typeLabel } from "./data.js";

function AcmNode({ data, selected }) {
  const n = data.node;
  const meta = NODE_TYPE_META[n.type] || { c: "#64748b", glyph: "●" };
  const st = STATUS_META[n.status] || { dot: "#cbd5e1", label: n.status };
  const isDep = n.status === "deprecated";
  const isH = data.isH;
  const tint = `color-mix(in oklch, ${meta.c} 8%, white)`;
  const hStyle = { width: 9, height: 9, background: "#fff", border: `2px solid ${meta.c}` };
  return (
    <div style={{
      width: 210, background: "#fff", borderRadius: 12, overflow: "hidden",
      opacity: data.dimmed ? 0.18 : 1, transition: "opacity .15s, box-shadow .12s",
      border: `1px ${n.status === "suggested" ? "dashed" : "solid"} ${selected ? meta.c : data.related ? `${meta.c}99` : "#e7e9ee"}`,
      boxShadow: selected ? `0 0 0 2px ${meta.c}, 0 12px 28px -12px ${meta.c}66`
        : data.related ? `0 0 0 1.5px ${meta.c}55, 0 6px 18px -10px ${meta.c}55`
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
      <Handle type="source" position={isH ? Position.Right : Position.Bottom} style={hStyle} />
    </div>
  );
}
const nodeTypes = { acm: AcmNode };

function download(dataUrl, name) {
  const a = document.createElement("a");
  a.download = name; a.href = dataUrl; a.click();
}

function FlowInner({ doc, selection, onSelect, onMoveNode, onCreateEdge, fitSignal, typeFilter, rankdir, showGrid }) {
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
  const derivedNodes = useMemo(() => doc.nodes.map((n) => {
    const filtered = typeFilter != null && n.type !== typeFilter;
    const faded = focus ? !focus.nodes.has(n.id) : false;
    return {
      id: n.id, type: "acm",
      position: { x: Number.isFinite(n.x) ? n.x : 0, y: Number.isFinite(n.y) ? n.y : 0 },
      selected: selection?.kind === "node" && selection.id === n.id,
      data: { node: n, isH, dimmed: filtered || faded, related: focus ? focus.nodes.has(n.id) && selection.id !== n.id : false },
    };
  }), [doc.nodes, selection, isH, typeFilter, focus]);

  // React Flow's own node state; onNodesChange applies drag/select changes live.
  // We re-sync from derivedNodes whenever the doc or view state changes — none of
  // which happen mid-drag, so live drag positions are preserved until drag stop.
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  useEffect(() => { setNodes(derivedNodes); }, [derivedNodes, setNodes]);

  const edges = useMemo(() => doc.edges.map((e) => {
    const rm = RELATION_META[e.type] || { c: "#94a3b8", label: e.type };
    const sel = selection?.kind === "edge" && selection.id === e.id;
    const sug = e.status === "suggested";
    const onPath = focus ? focus.edges.has(e.id) : null;
    const faded = (focus && !onPath) || (!focus && typeFilter != null);
    const strong = sel || onPath;
    return {
      id: e.id, source: e.from, target: e.to, type: edgeStyle === "smoothstep" ? "smoothstep" : "default",
      label: faded ? undefined : rm.label, selected: sel, animated: sug && !faded,
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: rm.c },
      style: { stroke: rm.c, strokeWidth: strong ? 2.6 : 1.4, strokeDasharray: sug ? "6 4" : undefined, opacity: faded ? 0.08 : 0.9 },
      labelStyle: { fontSize: 10, fontWeight: 600, fill: rm.c },
      labelBgStyle: { fill: "#fff", fillOpacity: 0.9 }, labelBgPadding: [4, 2], labelBgBorderRadius: 4,
      zIndex: strong ? 10 : 0,
    };
  }), [doc.edges, selection, typeFilter, focus, edgeStyle]);

  useEffect(() => {
    if (!fitSignal) return;
    const t = setTimeout(() => rf.fitView({ padding: 0.18, duration: 350, maxZoom: 1.5 }), 40);
    return () => clearTimeout(t);
  }, [fitSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeDragStop = useCallback((_, node) => onMoveNode(node.id, Math.round(node.position.x), Math.round(node.position.y)), [onMoveNode]);
  const onNodeClick = useCallback((_, node) => onSelect({ kind: "node", id: node.id }), [onSelect]);
  const onEdgeClick = useCallback((_, edge) => onSelect({ kind: "edge", id: edge.id }), [onSelect]);
  const onPaneClick = useCallback(() => onSelect(null), [onSelect]);
  const onConnect = useCallback((c) => {
    if (c.source && c.target && c.source !== c.target) onCreateEdge(c.source, c.target, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [onCreateEdge]);

  // ---- export the whole graph (not just the visible part) to PNG / SVG ----
  const exportImage = useCallback(async (fmt) => {
    const viewportEl = wrapRef.current?.querySelector(".react-flow__viewport");
    const all = rf.getNodes();
    if (!viewportEl || !all.length) return;
    const bounds = getNodesBounds(all);
    const pad = 80;
    const w = Math.ceil(bounds.width) + pad * 2;
    const h = Math.ceil(bounds.height) + pad * 2;
    const vp = getViewportForBounds(bounds, w, h, 0.2, 2, 0.1);
    setExporting(true);
    const opts = {
      backgroundColor: "#ffffff", width: w, height: h, pixelRatio: 2,
      // skipFonts avoids html-to-image trying to read cssRules from the cross-origin
      // Google Fonts stylesheet (a SecurityError that aborts the export); fonts are
      // already loaded in the page, so the rasterised text still renders correctly.
      skipFonts: true,
      style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
      filter: (el) => !el?.classList || !(el.classList.contains("react-flow__minimap") || el.classList.contains("react-flow__controls") || el.classList.contains("react-flow__panel")),
    };
    const safe = (doc.meta?.title || "context-map").replace(/[\\/:*?"<>|]/g, "_");
    try {
      if (fmt === "svg") download(await toSvg(viewportEl, opts), safe + ".svg");
      else download(await toPng(viewportEl, opts), safe + ".png");
    } finally { setExporting(false); }
  }, [rf, doc.meta]);

  const pillBtn = {
    border: "1px solid #e3e6eb", background: "#fff", borderRadius: 8, padding: "5px 10px",
    fontSize: 12, color: "#344054", cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
    boxShadow: "0 2px 8px -4px rgba(16,24,40,.25)", whiteSpace: "nowrap",
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <style>{`.react-flow__node.selected{box-shadow:none!important}.react-flow__attribution{display:none}`}</style>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick} onConnect={onConnect}
        fitView fitViewOptions={{ padding: 0.18, maxZoom: 1.5 }}
        minZoom={0.05} maxZoom={2.5} nodesConnectable elementsSelectable
        proOptions={{ hideAttribution: true }} defaultEdgeOptions={{ type: "default" }}
      >
        {showGrid !== false && <Background gap={22} size={1} color="#e9ecf1" />}
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeStrokeWidth={2} maskColor="rgba(247,248,250,.7)"
          nodeColor={(nd) => NODE_TYPE_META[nd.data?.node?.type]?.c || "#cbd5e1"} />
        <Panel position="top-right" style={{ display: "flex", gap: 6 }}>
          <button style={pillBtn} title="切换连线样式：曲线（默认，自动分散避免重叠）/ 直角"
            onClick={() => setEdgeStyle((s) => (s === "bezier" ? "smoothstep" : "bezier"))}>
            {edgeStyle === "bezier" ? "～ 曲线" : "⌐ 直角"}
          </button>
          <button style={pillBtn} disabled={exporting} title="导出当前图谱为 PNG" onClick={() => exportImage("png")}>
            {exporting ? "导出中…" : "⤓ PNG"}
          </button>
          <button style={pillBtn} disabled={exporting} title="导出当前图谱为矢量 SVG" onClick={() => exportImage("svg")}>⤓ SVG</button>
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
