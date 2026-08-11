#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildPortableSvg } from "../src/acm/export-svg.js";

const doc = {
  doc_id: "portable_svg_smoke",
  meta: { title: "SVG 交付 & 验收" },
  nodes: [
    { id: "goal", type: "Goal", title: "离线交付", status: "confirmed", confidence: 1 },
    { id: "feature", type: "Feature", title: "可见的纯 SVG", status: "needs_validation", confidence: 0.9 },
  ],
  edges: [
    { id: "edge", from: "goal", to: "feature", type: "requires", status: "confirmed" },
  ],
};
const nodes = [
  { id: "goal", position: { x: 0, y: 0 }, measured: { width: 210, height: 92 }, data: { node: doc.nodes[0] } },
  { id: "feature", position: { x: 320, y: 120 }, measured: { width: 210, height: 92 }, data: { node: doc.nodes[1] } },
];
const edges = [{ id: "edge", source: "goal", target: "feature", label: "需要", style: { stroke: "#7c3aed", strokeWidth: 1.5, opacity: 0.9 } }];
const svg = buildPortableSvg({ doc, nodes, edges });
const repeated = buildPortableSvg({ doc, nodes, edges });

assert.equal(svg, repeated);
assert.match(svg, /^<svg /);
assert.match(svg, /data-acm-export="portable-svg-v1"/);
assert.match(svg, /fill="#ffffff"/);
assert.match(svg, /id="node-goal"/);
assert.match(svg, /id="node-feature"/);
assert.match(svg, /<path /);
assert.match(svg, /SVG 交付 &amp; 验收/);
assert.doesNotMatch(svg, /foreignObject/i);
assert.doesNotMatch(svg, /<script/i);

process.stdout.write(`${JSON.stringify({
  ok: true,
  bytes: Buffer.byteLength(svg),
  sha256: createHash("sha256").update(svg).digest("hex"),
  nodes: nodes.length,
  edges: edges.length,
  portable: true,
})}\n`);
