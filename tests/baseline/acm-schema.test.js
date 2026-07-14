import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { parseAcmMd, validateDoc } from "../../src/acm/data.js";

const fixture = (name) => resolve("tests/fixtures/acm-v0.1", name);
const readFixture = (name) => readFileSync(fixture(name), "utf8");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const validator = resolve("skills/acm-md/scripts/validate_acm_md.py");

describe("ACM-MD v0.1 baseline schema", () => {
  test("accepts the canonical valid fixture in JS and Python strict mode", () => {
    const parsed = parseAcmMd(readFixture("valid-basic.acm.md"));
    expect(parsed.errors).toEqual([]);
    expect(validateDoc(parsed.doc).filter((issue) => issue.level === "error")).toEqual([]);
    expect(() => execFileSync(python, [validator, fixture("valid-basic.acm.md"), "--mode", "strict"])).not.toThrow();
  });

  test.each([
    ["invalid-node-type.acm.md", "非法节点类型"],
    ["dangling-edge.acm.md", "悬空边"],
    ["duplicate-node-id.acm.md", "节点 id 重复"],
  ])("rejects %s", (name, message) => {
    const parsed = parseAcmMd(readFixture(name));
    expect(validateDoc(parsed.doc).some((issue) => issue.level === "error" && issue.msg.includes(message))).toBe(true);
    expect(() => execFileSync(python, [validator, fixture(name), "--mode", "strict"], { stdio: "pipe" })).toThrow();
  });

  test("tolerates multiple fences only as an import warning while strict validation rejects them", () => {
    const parsed = parseAcmMd(readFixture("multiple-fence.acm.md"));
    expect(parsed.warnings.some((warning) => warning.includes("2 个 acm 代码块"))).toBe(true);
    expect(() => execFileSync(python, [validator, fixture("multiple-fence.acm.md"), "--mode", "strict"], { stdio: "pipe" })).toThrow();
  });
});
