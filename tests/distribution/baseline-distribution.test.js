import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("pre-plugin distribution baseline", () => {
  test("keeps the root package local-only and free of path-based runtime dependencies", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

    expect(pkg.private).toBe(true);
    expect(Object.values(dependencies).some((value) => /^(file:|link:|[A-Za-z]:\\|\/)/.test(value))).toBe(false);
  });
});
