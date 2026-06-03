// Canvas.jsx — interactive graph canvas: pan, zoom, drag nodes, draw edges, connect-to-create.
// Ported from the design prototype (canvas.jsx); window globals → ES imports.
import React from "react";
import { NODE_TYPE_META, STATUS_META, RELATION_TYPES, RELATION_META } from "./data.js";

const { useRef, useState, useEffect, useCallback } = React;

// border-intersection anchor: point on box edge pointing toward (tx,ty)
function boxAnchor(node, w, h, tx, ty) {
  const cx = node.x + w / 2, cy = node.y + h / 2;
  let dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) dy = 1;
  const sx = dx === 0 ? Infinity : (w / 2) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (h / 2) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s, cx, cy };
}

function edgePath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  const k = Math.max(40, Math.min(160, Math.abs(horiz ? dx : dy) * 0.5));
  const c1 = horiz ? { x: a.x + Math.sign(dx || 1) * k, y: a.y } : { x: a.x, y: a.y + Math.sign(dy || 1) * k };
  const c2 = horiz ? { x: b.x - Math.sign(dx || 1) * k, y: b.y } : { x: b.x, y: b.y - Math.sign(dy || 1) * k };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

function NodeCard({ node, selected, dimmed, cardStyle, onPointerDownNode, onPointerDownHandle, measureRef }) {
  const meta = NODE_TYPE_META[node.type];
  const st = STATUS_META[node.status];
  const isDep = node.status === "deprecated";
  const tint = `color-mix(in oklch, ${meta.c} 8%, white)`;

  const base = {
    position: "absolute", left: node.x, top: node.y, width: 210,
    background: "#fff", borderRadius: 12, cursor: "grab",
    boxShadow: selected ? `0 0 0 2px ${meta.c}, 0 12px 28px -12px ${meta.c}66` : "0 1px 2px rgba(16,24,40,.06), 0 4px 14px -8px rgba(16,24,40,.18)",
    border: "1px solid " + (selected ? meta.c : "#e7e9ee"),
    opacity: dimmed ? 0.35 : 1, transition: "opacity .15s, box-shadow .12s",
    userSelect: "none", overflow: "hidden",
  };
  if (node.status === "suggested") base.borderStyle = "dashed";

  return (
    <div ref={measureRef} className="acm-node" data-node={node.id}
         style={base} onPointerDown={(e) => onPointerDownNode(e, node)}>
      {cardStyle === "bar" && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: meta.c }} />
      )}
      <div style={{ padding: cardStyle === "bar" ? "10px 12px 10px 16px" : "10px 12px" }}>
        {cardStyle === "chip" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
              color: meta.c, background: tint, border: `1px solid color-mix(in oklch, ${meta.c} 22%, white)`,
              padding: "2px 8px", borderRadius: 999 }}>
              <span style={{ fontFamily: "var(--mono)" }}>{meta.glyph}</span>{meta.label}
            </span>
            <span style={{ flex: 1 }} />
            <span title={st.label} style={{ width: 8, height: 8, borderRadius: 999, background: st.dot, boxShadow: `0 0 0 3px ${st.dot}22` }} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, display: "grid", placeItems: "center",
              fontSize: 11, color: "#fff", background: meta.c, fontFamily: "var(--mono)" }}>{meta.glyph}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: cardStyle === "minimal" ? "#667085" : meta.c }}>{meta.label}</span>
            <span style={{ flex: 1 }} />
            <span title={st.label} style={{ width: 8, height: 8, borderRadius: 999, background: st.dot, boxShadow: `0 0 0 3px ${st.dot}22` }} />
          </div>
        )}
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: "#1d2433",
          textDecoration: isDep ? "line-through" : "none", textWrap: "pretty" }}>{node.title}</div>
        {(node.priority || node.confidence != null) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            {node.priority && (
              <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: "var(--mono)", color: "#475467",
                background: "#f2f4f7", padding: "1px 6px", borderRadius: 5 }}>{node.priority}</span>
            )}
            {node.confidence != null && (
              <span style={{ fontSize: 10.5, color: "#98a2b3", fontFamily: "var(--mono)" }}>
                conf {node.confidence.toFixed(2)}
              </span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "#cbd2dc", fontFamily: "var(--mono)" }}>{node.id}</span>
          </div>
        )}
      </div>
      {/* connect handle */}
      <div className="acm-handle" data-handle={node.id}
        onPointerDown={(e) => onPointerDownHandle(e, node)}
        style={{ position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)",
          width: 14, height: 14, borderRadius: 999, background: "#fff", border: `2px solid ${meta.c}`,
          cursor: "crosshair", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }} />
    </div>
  );
}

export function GraphCanvas({ doc, selection, onSelect, onMoveNode, onCreateEdge, vp, setVp, cardStyle, showGrid, fitSignal, typeFilter }) {
  const wrapRef = useRef(null);
  const sizesRef = useRef({});
  const [sizes, setSizes] = useState({});
  const [drag, setDrag] = useState(null);        // node drag
  const [pan, setPan] = useState(null);
  const [conn, setConn] = useState(null);         // {from, to:{x,y}, hover}
  const measure = useCallback((id) => (el) => {
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const prev = sizesRef.current[id];
    if (!prev || prev.w !== w || prev.h !== h) {
      sizesRef.current[id] = { w, h };
      setSizes({ ...sizesRef.current });
    }
  }, []);

  const sz = (id) => sizes[id] || { w: 210, h: 64 };
  const screenToGraph = (sx, sy) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: (sx - r.left - vp.x) / vp.scale, y: (sy - r.top - vp.y) / vp.scale };
  };

  // ---- panning ----
  const onBgPointerDown = (e) => {
    if (e.target.dataset.bg === undefined) return;
    onSelect(null);
    setPan({ sx: e.clientX, sy: e.clientY, ox: vp.x, oy: vp.y });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  // ---- node drag ----
  const onPointerDownNode = (e, node) => {
    e.stopPropagation();
    onSelect({ kind: "node", id: node.id });
    const g = screenToGraph(e.clientX, e.clientY);
    setDrag({ id: node.id, dx: g.x - node.x, dy: g.y - node.y, moved: false });
  };
  // ---- connect ----
  const onPointerDownHandle = (e, node) => {
    e.stopPropagation();
    const g = screenToGraph(e.clientX, e.clientY);
    setConn({ from: node.id, to: g, hover: null });
  };

  useEffect(() => {
    if (!drag && !pan && !conn) return;
    const move = (e) => {
      if (pan) setVp((v) => ({ ...v, x: pan.ox + (e.clientX - pan.sx), y: pan.oy + (e.clientY - pan.sy) }));
      else if (drag) {
        const g = screenToGraph(e.clientX, e.clientY);
        onMoveNode(drag.id, Math.round(g.x - drag.dx), Math.round(g.y - drag.dy));
        if (!drag.moved) setDrag((d) => d && { ...d, moved: true });
      } else if (conn) {
        const g = screenToGraph(e.clientX, e.clientY);
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const host = el && el.closest && el.closest(".acm-node");
        const hover = host && host.dataset.node !== conn.from ? host.dataset.node : null;
        setConn({ ...conn, to: g, hover });
      }
    };
    const up = (e) => {
      if (conn) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const host = el && el.closest && el.closest(".acm-node");
        if (host && host.dataset.node !== conn.from) {
          onCreateEdge(conn.from, host.dataset.node, { x: e.clientX, y: e.clientY });
        }
      }
      setDrag(null); setPan(null); setConn(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag, pan, conn, vp]);

  // ---- wheel zoom ----
  const onWheel = (e) => {
    e.preventDefault();
    const r = wrapRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setVp((v) => {
      const ns = Math.min(2.2, Math.max(0.25, v.scale * factor));
      const k = ns / v.scale;
      return { scale: ns, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
    });
  };

  // wheel listener attached non-passively so preventDefault works (React onWheel is passive)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [vp]);

  // ---- fit to view ----
  useEffect(() => {
    if (!fitSignal) return;
    const r = wrapRef.current.getBoundingClientRect();
    if (!r.width) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of doc.nodes) {
      const s = sz(n.id);
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + s.w); maxY = Math.max(maxY, n.y + s.h);
    }
    if (!isFinite(minX)) return;
    const pad = 80;
    const scale = Math.min(1.4, (r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY));
    setVp({ scale, x: pad - minX * scale + (r.width - pad * 2 - (maxX - minX) * scale) / 2,
      y: pad - minY * scale + (r.height - pad * 2 - (maxY - minY) * scale) / 2 });
  }, [fitSignal]);

  const nodeMap = Object.fromEntries(doc.nodes.map((n) => [n.id, n]));
  const selId = selection?.id;
  const neighbor = new Set();
  if (selection?.kind === "node") {
    neighbor.add(selId);
    for (const e of doc.edges) { if (e.from === selId) neighbor.add(e.to); if (e.to === selId) neighbor.add(e.from); }
  }
  const isDimmed = (id) => {
    if (typeFilter) { const n = nodeMap[id]; if (n && n.type !== typeFilter) return true; }
    return selection?.kind === "node" && !neighbor.has(id);
  };

  // build edge geometry
  const edgeGeo = doc.edges.map((e) => {
    const a = nodeMap[e.from], b = nodeMap[e.to];
    if (!a || !b) return null;
    const sa = sz(e.from), sb = sz(e.to);
    const ca = { x: a.x + sa.w / 2, y: a.y + sa.h / 2 };
    const cb = { x: b.x + sb.w / 2, y: b.y + sb.h / 2 };
    const p1 = boxAnchor(a, sa.w, sa.h, cb.x, cb.y);
    const p2 = boxAnchor(b, sb.w, sb.h, ca.x, ca.y);
    return { e, d: edgePath(p1, p2), mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
  }).filter(Boolean);

  return (
    <div ref={wrapRef} data-bg style={{ position: "absolute", inset: 0, overflow: "hidden",
      cursor: pan ? "grabbing" : "default",
      background: showGrid ? "radial-gradient(#dfe3ea 1.1px, transparent 1.1px)" : "#fafbfc",
      backgroundSize: showGrid ? `${24 * vp.scale}px ${24 * vp.scale}px` : undefined,
      backgroundPosition: `${vp.x}px ${vp.y}px` }}
      onPointerDown={onBgPointerDown}>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0",
        transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.scale})` }} data-bg>
        <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none", left: 0, top: 0 }} data-bg>
          <defs>
            {RELATION_TYPES.map((t) => (
              <marker key={t} id={`arr-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={RELATION_META[t].c} />
              </marker>
            ))}
            <marker id="arr-temp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
            </marker>
          </defs>
          {edgeGeo.map(({ e, d }) => {
            const sel = selection?.kind === "edge" && selection.id === e.id;
            const dim = selection?.kind === "node" && !(e.from === selId || e.to === selId);
            const c = RELATION_META[e.type].c;
            const dash = e.status === "suggested" || e.status === "needs_validation";
            return (
              <g key={e.id} style={{ opacity: dim ? 0.18 : 1, transition: "opacity .15s" }}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onPointerDown={(ev) => { ev.stopPropagation(); onSelect({ kind: "edge", id: e.id }); }} />
                <path d={d} fill="none" stroke={sel ? c : c} strokeWidth={sel ? 2.6 : 1.6}
                  strokeDasharray={dash ? "6 5" : "none"} markerEnd={`url(#arr-${e.type})`}
                  style={{ filter: sel ? `drop-shadow(0 1px 4px ${c}77)` : "none", pointerEvents: "none" }} />
              </g>
            );
          })}
          {conn && (() => {
            const a = nodeMap[conn.from]; const sa = sz(conn.from);
            const p1 = boxAnchor(a, sa.w, sa.h, conn.to.x, conn.to.y);
            return <path d={edgePath(p1, conn.to)} fill="none" stroke="#94a3b8" strokeWidth={1.8}
              strokeDasharray="5 5" markerEnd="url(#arr-temp)" />;
          })()}
        </svg>
        {/* edge labels */}
        {edgeGeo.map(({ e, mid }) => {
          const dim = selection?.kind === "node" && !(e.from === selId || e.to === selId);
          const sel = selection?.kind === "edge" && selection.id === e.id;
          const c = RELATION_META[e.type].c;
          return (
            <div key={"l" + e.id} onPointerDown={(ev) => { ev.stopPropagation(); onSelect({ kind: "edge", id: e.id }); }}
              style={{ position: "absolute", left: mid.x, top: mid.y, transform: "translate(-50%,-50%)",
                fontSize: 10.5, fontWeight: 600, color: c, background: "#ffffffea", border: `1px solid ${sel ? c : "#e7e9ee"}`,
                padding: "1px 6px", borderRadius: 6, cursor: "pointer", pointerEvents: "auto", whiteSpace: "nowrap",
                opacity: dim ? 0.2 : 1, boxShadow: sel ? `0 1px 6px ${c}55` : "none" }}>
              {RELATION_META[e.type].label}{e.status === "suggested" ? " ·建议" : ""}
            </div>
          );
        })}
        {doc.nodes.map((n) => (
          <NodeCard key={n.id} node={n} cardStyle={cardStyle}
            selected={selection?.kind === "node" && selection.id === n.id}
            dimmed={isDimmed(n.id)} measureRef={measure(n.id)}
            onPointerDownNode={onPointerDownNode} onPointerDownHandle={onPointerDownHandle} />
        ))}
        {conn && conn.hover && (() => {
          const b = nodeMap[conn.hover]; const sb = sz(conn.hover);
          return <div style={{ position: "absolute", left: b.x - 3, top: b.y - 3, width: sb.w + 6, height: sb.h + 6,
            border: "2px solid #6366f1", borderRadius: 14, pointerEvents: "none", boxShadow: "0 0 0 4px #6366f122" }} />;
        })()}
      </div>
      <ZoomHud vp={vp} setVp={setVp} />
    </div>
  );
}

function ZoomHud({ vp, setVp }) {
  const btn = { width: 30, height: 30, display: "grid", placeItems: "center", border: "none", background: "transparent",
    cursor: "pointer", color: "#475467", fontSize: 16, borderRadius: 7 };
  const zoom = (f) => setVp((v) => ({ ...v, scale: Math.min(2.2, Math.max(0.25, v.scale * f)) }));
  return (
    <div style={{ position: "absolute", left: 16, bottom: 16, display: "flex", alignItems: "center", gap: 2,
      background: "#fff", border: "1px solid #e7e9ee", borderRadius: 10, padding: 3,
      boxShadow: "0 4px 14px -8px rgba(16,24,40,.25)" }}>
      <button style={btn} onClick={() => zoom(1 / 1.15)}>−</button>
      <span style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "#667085", width: 42, textAlign: "center" }}>{Math.round(vp.scale * 100)}%</span>
      <button style={btn} onClick={() => zoom(1.15)}>+</button>
    </div>
  );
}
