import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createMcpHarness, trustedMeta } from "../../plugins/agent-context-map/tests/helpers/mcp-harness.js";
import { buildPluginRelease } from "../helpers/plugin-release.js";

let suiteRoot;
let currentRelease;
let previousRelease;
let currentVersion;

async function filesUnder(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else files.push(target);
    }
  }
  await visit(root);
  return files;
}

async function hashTree(root) {
  const hash = createHash("sha256");
  for (const file of await filesUnder(root)) {
    hash.update(path.relative(root, file).replaceAll("\\", "/"));
    hash.update(await fs.readFile(file));
  }
  return hash.digest("hex");
}

async function verifyChecksums(root) {
  const lines = (await fs.readFile(path.join(root, "SHA256SUMS"), "utf8")).trim().split("\n");
  expect(lines.length).toBeGreaterThan(8);
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    expect(match).not.toBeNull();
    const digest = createHash("sha256").update(await fs.readFile(path.join(root, match[2]))).digest("hex");
    expect(digest).toBe(match[1]);
  }
}

async function installRelease(source, codexHome) {
  const pluginsRoot = path.join(codexHome, "plugins");
  const installed = path.join(pluginsRoot, "agent-context-map");
  const staging = path.join(pluginsRoot, `.agent-context-map-stage-${randomUUID()}`);
  const backup = path.join(pluginsRoot, `.agent-context-map-backup-${randomUUID()}`);
  await fs.mkdir(pluginsRoot, { recursive: true });
  await fs.cp(source, staging, { recursive: true });
  await verifyChecksums(staging);
  let backedUp = false;
  try {
    try {
      await fs.rename(installed, backup);
      backedUp = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await fs.rename(staging, installed);
    if (backedUp) await fs.rm(backup, { recursive: true, force: true });
    return installed;
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    if (backedUp) await fs.rename(backup, installed).catch(() => {});
    throw error;
  }
}

async function makeScenario() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "acm-install-lifecycle-"));
  const project = path.join(root, "project");
  const codexHome = path.join(root, "isolated-codex-home");
  const documents = path.join(project, ".acm", "documents");
  await fs.mkdir(documents, { recursive: true });
  await fs.copyFile("tests/fixtures/acm-v0.1/valid-basic.acm.md", path.join(documents, "acm_test_001.acm.md"));
  await fs.writeFile(path.join(project, ".acm", "install-sentinel"), "unchanged\n", "utf8");
  return { root, project, codexHome };
}

async function assertInstalledRuns(installed, expectedVersion, scenario) {
  const manifest = JSON.parse(await fs.readFile(path.join(installed, ".codex-plugin", "plugin.json"), "utf8"));
  expect(manifest.version).toBe(expectedVersion);
  const harness = createMcpHarness({
    roots: [{ uri: pathToFileURL(scenario.project).href }],
    serverPath: path.join(installed, "mcp", "server.mjs"),
    cwd: installed,
    env: {
      CODEX_HOME: scenario.codexHome,
      HOME: scenario.codexHome,
      USERPROFILE: scenario.codexHome,
    },
  });
  try {
    const initialized = await harness.initialize();
    expect(initialized.result.serverInfo).toEqual({ name: "agent-context-map", version: expectedVersion });
    const text = await fs.readFile(path.join(scenario.project, ".acm", "documents", "acm_test_001.acm.md"), "utf8");
    const result = await harness.callTool("validate_acm_graph", { acmMdText: text }, trustedMeta(scenario.project, `install-${expectedVersion}`));
    expect(result.result.structuredContent).toMatchObject({ ok: true, data: { valid: true } });
  } finally {
    await harness.close();
  }
}

beforeAll(async () => {
  suiteRoot = await fs.mkdtemp(path.join(os.tmpdir(), "acm-release-fixtures-"));
  currentRelease = path.join(suiteRoot, "current");
  previousRelease = path.join(suiteRoot, "previous");
  const built = await buildPluginRelease({ releaseRoot: currentRelease });
  currentVersion = built.pluginVersion;
  await buildPluginRelease({ releaseRoot: previousRelease, pluginVersion: "0.2.0" });
}, 30_000);

afterAll(async () => {
  await fs.rm(suiteRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("Phase 7 isolated plugin lifecycle", () => {
  test("fresh install, upgrade, and rollback preserve project bytes", async () => {
    const scenario = await makeScenario();
    try {
      const before = await hashTree(path.join(scenario.project, ".acm"));
      await assertInstalledRuns(await installRelease(previousRelease, scenario.codexHome), "0.2.0", scenario);
      await assertInstalledRuns(await installRelease(currentRelease, scenario.codexHome), currentVersion, scenario);
      await assertInstalledRuns(await installRelease(previousRelease, scenario.codexHome), "0.2.0", scenario);
      expect(await hashTree(path.join(scenario.project, ".acm"))).toBe(before);
    } finally {
      await fs.rm(scenario.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 30_000);

  test("uninstall and reinstall preserve user state and project bytes", async () => {
    const scenario = await makeScenario();
    try {
      const stateFile = path.join(scenario.codexHome, "state", "agent-context-map", "user.json");
      await fs.mkdir(path.dirname(stateFile), { recursive: true });
      await fs.writeFile(stateFile, "{\"theme\":\"dark\"}\n", "utf8");
      const before = await hashTree(path.join(scenario.project, ".acm"));
      const installed = await installRelease(currentRelease, scenario.codexHome);
      await assertInstalledRuns(installed, currentVersion, scenario);
      await fs.rm(installed, { recursive: true, force: true });
      await expect(fs.access(installed)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await fs.readFile(stateFile, "utf8")).toContain("dark");
      await assertInstalledRuns(await installRelease(currentRelease, scenario.codexHome), currentVersion, scenario);
      expect(await fs.readFile(stateFile, "utf8")).toContain("dark");
      expect(await hashTree(path.join(scenario.project, ".acm"))).toBe(before);
    } finally {
      await fs.rm(scenario.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, 30_000);
});
