import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { PLUGIN_VERSION } from "../../src/plugin-version.js";
import { createMcpHarness, trustedMeta } from "../helpers/mcp-harness.js";

let root;
const harnesses = new Set();

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "acm-mcp-runtime-"));
  await fs.mkdir(path.join(root, ".acm"), { recursive: true });
  await fs.writeFile(path.join(root, ".acm", "sentinel"), "unchanged\n");
});
afterEach(async () => {
  await Promise.all([...harnesses].map((harness) => harness.close()));
  harnesses.clear();
  await fs.rm(root, { recursive: true, force: true });
});

describe("Phase 4 MCP runtime", () => {
  test("serves health and an MCP Apps placeholder resource without touching the project", async () => {
    const harness = createMcpHarness(); harnesses.add(harness); await harness.initialize();
    const health = await harness.callTool("agent_context_map_health");
    expect(health.result.structuredContent).toMatchObject({ ok: true, projectId: null, sessionId: null, data: { transport: "stdio", topology: "single_process" } });
    const expectedResourceUri = `ui://agent-context-map/widget-${PLUGIN_VERSION}.html`;
    const listed = await harness.request("resources/list");
    expect(listed.result.resources[0]).toMatchObject({ uri: expectedResourceUri, mimeType: "text/html;profile=mcp-app" });
    const read = await harness.request("resources/read", { uri: expectedResourceUri });
    expect(read.result.contents[0]._meta.ui).toMatchObject({ resourceUri: expectedResourceUri, csp: { connectDomains: [], resourceDomains: [] } });
    await harness.request("tools/list");
    const observed = await harness.callTool("agent_context_map_health");
    expect(observed.result.structuredContent.data.hostLifecycle).toMatchObject({
      schemaVersion: "agent-context-map-host-lifecycle/v1",
      storage: "process_memory_only",
      sensitiveContentRecorded: false,
      eventLimit: 64,
      counters: {
        mcp_initialize: 1,
        tool_descriptors_list: 1,
        ui_resources_list: 1,
        ui_resource_read: 1,
        tool_call: 2,
      },
    });
    expect(observed.result.structuredContent.data.hostLifecycle.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "tool_descriptors_list", outcome: "served" }),
      expect.objectContaining({ stage: "ui_resources_list", outcome: "served" }),
      expect.objectContaining({ stage: "ui_resource_read", outcome: "served" }),
    ]));
    expect(await fs.readFile(path.join(root, ".acm", "sentinel"), "utf8")).toBe("unchanged\n");
  });

  test("strictly validates valid and invalid ACM-MD under a trusted host binding", async () => {
    const uri = pathToFileURL(root).href;
    const harness = createMcpHarness({ roots: [{ uri, name: "runtime" }] }); harnesses.add(harness); await harness.initialize();
    const validText = await fs.readFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", "utf8");
    const valid = await harness.callTool("validate_acm_graph", { acmMdText: validText }, trustedMeta(root, "runtime-task"));
    expect(valid.result.structuredContent).toMatchObject({ ok: true, data: { valid: true, pythonStrictParity: "golden_verified" } });
    expect(valid.result.structuredContent.documentRevision).toMatch(/^sha256:/);
    const invalidText = await fs.readFile("tests/fixtures/acm-v0.1/dangling-edge.acm.md", "utf8");
    const invalid = await harness.callTool("validate_acm_graph", { acmMdText: invalidText }, trustedMeta(root, "runtime-task"));
    expect(invalid.result.structuredContent.ok).toBe(true);
    expect(invalid.result.structuredContent.data.valid).toBe(false);
    expect(invalid.result.structuredContent.data.diagnostics.some((item) => item.severity === "error")).toBe(true);
  });
});
