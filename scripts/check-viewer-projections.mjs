import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { layoutGraph, parseAcmMd } from "../src/acm/data.js";
import {
  filterProjection,
  focusNeighborhood,
  parseViewerHash,
  project,
  searchNodes,
  serializeViewerHash,
} from "../src/acm/project.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(scriptDir, "../skills/acm-md/examples/valid-viewer-views.acm.md");
const parsed = parseAcmMd(readFileSync(fixturePath, "utf8"));
assert.ok(parsed.doc, parsed.errors.join("; "));
const doc = parsed.doc;
const canonicalBefore = JSON.stringify(doc);

const structure = project(doc, "structure");
assert.equal(structure.viewId, "structure");
assert.equal(structure.nodeIds.length, 10);
assert.deepEqual(structure.edgeIds, ["edge_goal_renderer", "edge_renderer_viewer", "edge_renderer_editor"]);
assert.deepEqual(structure.options.layoutEdgeIds, structure.edgeIds);
assert.equal(structure.options.showAuxiliary, false);
const structureWithAuxiliary = project(doc, "structure", { showAuxiliary: true });
assert.equal(structureWithAuxiliary.edgeIds.length, 11);
assert.equal(structureWithAuxiliary.options.auxiliaryEdgeIds.length, 8);

const dependency = project(doc, "dependency");
assert.equal(dependency.nodeIds.length, 7);
assert.deepEqual(new Set(dependency.edgeIds), new Set([
  "edge_renderer_requires_viewer",
  "edge_viewer_browser",
  "edge_local_constrains_viewer",
  "edge_viewer_conflicts_editor",
  "edge_risk_impacts_viewer",
  "edge_local_constrains_question",
]));
assert.deepEqual(dependency.options.auxiliaryEdgeIds, ["edge_risk_impacts_viewer"]);
assert.ok(!dependency.options.layoutEdgeIds.includes("edge_risk_impacts_viewer"));
const dependencyWithoutAuxiliary = project(doc, "dependency", { showAuxiliary: false });
assert.equal(dependencyWithoutAuxiliary.nodeIds.length, 6);
assert.equal(dependencyWithoutAuxiliary.edgeIds.length, 5);
assert.deepEqual(dependencyWithoutAuxiliary.options.auxiliaryEdgeIds, []);

const inquiry = project(doc, "inquiry");
assert.deepEqual(new Set(inquiry.nodeIds), new Set([
  "feature_viewer",
  "constraint_local",
  "risk_runtime",
  "assumption_build_time",
  "question_format",
  "decision_static",
]));
assert.deepEqual(new Set(inquiry.edgeIds), new Set([
  "edge_local_constrains_viewer",
  "edge_risk_impacts_viewer",
  "edge_question_validates_assumption",
  "edge_decision_answers_question",
  "edge_local_constrains_question",
]));

const statusFiltered = filterProjection(doc, structure, { status: "needs_validation" });
assert.deepEqual(statusFiltered.nodeIds, ["risk_runtime", "question_format"]);
assert.deepEqual(statusFiltered.edgeIds, []);
const typeFiltered = filterProjection(doc, structure, { type: "Feature" });
assert.deepEqual(typeFiltered.nodeIds, ["feature_viewer", "feature_editor"]);

assert.deepEqual(searchNodes(doc, "OFFLINE"), ["goal_share_spec", "api_browser"]);
assert.deepEqual(searchNodes(doc, "feature_editor"), ["feature_editor"]);
assert.deepEqual(searchNodes(doc, "inquiry"), ["feature_viewer"]);
assert.deepEqual(searchNodes(doc, ""), []);

const empty = { nodes: [], edges: [] };
for (const viewId of ["structure", "dependency", "inquiry"]) {
  assert.deepEqual(project(empty, viewId).nodeIds, []);
  assert.deepEqual(project(empty, viewId).edgeIds, []);
}

const orphan = { nodes: [node("orphan", "Goal"), node("assumption", "Assumption")], edges: [] };
assert.deepEqual(project(orphan, "structure").nodeIds, ["orphan", "assumption"]);
assert.deepEqual(project(orphan, "dependency").nodeIds, []);
assert.deepEqual(project(orphan, "inquiry").nodeIds, ["assumption"]);

const cycle = {
  nodes: [node("a"), node("b"), node("c")],
  edges: [edge("ab", "a", "b"), edge("bc", "b", "c"), edge("ca", "c", "a")],
};
assert.equal(project(cycle, "dependency").edgeIds.length, 3);
assert.doesNotThrow(() => layoutGraph(cycle, { rankdir: "LR" }));
assert.equal(Object.keys(layoutGraph(cycle, { rankdir: "LR" })).length, 3);
assert.doesNotThrow(() => layoutGraph(empty, { rankdir: "LR" }));
assert.doesNotThrow(() => layoutGraph(orphan, { rankdir: "LR" }));

const chain = {
  nodes: [node("n0"), node("n1"), node("n2"), node("n3")],
  edges: [edge("e01", "n0", "n1"), edge("e12", "n1", "n2"), edge("e23", "n2", "n3")],
};
assert.deepEqual(focusNeighborhood(chain, "n0", 1).nodes, new Set(["n0", "n1"]));
assert.deepEqual(focusNeighborhood(chain, "n0", 2).nodes, new Set(["n0", "n1", "n2"]));
assert.deepEqual(focusNeighborhood(chain, "missing", 2).nodes, new Set());

assert.deepEqual(parseViewerHash("#view=dependency&node=feature_viewer"), {
  viewId: "dependency",
  nodeId: "feature_viewer",
});
assert.deepEqual(parseViewerHash("#view=unknown&node="), { viewId: "structure", nodeId: null });
assert.equal(
  serializeViewerHash({ viewId: "inquiry", nodeId: "question format" }),
  "#view=inquiry&node=question+format",
);
assert.deepEqual(
  parseViewerHash(serializeViewerHash({ viewId: "inquiry", nodeId: "question format" })),
  { viewId: "inquiry", nodeId: "question format" },
);

assert.equal(JSON.stringify(doc), canonicalBefore, "projection helpers mutated the canonical document");

console.log(JSON.stringify({
  ok: true,
  fixture: fixturePath,
  structure: { nodes: structure.nodeIds.length, edges: structure.edgeIds.length },
  dependency: { nodes: dependency.nodeIds.length, edges: dependency.edgeIds.length },
  inquiry: { nodes: inquiry.nodeIds.length, edges: inquiry.edgeIds.length },
  canonicalStable: true,
  edgeCases: ["empty", "orphan", "cycle", "focus-depth", "hash-roundtrip"],
}));

function node(id, type = "Feature") {
  return { id, type, title: id, status: "confirmed", tags: [] };
}

function edge(id, from, to, type = "depends_on") {
  return { id, from, to, type, status: "confirmed" };
}
