import fs from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import { MCP_TOOLS } from "../../mcp/src/tools/registry.js";
import { createMcpHarness } from "../helpers/mcp-harness.js";

const children = new Set();
afterEach(async () => {
  await Promise.all([...children].map((harness) => harness.close()));
  children.clear();
});

describe("Phase 6 MCP schema", () => {
  test("uses a strict plugin manifest and companion MCP config without a marketplace", async () => {
    const manifest = JSON.parse(await fs.readFile("plugins/agent-context-map/.codex-plugin/plugin.json", "utf8"));
    const mcp = JSON.parse(await fs.readFile("plugins/agent-context-map/.mcp.json", "utf8"));
    expect(manifest).toMatchObject({ id: "agent-context-map", name: "agent-context-map", version: "0.2.0", skills: "./skills/", mcpServers: "./.mcp.json" });
    expect(mcp.mcpServers.agent_context_map).toMatchObject({ command: "node", args: ["./mcp/server.mjs"], cwd: "." });
    await expect(fs.access(".agents/plugins/marketplace.json")).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("publishes strict input/output schemas and truthful read-only annotations", () => {
    expect(MCP_TOOLS.map((tool) => tool.name)).toEqual([
      "agent_context_map_health", "open_agent_context_map", "await_agent_context_map_ready", "get_acm_graph_context",
      "validate_acm_graph", "write_acm_graph", "import_acm_md", "export_acm_md",
      "agent_context_map_widget_bootstrap", "agent_context_map_widget_ready", "agent_context_map_widget_api",
      "commit_acm_proposal", "commit_manual_edit", "send_acm_context",
    ]);
    for (const tool of MCP_TOOLS) {
      expect(tool.inputSchema.additionalProperties, tool.name).toBe(false);
      expect(tool.outputSchema.additionalProperties, tool.name).toBe(false);
      expect(tool.annotations.openWorldHint, tool.name).toBe(false);
    }
    expect(MCP_TOOLS[4].inputSchema.required).toEqual([]);
    expect(MCP_TOOLS[1]._meta.ui).toEqual({ resourceUri: "ui://agent-context-map/widget.html", visibility: ["model", "app"] });
    for (const tool of MCP_TOOLS.slice(8)) expect(tool._meta.ui.visibility).toEqual(["app"]);
  });

  test("advertises tools and resources over the initialized stdio protocol", async () => {
    const harness = createMcpHarness(); children.add(harness);
    const initialized = await harness.initialize();
    expect(initialized.result.serverInfo).toEqual({ name: "agent-context-map", version: "0.2.0" });
    expect(initialized.result.capabilities).toHaveProperty("resources");
    const tools = await harness.request("tools/list");
    expect(tools.result.tools).toEqual(MCP_TOOLS);
  });
});
