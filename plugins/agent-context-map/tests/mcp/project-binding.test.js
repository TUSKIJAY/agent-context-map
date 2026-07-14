import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createMcpHarness, trustedMeta } from "../helpers/mcp-harness.js";

let base;
let rootA;
let rootB;
let validText;
const harnesses = new Set();

async function hashAcm(root) {
  const bytes = await fs.readFile(path.join(root, ".acm", "sentinel"));
  return createHash("sha256").update(bytes).digest("hex");
}

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "acm-project-binding-"));
  rootA = path.join(base, "a"); rootB = path.join(base, "b");
  for (const root of [rootA, rootB]) {
    await fs.mkdir(path.join(root, ".acm"), { recursive: true });
    await fs.writeFile(path.join(root, ".acm", "sentinel"), `${path.basename(root)}\n`);
  }
  validText = await fs.readFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", "utf8");
});
afterEach(async () => {
  await Promise.all([...harnesses].map((harness) => harness.close()));
  harnesses.clear();
  await fs.rm(base, { recursive: true, force: true });
});

describe("Phase 4 trusted project binding", () => {
  test("fails closed without both host-owned task and workspace evidence", async () => {
    const harness = createMcpHarness(); harnesses.add(harness); await harness.initialize();
    const noEvidence = await harness.callTool("validate_acm_graph", { acmMdText: validText });
    expect(noEvidence.result.structuredContent).toMatchObject({ ok: false, error: { code: "no_trusted_workspace" } });
    harness.setRoots([{ uri: pathToFileURL(rootA).href }]);
    const noTask = await harness.callTool("validate_acm_graph", { acmMdText: validText });
    expect(noTask.result.structuredContent.error.code).toBe("no_trusted_workspace");
  });

  test("rejects forged identity arguments and leaves .acm unchanged", async () => {
    const before = await hashAcm(rootA);
    const harness = createMcpHarness({ roots: [{ uri: pathToFileURL(rootA).href }] }); harnesses.add(harness); await harness.initialize();
    const result = await harness.callTool("validate_acm_graph", { acmMdText: validText, projectPath: rootB, threadId: "forged" }, trustedMeta(rootA, "real-task"));
    expect(result.result.structuredContent).toMatchObject({ ok: false, projectId: null, error: { code: "invalid_arguments" } });
    expect(JSON.stringify(result)).not.toContain(rootB);
    expect(await hashAcm(rootA)).toBe(before);
  });

  test("isolates tasks, preserves same-task binding, and rejects same-task root changes", async () => {
    const harness = createMcpHarness({ roots: [{ uri: pathToFileURL(rootA).href }] }); harnesses.add(harness); await harness.initialize();
    const first = await harness.callTool("validate_acm_graph", { acmMdText: validText }, trustedMeta(rootA, "task-a"));
    const secondTask = await harness.callTool("validate_acm_graph", { acmMdText: validText }, trustedMeta(rootA, "task-b"));
    const oldTaskAgain = await harness.callTool("validate_acm_graph", { acmMdText: validText }, trustedMeta(rootA, "task-a"));
    expect(first.result.structuredContent.projectId).toBe(secondTask.result.structuredContent.projectId);
    expect(first.result.structuredContent.sessionId).not.toBe(secondTask.result.structuredContent.sessionId);
    expect(oldTaskAgain.result.structuredContent.sessionId).toBe(first.result.structuredContent.sessionId);

    harness.setRoots([{ uri: pathToFileURL(rootB).href }]);
    const rebound = await harness.callTool("validate_acm_graph", { acmMdText: validText }, trustedMeta(rootB, "task-a"));
    expect(rebound.result.structuredContent).toMatchObject({ ok: false, error: { code: "project_binding_mismatch" } });
  });

  test("keeps multiple host roots fail closed pending a trusted native picker", async () => {
    const harness = createMcpHarness(); harnesses.add(harness); await harness.initialize();
    const meta = trustedMeta(rootA, "multi-root");
    meta["x-codex-turn-metadata"].workspaces[rootB] = { has_changes: false };
    const result = await harness.callTool("validate_acm_graph", { acmMdText: validText }, meta);
    expect(result.result.structuredContent).toMatchObject({ ok: false, error: { code: "trusted_native_picker_required" } });
  });
});
