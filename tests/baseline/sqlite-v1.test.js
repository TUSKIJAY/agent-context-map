import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { validateDoc } from "../../src/acm/data.js";

describe("legacy SQLite v1 baseline", () => {
  test("preserves the current JSON-blob document row shape as a migration fixture", () => {
    const row = JSON.parse(readFileSync(resolve("tests/fixtures/sqlite-v1/document-row.json"), "utf8"));
    const doc = JSON.parse(row.body);

    expect(row.doc_id).toBe(doc.doc_id);
    expect(row.base_snapshot).toBeNull();
    expect(validateDoc(doc).filter((issue) => issue.level === "error")).toEqual([]);
  });
});
