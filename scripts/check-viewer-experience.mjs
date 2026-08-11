#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NODE_TYPES, parseAcmMd, validateDoc } from "../src/acm/data.js";
import { filterProjection, project, searchNodes } from "../src/acm/project.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePaths = [
  "skills/acm-md/examples/retail-replenishment-pilot.acm.md",
  "skills/acm-md/examples/payment-ledger-migration.acm.md",
];
const reports = [];
const coveredTypes = new Set();
const coveredStatuses = new Set();

for (const relativePath of fixturePaths) {
  const parsed = parseAcmMd(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
  assert.ok(parsed.doc, parsed.errors.join("; "));
  assert.deepEqual(parsed.errors, []);
  const errors = validateDoc(parsed.doc).filter((issue) => issue.level === "error");
  assert.deepEqual(errors, []);
  for (const node of parsed.doc.nodes) {
    coveredTypes.add(node.type);
    coveredStatuses.add(node.status);
  }

  const structure = project(parsed.doc, "structure");
  const dependency = project(parsed.doc, "dependency");
  const inquiry = project(parsed.doc, "inquiry");
  assert.equal(structure.nodeIds.length, parsed.doc.nodes.length);
  assert.ok(structure.edgeIds.length > 0);
  assert.ok(dependency.nodeIds.length > 0 && dependency.edgeIds.length > 0);
  assert.ok(inquiry.nodeIds.length >= 6 && inquiry.edgeIds.length >= 4);
  assert.notDeepEqual(new Set(structure.edgeIds), new Set(dependency.edgeIds));
  assert.notDeepEqual(new Set(dependency.edgeIds), new Set(inquiry.edgeIds));

  const emptyProjection = filterProjection(parsed.doc, structure, { type: "Goal", status: "needs_validation" });
  assert.equal(emptyProjection.nodeIds.length, 0);
  assert.equal(emptyProjection.edgeIds.length, 0);
  assert.ok(searchNodes(parsed.doc, parsed.doc.nodes[0].title.slice(0, 4)).includes(parsed.doc.nodes[0].id));

  reports.push({
    path: relativePath,
    doc_id: parsed.doc.doc_id,
    canonical: { nodes: parsed.doc.nodes.length, edges: parsed.doc.edges.length },
    structure: { nodes: structure.nodeIds.length, edges: structure.edgeIds.length },
    dependency: { nodes: dependency.nodeIds.length, edges: dependency.edgeIds.length },
    inquiry: { nodes: inquiry.nodeIds.length, edges: inquiry.edgeIds.length },
    empty_state: "Goal + needs_validation => 0 nodes",
  });
}

assert.ok(coveredTypes.size >= 10, `Expected broad legend coverage, received ${coveredTypes.size} node types`);
assert.ok(coveredStatuses.has("confirmed"));
assert.ok(coveredStatuses.has("needs_validation"));
const invalidYaml = parseAcmMd('```acm\nschema_version: [\n```\n');
assert.equal(invalidYaml.doc, null);
assert.match(invalidYaml.errors.join("; "), /YAML/);
const invalidGraph = {
  schema_version: "acm-md/0.1",
  doc_id: "invalid_dangling_edge",
  meta: { title: "错误示例" },
  nodes: [{ id: "goal", type: "Goal", title: "目标", status: "confirmed", source: "test", confidence: 1 }],
  edges: [{ id: "dangling", from: "goal", to: "missing", type: "requires", status: "confirmed" }],
};
assert.ok(validateDoc(invalidGraph).some((issue) => issue.level === "error" && issue.msg.includes("悬空边")));

process.stdout.write(`${JSON.stringify({
  ok: true,
  fixtures: reports,
  legend: { node_types: [...coveredTypes].sort(), statuses: [...coveredStatuses].sort(), coverage: `${coveredTypes.size}/${NODE_TYPES.length}` },
  checklist: ["strict-source-shape", "three-distinct-views", "chinese-search", "legend-coverage", "empty-state", "invalid-yaml", "dangling-edge"],
})}\n`);
