import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createMcpHarness, trustedMeta } from "./mcp-harness.js";

export async function createPhase6Harness({ text = null, documentId = "acm_baseline_001", task = "phase6-task" } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "acm-phase6-"));
  await fs.mkdir(path.join(root, ".acm", "documents"), { recursive: true });
  const source = text || await fs.readFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", "utf8");
  const filePath = path.join(root, ".acm", "documents", `${documentId}.acm.md`);
  await fs.writeFile(filePath, source);
  const harness = createMcpHarness({ roots: [{ uri: pathToFileURL(root).href }] });
  await harness.initialize();
  const meta = trustedMeta(root, task);
  return {
    root, filePath, harness, meta, documentId,
    async close() { await harness.close(); await fs.rm(root, { recursive: true, force: true }); },
  };
}

export async function openReady(fixture) {
  const opened = await fixture.harness.callTool("open_agent_context_map", { documentId: fixture.documentId, mode: "edit" }, fixture.meta);
  const openAttemptId = opened.result.structuredContent.data.openAttemptId;
  const bootstrapNonce = opened.result._meta.widgetData.bootstrapNonce;
  const revision = opened.result.structuredContent.documentRevision;
  const bootstrapped = await fixture.harness.callTool("agent_context_map_widget_bootstrap", { openAttemptId, clientMountId: "phase6_mount", bootstrapNonce }, fixture.meta);
  const widgetInstanceId = bootstrapped.result.structuredContent.data.widgetInstanceId;
  const appSessionNonce = bootstrapped.result._meta.widgetData.appSessionNonce;
  const app = { openAttemptId, widgetInstanceId, appSessionNonce };
  const ready = await fixture.harness.callTool("agent_context_map_widget_ready", {
    ...app, proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: true, documentId: fixture.documentId },
  }, fixture.meta);
  if (!ready.result.structuredContent.ok) throw new Error(JSON.stringify(ready.result.structuredContent.error));
  return Object.defineProperty(app, "revision", { value: revision, enumerable: false });
}

export const suggestedNodeOperation = (suffix = "002") => ({
  id: `op_add_${suffix}`, op: "addNode",
  node: { id: `feature_${suffix}`, type: "Feature", title: `Suggested ${suffix}`, status: "suggested", source: "agent", confidence: 0.7, x: 480, y: 120 },
});
