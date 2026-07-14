import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  buildChangeSet,
  buildExecutionPrompt,
  computeDocumentRevision,
  diffDoc,
  parseAcmMd,
  selectSubgraph,
  toAcmMd,
  toExportDoc,
  validateAcmMd,
} from "../../packages/acm-core/src/index.js";

const fixture = (name) => readFileSync(resolve("tests/fixtures/acm-v0.1", name), "utf8");

describe("acm-core parse, serialize, revision, and context", () => {
  test("strictly parses and deterministically round-trips the legal fixture", async () => {
    const source = fixture("valid-basic.acm.md");
    const first = parseAcmMd(source, { mode: "strict" });
    expect(first.errors).toEqual([]);
    const serializedA = toAcmMd(first.doc);
    const serializedB = toAcmMd(first.doc);
    expect(serializedA).toBe(serializedB);

    const second = parseAcmMd(serializedA, { mode: "strict" });
    expect(second.errors).toEqual([]);
    expect(toExportDoc(second.doc)).toEqual(toExportDoc(first.doc));
    expect(await computeDocumentRevision(first.doc)).toBe(await computeDocumentRevision(first.doc));

    const reordered = structuredClone(first.doc);
    reordered.meta = Object.fromEntries(Object.entries(reordered.meta).reverse());
    if (reordered.validation) reordered.validation = Object.fromEntries(Object.entries(reordered.validation).reverse());
    expect(toAcmMd(reordered)).toBe(serializedA);
  });

  test("strict parsing rejects multiple fences instead of silently choosing one", () => {
    const result = validateAcmMd(fixture("multiple-fence.acm.md"), { mode: "strict" });
    expect(result.errors.some((entry) => entry.code === "parse_error")).toBe(true);
  });

  test("builds deterministic changes and bounded execution context", () => {
    const doc = parseAcmMd(fixture("valid-basic.acm.md"), { mode: "strict" }).doc;
    const current = structuredClone(doc);
    current.nodes[0].title = "Changed title";
    const delta = diffDoc(doc, current);
    expect(buildChangeSet(doc, current, delta)).toEqual(buildChangeSet(doc, current, delta));

    const subgraph = selectSubgraph(doc, [doc.nodes[0].id], { maxNodes: 2, maxEdges: 2, maxDepth: 1 });
    expect(subgraph.nodes.length).toBeLessThanOrEqual(2);
    const execution = buildExecutionPrompt(doc, doc.nodes.filter((node) => node.type === "Task").map((node) => node.id));
    expect(execution.ok).toBe(false);
    expect(execution.error).toBe("no_selected_task");
  });

  test("has no platform, UI, storage, or layout-engine imports", () => {
    const root = resolve("packages/acm-core/src");
    const source = readdirSync(root).filter((name) => name.endsWith(".js")).map((name) => readFileSync(resolve(root, name), "utf8")).join("\n");
    expect(source).not.toMatch(/from\s+["'](?:react|@tauri|@dagrejs|elkjs|node:fs|node:path|node:crypto|.*sqlite)/i);
    expect(source).not.toMatch(/\b(?:window|document|localStorage|__TAURI_INTERNALS__)\b/);
  });
});
