import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createMcpHarness, trustedMeta } from "../helpers/mcp-harness.js";

let root;
let harness;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "acm-widget-lifecycle-"));
  await fs.mkdir(path.join(root, ".acm", "documents"), { recursive: true });
  const text = await fs.readFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", "utf8");
  await fs.writeFile(path.join(root, ".acm", "documents", "acm_baseline_001.acm.md"), text);
  harness = createMcpHarness({ roots: [{ uri: pathToFileURL(root).href }] });
  await harness.initialize();
});

afterEach(async () => {
  await harness.close();
  await fs.rm(root, { recursive: true, force: true });
});

describe("Phase 5 Widget lifecycle", () => {
  test("does not report ready until bootstrap and a complete rendered-canvas proof", async () => {
    const meta = trustedMeta(root, "widget-task");
    const opened = await harness.callTool("open_agent_context_map", {}, meta);
    expect(opened.result.structuredContent).toMatchObject({ ok: true, documentId: "acm_baseline_001", data: { documentCount: 1, ready: false } });
    expect(opened.result._meta.widgetData).toMatchObject({ schemaVersion: "agent-context-map-widget-snapshot/v1", persistence: "ephemeral_working_copy" });
    const openAttemptId = opened.result.structuredContent.data.openAttemptId;
    const bootstrapNonce = opened.result._meta.widgetData.bootstrapNonce;
    expect(opened.result.content[0].text).not.toContain(bootstrapNonce);

    const beforeMount = await harness.callTool("await_agent_context_map_ready", { openAttemptId }, meta);
    expect(beforeMount.result.structuredContent.data).toMatchObject({ ready: false, widgetState: null });

    const forgedBootstrap = await harness.callTool("agent_context_map_widget_bootstrap", { openAttemptId, clientMountId: "mount_forged", bootstrapNonce: "forged" }, meta);
    expect(forgedBootstrap.result.structuredContent.error.code).toBe("app_session_mismatch");
    const bootstrapped = await harness.callTool("agent_context_map_widget_bootstrap", { openAttemptId, clientMountId: "mount_001", bootstrapNonce }, meta);
    const widgetInstanceId = bootstrapped.result.structuredContent.data.widgetInstanceId;
    const appSessionNonce = bootstrapped.result._meta.widgetData.appSessionNonce;
    expect(bootstrapped.result.content[0].text).not.toContain(appSessionNonce);
    expect(bootstrapped.result.structuredContent.data).toMatchObject({ widgetState: "initialized", ready: false });

    const invalid = await harness.callTool("agent_context_map_widget_ready", {
      openAttemptId, widgetInstanceId, appSessionNonce,
      proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: false, documentId: "acm_baseline_001" },
    }, meta);
    expect(invalid.result.structuredContent.error.code).toBe("invalid_ready_proof");

    const ready = await harness.callTool("agent_context_map_widget_ready", {
      openAttemptId, widgetInstanceId, appSessionNonce,
      proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: true, documentId: "acm_baseline_001" },
    }, meta);
    expect(ready.result.structuredContent.data).toMatchObject({ ready: true, widgetState: "ready", documentId: "acm_baseline_001" });
    expect(ready.result.structuredContent.data.transitions).toEqual(["initialized", "react_mounted", "project_hydrated", "canvas_first_frame", "ready"]);

    const health = await harness.callTool("agent_context_map_health");
    const hostEvents = health.result.structuredContent.data.hostLifecycle.events;
    expect(hostEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        stage: "open_result", outcome: "issued", correlationId: opened.result.structuredContent.correlationId, openAttemptId,
      }),
      expect.objectContaining({
        stage: "widget_bootstrap_result", outcome: "accepted", correlationId: bootstrapped.result.structuredContent.correlationId,
        openAttemptId, widgetInstanceId,
      }),
      expect.objectContaining({
        stage: "widget_ready_result", outcome: "accepted", correlationId: ready.result.structuredContent.correlationId,
        openAttemptId, widgetInstanceId,
      }),
    ]));
  });
});
