import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { parseAcmMd, toAcmMd, validateDoc } from "../../src/acm/data.js";

const canonicalGraph = (doc) => ({
  schema_version: doc.schema_version,
  doc_id: doc.doc_id,
  meta: doc.meta,
  nodes: doc.nodes.map(({ x, y, ...node }) => node),
  edges: doc.edges,
});

describe("existing ACM-MD round trip", () => {
  test("exports one canonical acm block without changing graph semantics", () => {
    const source = readFileSync(resolve("tests/fixtures/acm-v0.1/valid-basic.acm.md"), "utf8");
    const first = parseAcmMd(source);
    const exported = toAcmMd(first.doc);
    const second = parseAcmMd(exported);

    expect(exported.match(/```acm/g)).toHaveLength(1);
    expect(exported).toContain('schema_version: "acm-md/0.1"');
    expect(second.errors).toEqual([]);
    expect(validateDoc(second.doc).filter((issue) => issue.level === "error")).toEqual([]);
    expect(canonicalGraph(second.doc)).toEqual(canonicalGraph(first.doc));
  });
});
