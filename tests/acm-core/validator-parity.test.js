import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { validateAcmMd } from "../../packages/acm-core/src/index.js";

const cases = [
  ["valid-basic.acm.md", false],
  ["invalid-node-type.acm.md", true],
  ["dangling-edge.acm.md", true],
  ["duplicate-node-id.acm.md", true],
  ["multiple-fence.acm.md", true],
  ["legacy-schema.acm.md", true],
  ["missing-doc-id.acm.md", true],
  ["invalid-changes.acm.md", true],
];

describe("JavaScript and Python strict validator parity", () => {
  test.each(cases)("matches strict error severity for %s", (name, expectedError) => {
    const path = resolve("tests/fixtures/acm-v0.1", name);
    const js = validateAcmMd(readFileSync(path, "utf8"), { mode: "strict" });
    const python = spawnSync("python", ["skills/acm-md/scripts/validate_acm_md.py", path, "--mode", "strict"], {
      cwd: resolve("."),
      encoding: "utf8",
    });
    expect(Boolean(js.errors.length), JSON.stringify(js.errors, null, 2)).toBe(expectedError);
    expect(python.status !== 0, `${python.stdout}\n${python.stderr}`).toBe(expectedError);
  });
});
