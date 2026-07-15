import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  HostCanaryWorkspaceError,
  inspectHostCanaryWorkspace,
} from "../../plugins/agent-context-map/scripts/check-host-canary-workspace.mjs";

const execFileAsync = promisify(execFile);
let base;

async function writeCanary(root, documentId = "acm_phase8_canary_a") {
  const directory = path.join(root, ".acm", "documents");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${documentId}.acm.md`), "# canary\n", "utf8");
}

beforeEach(async () => { base = await fs.mkdtemp(path.join(os.tmpdir(), "acm-host-canary-")); });
afterEach(async () => { await fs.rm(base, { recursive: true, force: true }); });

describe("Phase 8 host canary workspace preflight", () => {
  test("rejects a non-Git directory even when the ACM-MD fixture exists", async () => {
    await writeCanary(base);
    await expect(inspectHostCanaryWorkspace({
      projectRoot: base,
      documentId: "acm_phase8_canary_a",
    })).rejects.toMatchObject({ code: "non_git_workspace" });
  });

  test("rejects a nested path that is not the Git top-level workspace", async () => {
    await execFileAsync("git", ["init", "--quiet", base], { windowsHide: true });
    const nested = path.join(base, "nested");
    await writeCanary(nested);
    await expect(inspectHostCanaryWorkspace({
      projectRoot: nested,
      documentId: "acm_phase8_canary_a",
    })).rejects.toMatchObject({ code: "not_git_workspace_root" });
  });

  test("accepts an existing ACM-MD fixture at the Git top-level workspace", async () => {
    await execFileAsync("git", ["init", "--quiet", base], { windowsHide: true });
    await writeCanary(base);
    await expect(inspectHostCanaryWorkspace({
      projectRoot: base,
      documentId: "acm_phase8_canary_a",
    })).resolves.toEqual({
      ok: true,
      gitWorkspaceRootVerified: true,
      documentId: "acm_phase8_canary_a",
      projectRelativeDocument: ".acm/documents/acm_phase8_canary_a.acm.md",
    });
  });

  test("reports a missing fixture separately from workspace binding", async () => {
    await execFileAsync("git", ["init", "--quiet", base], { windowsHide: true });
    const promise = inspectHostCanaryWorkspace({ projectRoot: base, documentId: "missing" });
    await expect(promise).rejects.toBeInstanceOf(HostCanaryWorkspaceError);
    await expect(promise).rejects.toMatchObject({ code: "missing_canary_document" });
  });
});
