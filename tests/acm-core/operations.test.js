import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  adaptLegacyOperations,
  applyOperations,
  operationsToChangeSet,
  OPERATION_KINDS,
} from "../../packages/acm-core/src/index.js";

const readJson = (name) => JSON.parse(readFileSync(resolve("tests/fixtures/operations", name), "utf8"));

describe("canonical ACM operations", () => {
  test("applies every v1 operation kind atomically and projects to ACM-MD changes", () => {
    const fixture = readJson("canonical-operations.json");
    expect([...new Set(fixture.operations.map((operation) => operation.op))].sort()).toEqual([...OPERATION_KINDS].sort());
    const result = operationsToChangeSet(fixture.base, fixture.operations);
    expect(result.ok).toBe(true);
    expect(result.doc.nodes.map((node) => node.id)).toEqual(fixture.expected.nodeIds);
    expect(result.doc.edges.map((edge) => edge.id)).toEqual(fixture.expected.edgeIds);
    expect(result.doc.nodes.find((node) => node.id === "module_001").title).toBe(fixture.expected.moduleTitle);
    expect(result.doc.edges.find((edge) => edge.id === "edge_update").reason).toBe(fixture.expected.edgeReason);
    const moduleNode = result.doc.nodes.find((node) => node.id === "module_001");
    expect({ x: moduleNode.x, y: moduleNode.y }).toEqual(fixture.expected.moduleLayout);
    for (const [bucket, count] of Object.entries(fixture.expected.changeBuckets)) expect(result.changeSet[bucket]).toHaveLength(count);
  });

  test("adapts only the three approved legacy input names and emits diagnostics", () => {
    const fixture = readJson("legacy-operations.json");
    const adapted = adaptLegacyOperations(fixture.operations);
    expect(adapted.operations.map((operation) => operation.op)).toEqual(fixture.expectedKinds);
    expect(adapted.diagnostics).toHaveLength(3);
    expect(adapted.diagnostics.every((entry) => entry.code === fixture.expectedDiagnosticCode)).toBe(true);
    expect(JSON.stringify(adapted.operations)).not.toMatch(/add_node|update_node|add_edge/);
  });

  test("rejects removeNode while incident edges remain and leaves the input untouched", () => {
    const fixture = readJson("canonical-operations.json");
    const before = JSON.stringify(fixture.base);
    const result = applyOperations(fixture.base, [{ id: "unsafe", op: "removeNode", nodeId: "feature_001" }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === "node_has_edges")).toBe(true);
    expect(JSON.stringify(fixture.base)).toBe(before);
  });

  test("does not admit patchMeta into the model-visible operation schema", () => {
    const fixture = readJson("canonical-operations.json");
    const result = applyOperations(fixture.base, [{ id: "meta", op: "patchMeta", fields: { title: "forbidden" } }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === "invalid_operation_kind")).toBe(true);
  });
});
