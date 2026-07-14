import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createMcpHarness, trustedMeta } from "../../plugins/agent-context-map/tests/helpers/mcp-harness.js";
import { buildPluginRelease, workspaceRoot } from "../helpers/plugin-release.js";

let base;
let releaseRoot;
let workspace;

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "acm-clean-plugin-"));
  releaseRoot = path.join(base, "release");
  workspace = path.join(base, "workspace");
  await fs.mkdir(path.join(workspace, ".acm"), { recursive: true });
  await fs.writeFile(path.join(workspace, ".acm", "sentinel"), "unchanged\n");
  await buildPluginRelease({ releaseRoot });
}, 30_000);
afterAll(async () => { await fs.rm(base, { recursive: true, force: true }); });

describe("Phase 4 clean plugin distribution", () => {
  test("contains manifest, copied skill, deterministic release manifest, and no development path", async () => {
    for (const relative of [".codex-plugin/plugin.json", ".mcp.json", "mcp/server.mjs", "skills/acm-md/SKILL.md", "dist/manifest.json"]) {
      await expect(fs.access(path.join(releaseRoot, relative))).resolves.toBeUndefined();
    }
    const bundle = await fs.readFile(path.join(releaseRoot, "mcp", "server.mjs"), "utf8");
    for (const marker of new Set([
      workspaceRoot,
      workspaceRoot.replaceAll("\\", "/"),
      pathToFileURL(workspaceRoot).href,
      JSON.stringify(workspaceRoot).slice(1, -1),
    ])) {
      const offset = bundle.indexOf(marker);
      expect(offset, offset < 0 ? undefined : bundle.slice(Math.max(0, offset - 160), offset + marker.length + 160)).toBe(-1);
    }
    expect(bundle).not.toMatch(/@tauri-apps|plugin-sql|127\.0\.0\.1|0\.0\.0\.0|createServer\(/);
    for (const relative of ["skills/acm-md/SKILL.md", "skills/acm-md/agents/openai.yaml", "skills/acm-md/references/acm-md-v0.1.md", "skills/acm-md/scripts/validate_acm_md.py"]) {
      expect(await fs.readFile(path.join(releaseRoot, relative), "utf8")).not.toContain("\r");
    }
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

  test("ships deterministic checksums, dependency inventory, and CycloneDX SBOM", async () => {
    const manifest = JSON.parse(await fs.readFile(path.join(releaseRoot, ".codex-plugin", "plugin.json"), "utf8"));
    const dependencies = JSON.parse(await fs.readFile(path.join(releaseRoot, "dist", "dependencies.json"), "utf8"));
    const sbom = JSON.parse(await fs.readFile(path.join(releaseRoot, "dist", "sbom.cdx.json"), "utf8"));
    expect(manifest.version).toBe("0.3.0-rc.1");
    expect(dependencies).toMatchObject({
      schemaVersion: "agent-context-map-plugin-dependencies/v1",
      pluginVersion: manifest.version,
      buildRuntime: { node: "24.12.0", npm: "11.6.2", lockfileVersion: 3 },
    });
    expect(dependencies.packages.length).toBeGreaterThan(10);
    expect(sbom).toMatchObject({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      metadata: { component: { name: "agent-context-map", version: manifest.version } },
    });
    expect(sbom.components.length).toBe(dependencies.packages.length);
    const checksumLines = (await fs.readFile(path.join(releaseRoot, "SHA256SUMS"), "utf8")).trim().split("\n");
    expect(checksumLines.some((line) => line.endsWith("  mcp/server.mjs"))).toBe(true);
    expect(checksumLines.some((line) => line.endsWith("  dist/sbom.cdx.json"))).toBe(true);
    for (const line of checksumLines) {
      const match = line.match(/^([a-f0-9]{64})  (.+)$/);
      expect(match).not.toBeNull();
      const actual = createHash("sha256").update(await fs.readFile(path.join(releaseRoot, match[2]))).digest("hex");
      expect(actual).toBe(match[1]);
    }
  });
});
