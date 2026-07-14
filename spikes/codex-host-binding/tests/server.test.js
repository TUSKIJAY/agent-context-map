import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";

const serverPath = resolve("spikes/codex-host-binding/plugins/codex-host-binding-spike/mcp/server.mjs");
const fixtureRoot = resolve("spikes/codex-host-binding/fixtures/test-project/.acm");
const children = new Set();

function hashTree(root) {
  const hash = createHash("sha256");
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else {
        hash.update(relative(root, path).replaceAll("\\", "/"));
        hash.update(readFileSync(path));
      }
    }
  };
  visit(root);
  return hash.digest("hex");
}

function createHarness({ roots = [] } = {}) {
  const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
  children.add(child);
  const pending = new Map();
  let sequence = 0;
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    if (message.method === "roots/list") {
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { roots } })}\n`);
      return;
    }
    const waiter = pending.get(String(message.id));
    if (waiter) {
      pending.delete(String(message.id));
      waiter.resolve(message);
    }
  });
  const request = (method, params = {}) => new Promise((resolveRequest, rejectRequest) => {
    const id = `test-${++sequence}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectRequest(new Error(`Timed out waiting for ${method}`));
    }, 3000);
    pending.set(id, {
      resolve: (message) => {
        clearTimeout(timer);
        resolveRequest(message);
      },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
  const close = () => {
    child.stdin.end();
    child.kill();
    children.delete(child);
  };
  return { request, close };
}

async function initialize(harness) {
  const response = await harness.request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: { roots: { listChanged: false } },
    clientInfo: { name: "phase-0b-test-client", version: "1.0.0" },
  });
  expect(response.result.serverInfo.name).toBe("codex-host-binding-spike");
}

afterEach(() => {
  for (const child of children) child.kill();
  children.clear();
});

describe("Phase 0B read-only stdio MCP spike", () => {
  test("exposes only the health and identity evidence tools", async () => {
    const harness = createHarness();
    await initialize(harness);
    const response = await harness.request("tools/list");
    expect(response.result.tools.map((tool) => tool.name)).toEqual([
      "host_binding_spike_health",
      "inspect_codex_host_identity",
    ]);
    expect(response.result.tools.every((tool) => tool.annotations.readOnlyHint === true)).toBe(true);
    harness.close();
  });

  test("ignores forged identity arguments and leaves the fixture project unchanged", async () => {
    const before = hashTree(fixtureRoot);
    const harness = createHarness({ roots: [{ uri: "file:///D:/Code/agent-context-map", name: "fixture" }] });
    await initialize(harness);
    const response = await harness.request("tools/call", {
      name: "inspect_codex_host_identity",
      arguments: {
        probeLabel: "forged-arguments",
        projectPath: "C:/forged/project",
        workspaceRoot: "C:/forged/root",
        threadId: "forged-thread",
        taskId: "forged-task",
      },
    });
    const result = response.result.structuredContent;

    expect(result.conclusion).toBe("unavailable");
    expect(result.trustedRootEvidence).toBe(true);
    expect(result.trustedTaskEvidence).toBe(false);
    expect(result.modelArgumentsUsedForAuthorization).toBe(false);
    expect(result.ignoredIdentityArgumentKeys).toEqual(["projectPath", "taskId", "threadId", "workspaceRoot"]);
    expect(JSON.stringify(result)).not.toContain("C:/forged");
    expect(hashTree(fixtureRoot)).toBe(before);
    harness.close();
  });

  test("classifies client roots plus host-owned task metadata as trusted host identity", async () => {
    const harness = createHarness({ roots: [{ uri: "file:///D:/Code/agent-context-map" }] });
    await initialize(harness);
    const response = await harness.request("tools/call", {
      name: "inspect_codex_host_identity",
      arguments: { probeLabel: "host-meta" },
      _meta: { "codex/taskId": "task-from-host" },
    });
    const result = response.result.structuredContent;

    expect(result.conclusion).toBe("trusted_host_identity");
    expect(result.hostMetaFieldPaths).toContain("codex/taskId");
    harness.close();
  });

  test("accepts host-owned workspace metadata as root evidence without exposing the path", async () => {
    const harness = createHarness();
    await initialize(harness);
    const response = await harness.request("tools/call", {
      name: "inspect_codex_host_identity",
      arguments: { probeLabel: "host-workspace-meta" },
      _meta: {
        threadId: "task-from-host",
        "x-codex-turn-metadata": {
          thread_id: "task-from-host",
          workspaces: {
            "D:/sensitive/workspace": { has_changes: false },
          },
        },
      },
    });
    const result = response.result.structuredContent;

    expect(result.conclusion).toBe("trusted_host_identity");
    expect(result.hostWorkspaceCount).toBe(1);
    expect(result.hostWorkspaceRootHashes).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("D:/sensitive/workspace");
    harness.close();
  });

  test("requires a trusted native picker when the host reports multiple workspace roots", async () => {
    const harness = createHarness();
    await initialize(harness);
    const response = await harness.request("tools/call", {
      name: "inspect_codex_host_identity",
      arguments: { probeLabel: "multi-workspace-meta" },
      _meta: {
        threadId: "task-from-host",
        "x-codex-turn-metadata": {
          workspaces: {
            "D:/sensitive/workspace-a": { has_changes: false },
            "D:/sensitive/workspace-b": { has_changes: true },
          },
        },
      },
    });
    const result = response.result.structuredContent;

    expect(result.conclusion).toBe("trusted_native_picker_required");
    expect(result.rootCandidateCount).toBe(2);
    expect(result.hostWorkspaceRootHashes).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("D:/sensitive/workspace");
    harness.close();
  });

  test("contains no application core, SQLite, or project store dependency", () => {
    const source = readFileSync(serverPath, "utf8");
    expect(source).not.toMatch(/src[\\/]acm|sqlite|project-store|@tauri/i);
  });
});
