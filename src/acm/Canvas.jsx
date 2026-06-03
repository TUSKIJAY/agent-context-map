// Canvas.jsx — interactive graph canvas: pan, zoom, drag nodes, draw edges, connect-to-create.
// Ported from the design prototype (canvas.jsx); window globals → ES imports.
import React from "react";
import { NODE_TYPE_META, STATUS_META, RELATION_TYPES, RELATION_META, typeLabel } from "./data.js";

const { useRef, useState, useEffect, useCallback } = React;

const SIDE_VEC = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function chooseSides(a, sa, b, sb) {
  const ca = { x: a.x + sa.w / 2, y: a.y + sa.h / 2 };
  const cb = { x: b.x + sb.w / 2, y: b.y + sb.h / 2 };
  if (cb.x > ca.x + 20) {
    return b.x - (a.x + sa.w) >= 8
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "left" };
  }
  if (cb.x < ca.x - 20) {
    return a.x - (b.x + sb.w) >= 8
      ? { fromSide: "left", toSide: "right" }
      : { fromSide: "right", toSide: "right" };
  }
  const dx = cb.x - ca.x, dy = cb.y - ca.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { fromSide: "right", toSide: "left" } : { fromSide: "left", toSide: "right" };
  }
  return dy >= 0 ? { fromSide: "bottom", toSide: "top" } : { fromSide: "top", toSide: "bottom" };
}

function portFor(node, w, h, side, offset = 0) {
  if (side === "left" || side === "right") {
    const margin = Math.min(8, h / 2);
    const overflow = Math.min(34, Math.max(0, Math.abs(offset) - h / 3));
    const minY = node.y + margin - overflow;
    const maxY = node.y + h - margin + overflow;
    return { x: side === "left" ? node.x : node.x + w, y: clamp(node.y + h / 2 + offset, minY, maxY) };
  }
  const margin = 18;
  const overflow = Math.min(34, Math.max(0, Math.abs(offset) - w / 3));
  const minX = node.x + Math.min(margin, w / 2) - overflow;
  const maxX = node.x + w - Math.min(margin, w / 2) + overflow;
  return { x: clamp(node.x + w / 2 + offset, minX, maxX), y: side === "top" ? node.y : node.y + h };
}

function bboxOf(node, size, pad = 10) {
  return { left: node.x - pad, top: node.y - pad, right: node.x + size.w + pad, bottom: node.y + size.h + pad };
}

function pointInBox(p, box) {
  return p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;
}

function facingGap(p1, p2, fromSide, toSide) {
  if (fromSide === "right" && toSide === "left") return p2.x - p1.x;
  if (fromSide === "left" && toSide === "right") return p1.x - p2.x;
  if (fromSide === "bottom" && toSide === "top") return p2.y - p1.y;
  if (fromSide === "top" && toSide === "bottom") return p1.y - p2.y;
  return null;
}

function cubicPoint(a, c1, c2, b, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x,
    y: mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y,
  };
}

function curvePath(segments) {
  if (!segments.length) return "";
  let d = `M ${segments[0].a.x} ${segments[0].a.y}`;
  for (const s of segments) d += ` C ${s.c1.x} ${s.c1.y}, ${s.c2.x} ${s.c2.y}, ${s.b.x} ${s.b.y}`;
  return d;
}

function curveSamples(segments, steps = 26) {
  const samples = [];
  for (const s of segments) {
    for (let i = 0; i <= steps; i++) samples.push(cubicPoint(s.a, s.c1, s.c2, s.b, i / steps));
  }
  return samples;
}

function curveHitCount(segments, obstacles) {
  let hits = 0;
  const samples = curveSamples(segments, 30);
  for (let i = 2; i < samples.length - 2; i++) {
    for (const box of obstacles) if (pointInBox(samples[i], box)) { hits++; break; }
  }
  return hits;
}

function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function curveOverlapCount(samples, routed, threshold = 11) {
  const limit = threshold * threshold;
  let overlaps = 0;
  for (let i = 4; i < samples.length - 4; i += 2) {
    for (const route of routed) {
      const other = route.samples;
      for (let j = 4; j < other.length - 4; j += 2) {
        if (dist2(samples[i], other[j]) <= limit) {
          overlaps++;
          break;
        }
      }
    }
  }
  return overlaps;
}

function curveLabelPoint(segments, obstacles) {
  const samples = curveSamples(segments, 34);
  const mid = samples[Math.floor(samples.length / 2)] || segments[0]?.a || { x: 0, y: 0 };
  if (!obstacles.some((box) => pointInBox(mid, box))) return mid;
  for (let delta = 1; delta < samples.length / 2; delta++) {
    const a = samples[Math.floor(samples.length / 2) - delta];
    const b = samples[Math.floor(samples.length / 2) + delta];
    if (a && !obstacles.some((box) => pointInBox(a, box))) return a;
    if (b && !obstacles.some((box) => pointInBox(b, box))) return b;
  }
  return mid;
}

function naturalSegment(a, b, fromSide, toSide, tension = 1) {
  const fromV = SIDE_VEC[fromSide], toV = SIDE_VEC[toSide];
  const gap = facingGap(a, b, fromSide, toSide);
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  let k = clamp(Math.max(dx, dy) * 0.42 * tension, 34, 150);
  if (gap > 0) k = clamp(gap * 0.58 * tension, 12, 150);
  return {
    a,
    c1: { x: a.x + fromV.x * k, y: a.y + fromV.y * k },
    c2: { x: b.x + toV.x * k, y: b.y + toV.y * k },
    b,
  };
}

function organicViaRoute(p1, p2, fromSide, toSide, bounds, bias = 0) {
  const horizontal = fromSide === "left" || fromSide === "right" || toSide === "left" || toSide === "right";
  const candidates = [];
  const sameSide = fromSide === toSide;

  if (sameSide && (fromSide === "right" || fromSide === "left")) {
    const dir = fromSide === "right" ? 1 : -1;
    const outerBase = dir > 0 ? Math.max(p1.x, p2.x, bounds.right) : Math.min(p1.x, p2.x, bounds.left);
    const lane = outerBase + dir * (64 + Math.abs(bias) * 28);
    const k1 = Math.abs(lane - p1.x);
    const k2 = Math.abs(lane - p2.x);
    candidates.push([{
      a: p1,
      c1: { x: p1.x + dir * k1, y: p1.y },
      c2: { x: p2.x + dir * k2, y: p2.y },
      b: p2,
    }]);
    candidates.push([{
      a: p1,
      c1: { x: p1.x + dir * (k1 + 38), y: p1.y + bias * 10 },
      c2: { x: p2.x + dir * (k2 + 38), y: p2.y - bias * 10 },
      b: p2,
    }]);
    return candidates;
  }

  if (sameSide && (fromSide === "top" || fromSide === "bottom")) {
    const dir = fromSide === "bottom" ? 1 : -1;
    const outerBase = dir > 0 ? Math.max(p1.y, p2.y, bounds.bottom) : Math.min(p1.y, p2.y, bounds.top);
    const lane = outerBase + dir * (64 + Math.abs(bias) * 28);
    const k1 = Math.abs(lane - p1.y);
    const k2 = Math.abs(lane - p2.y);
    candidates.push([{
      a: p1,
      c1: { x: p1.x, y: p1.y + dir * k1 },
      c2: { x: p2.x, y: p2.y + dir * k2 },
      b: p2,
    }]);
    return candidates;
  }

  if (horizontal) {
    const bow = 44 + Math.abs(bias) * 16;
    const dy = p2.y - p1.y;
    const side = Math.sign(dy || 1);
    candidates.push([{
      a: p1,
      c1: { x: p1.x + SIDE_VEC[fromSide].x * bow, y: p1.y },
      c2: { x: p2.x + SIDE_VEC[toSide].x * bow, y: p2.y },
      b: p2,
    }]);
    const softLaneY = (p1.y + p2.y) / 2 + side * (64 + Math.abs(bias) * 18);
    const laneYs = [
      (p1.y + p2.y) / 2 + bias * 10,
      softLaneY,
      Math.min(p1.y, p2.y, bounds.top) - 56 - Math.max(0, bias) * 18,
      Math.max(p1.y, p2.y, bounds.bottom) + 56 + Math.max(0, -bias) * 18,
    ];
    for (const laneY of laneYs) {
      candidates.push([{
        a: p1,
        c1: { x: p1.x + SIDE_VEC[fromSide].x * bow, y: laneY },
        c2: { x: p2.x + SIDE_VEC[toSide].x * bow, y: laneY },
        b: p2,
      }]);
    }
  }
  return candidates;
}

function edgeRoute(p1, p2, fromSide, toSide, obstacles, bounds, routed = [], bias = 0) {
  const sameSide = fromSide === toSide;
  const candidates = sameSide ? [] : [
    [naturalSegment(p1, p2, fromSide, toSide, 0.9)],
    [naturalSegment(p1, p2, fromSide, toSide, 1.15)],
    [naturalSegment(p1, p2, fromSide, toSide, 0.65)],
  ];
  candidates.push(
    ...organicViaRoute(p1, p2, fromSide, toSide, bounds, bias),
    ...organicViaRoute(p1, p2, fromSide, toSide, bounds, bias > 0 ? bias + 1 : bias - 1),
  );
  if (!candidates.length) candidates.push([naturalSegment(p1, p2, fromSide, toSide, 0.9)]);
  let best = candidates[0], bestHits = Infinity, bestSamples = curveSamples(best, 30), bestOverlap = Infinity, bestScore = Infinity;
  for (const segments of candidates) {
    const samples = curveSamples(segments, 30);
    const hits = curveHitCount(segments, obstacles);
    const overlaps = curveOverlapCount(samples, routed);
    const bends = Math.max(0, segments.length - 1);
    const score = hits * 100000 + overlaps * 5000 + bends * 6;
    if (score < bestScore) {
      best = segments;
      bestHits = hits;
      bestOverlap = overlaps;
      bestSamples = samples;
      bestScore = score;
    }
    if (hits === 0 && overlaps === 0) break;
  }
  return { d: curvePath(best), mid: curveLabelPoint(best, obstacles), hits: bestHits, overlaps: bestOverlap, samples: bestSamples };
}

function tempEdgePath(node, size, to) {
  const pseudo = { x: to.x - 1, y: to.y - 1 };
  const sides = chooseSides(node, size, pseudo, { w: 2, h: 2 });
  const p1 = portFor(node, size.w, size.h, sides.fromSide);
  const p2 = to;
  const v = SIDE_VEC[sides.fromSide];
  const stub = 40;
  const near = { x: p1.x + v.x * stub, y: p1.y + v.y * stub };
  return curvePath([naturalSegment(p1, near, sides.fromSide, sides.fromSide, 0.55), naturalSegment(near, p2, sides.fromSide, sides.toSide, 0.75)]);
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
    borderWidth: 1, borderStyle: node.status === "suggested" ? "dashed" : "solid",
    borderColor: selected ? meta.c : "#e7e9ee",
    opacity: dimmed ? 0.35 : 1, transition: "opacity .15s, box-shadow .12s",
    userSelect: "none", overflow: "hidden",
  };

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
              <span style={{ fontFamily: "var(--mono)" }}>{meta.glyph}</span>{typeLabel(node.type)}
            </span>
            <span style={{ flex: 1 }} />
            <span title={st.label} style={{ width: 8, height: 8, borderRadius: 999, background: st.dot, boxShadow: `0 0 0 3px ${st.dot}22` }} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, display: "grid", placeItems: "center",
              fontSize: 11, color: "#fff", background: meta.c, fontFamily: "var(--mono)" }}>{meta.glyph}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: cardStyle === "minimal" ? "#667085" : meta.c }}>{typeLabel(node.type)}</span>
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
  const observersRef = useRef({});
  const [drag, setDrag] = useState(null);        // node drag
  const [pan, setPan] = useState(null);
  const [conn, setConn] = useState(null);         // {from, to:{x,y}, hover}
  const measure = useCallback((id) => (el) => {
    observersRef.current[id]?.disconnect?.();
    delete observersRef.current[id];
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const prev = sizesRef.current[id];
      if (!prev || prev.w !== w || prev.h !== h) {
        sizesRef.current[id] = { w, h };
        setSizes({ ...sizesRef.current });
      }
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      observersRef.current[id] = ro;
    }
  }, []);

  useEffect(() => () => {
    Object.values(observersRef.current).forEach((ro) => ro.disconnect?.());
    observersRef.current = {};
  }, []);

  const sz = (id) => sizesRef.current[id] || sizes[id] || { w: 210, h: 92 };
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

  const nodeBounds = Object.fromEntries(doc.nodes.map((n) => [n.id, bboxOf(n, sz(n.id))]));
  const measuredCount = doc.nodes.filter((n) => sizesRef.current[n.id]).length;
  const edgesReady = measuredCount >= doc.nodes.length;
  const graphBounds = doc.nodes.reduce((acc, n) => {
    const box = nodeBounds[n.id];
    return {
      left: Math.min(acc.left, box.left),
      top: Math.min(acc.top, box.top),
      right: Math.max(acc.right, box.right),
      bottom: Math.max(acc.bottom, box.bottom),
    };
  }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

  const edgeDrafts = doc.edges.map((e, order) => {
    const a = nodeMap[e.from], b = nodeMap[e.to];
    if (!a || !b) return null;
    const sa = sz(e.from), sb = sz(e.to);
    const sides = chooseSides(a, sa, b, sb);
    return { e, order, a, b, sa, sb, ...sides };
  }).filter(Boolean);

  const sideGroups = {};
  for (const r of edgeDrafts) {
    (sideGroups[`${r.e.from}:${r.fromSide}`] ||= []).push(r);
    (sideGroups[`${r.e.to}:${r.toSide}`] ||= []).push(r);
  }
  Object.values(sideGroups).forEach((group) => group.sort((a, b) => a.order - b.order));
  const portOffset = (id, side, row) => {
    const group = sideGroups[`${id}:${side}`] || [];
    const idx = group.findIndex((r) => r.e.id === row.e.id);
    return (idx - (group.length - 1) / 2) * 18;
  };

  // build edge geometry. Routes are selected sequentially so later edges can
  // avoid already chosen curves instead of stacking on the same lane.
  const routed = [];
  const edgeGeo = [];
  for (const row of edgeDrafts) {
    const p1 = portFor(row.a, row.sa.w, row.sa.h, row.fromSide, portOffset(row.e.from, row.fromSide, row));
    const p2 = portFor(row.b, row.sb.w, row.sb.h, row.toSide, portOffset(row.e.to, row.toSide, row));
    const obstacles = doc.nodes
      .filter((n) => n.id !== row.e.from && n.id !== row.e.to)
      .map((n) => nodeBounds[n.id]);
    const bias = clamp(portOffset(row.e.from, row.fromSide, row) / 18, -4, 4);
    const route = edgeRoute(p1, p2, row.fromSide, row.toSide, obstacles, graphBounds, routed, bias);
    edgeGeo.push({ e: row.e, d: route.d, mid: route.mid, routeHits: route.hits, routeOverlaps: route.overlaps });
    routed.push({ edgeId: row.e.id, samples: route.samples });
  }

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
          {edgesReady && edgeGeo.map(({ e, d, routeHits, routeOverlaps }) => {
            const sel = selection?.kind === "edge" && selection.id === e.id;
            const dim = selection?.kind === "node" && !(e.from === selId || e.to === selId);
            const c = RELATION_META[e.type].c;
            const dash = e.status === "suggested" || e.status === "needs_validation";
            return (
              <g key={e.id} style={{ opacity: dim ? 0.18 : 1, transition: "opacity .15s" }}>
                <path data-edge={e.id} data-route-hits={routeHits} data-route-overlaps={routeOverlaps} d={d} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onPointerDown={(ev) => { ev.stopPropagation(); onSelect({ kind: "edge", id: e.id }); }} />
                <path data-edge={e.id} data-route-hits={routeHits} data-route-overlaps={routeOverlaps} d={d} fill="none" stroke={sel ? c : c} strokeWidth={sel ? 2.6 : 1.6}
                  strokeDasharray={dash ? "6 5" : "none"} markerEnd={`url(#arr-${e.type})`}
                  style={{ filter: sel ? `drop-shadow(0 1px 4px ${c}77)` : "none", pointerEvents: "none" }} />
              </g>
            );
          })}
          {conn && (() => {
            const a = nodeMap[conn.from]; const sa = sz(conn.from);
            return <path d={tempEdgePath(a, sa, conn.to)} fill="none" stroke="#94a3b8" strokeWidth={1.8}
              strokeDasharray="5 5" markerEnd="url(#arr-temp)" />;
          })()}
        </svg>
        {/* edge labels */}
        {edgesReady && edgeGeo.map(({ e, mid }) => {
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
