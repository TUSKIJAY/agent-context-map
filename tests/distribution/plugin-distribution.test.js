import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { buildMcp, workspaceRoot } from "../../plugins/agent-context-map/scripts/build-mcp.mjs";
import { createMcpHarness, trustedMeta } from "../../plugins/agent-context-map/tests/helpers/mcp-harness.js";

let base;
let releaseRoot;
let workspace;

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "acm-clean-plugin-"));
  releaseRoot = path.join(base, "release");
  workspace = path.join(base, "workspace");
  await fs.mkdir(path.join(workspace, ".acm"), { recursive: true });
  await fs.writeFile(path.join(workspace, ".acm", "sentinel"), "unchanged\n");
  await buildMcp({ releaseRoot, writeDevelopmentBundle: false });
});
afterAll(async () => { await fs.rm(base, { recursive: true, force: true }); });

describe("Phase 4 clean plugin distribution", () => {
  test("contains manifest, copied skill, deterministic release manifest, and no development path", async () => {
    for (const relative of [".codex-plugin/plugin.json", ".mcp.json", "mcp/server.mjs", "skills/acm-md/SKILL.md", "dist/manifest.json"]) {
      await expect(fs.access(path.join(releaseRoot, relative))).resolves.toBeUndefined();
    }
    const bundle = await fs.readFile(path.join(releaseRoot, "mcp", "server.mjs"), "utf8");
    expect(bundle).not.toContain(workspaceRoot);
    expect(bundle).not.toMatch(/@tauri-apps|plugin-sql|127\.0\.0\.1|0\.0\.0\.0|createServer\(/);
  });

  test("starts the bundled server from a clean package without global Codex command configuration", async () => {
    const serverPath = path.join(releaseRoot, "mcp", "server.mjs");
    const harness = createMcpHarness({ roots: [{ uri: pathToFileURL(workspace).href }], serverPath, cwd: releaseRoot });
    try {
      const initialized = await harness.initialize();
      expect(initialized.result.serverInfo.name).toBe("agent-context-map");
      const text = await fs.readFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", "utf8");
      const validated = await harness.callTool("validate_acm_graph", { acmMdText: text }, trustedMeta(workspace, "clean-package"));
      expect(validated.result.structuredContent).toMatchObject({ ok: true, data: { valid: true } });
      expect(await fs.readFile(path.join(workspace, ".acm", "sentinel"), "utf8")).toBe("unchanged\n");
    } finally { await harness.close(); }
  });
});
