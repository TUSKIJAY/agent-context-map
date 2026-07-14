import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";

export const sourceServerPath = path.resolve("plugins/agent-context-map/mcp/src/server.js");

export function createMcpHarness({ roots = [], serverPath = sourceServerPath, cwd = process.cwd() } = {}) {
  const child = spawn(process.execPath, [serverPath], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  const pending = new Map();
  let sequence = 0;
  let currentRoots = roots;
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    if (message.method === "roots/list") {
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { roots: currentRoots } })}\n`);
      return;
    }
    const waiter = pending.get(String(message.id));
    if (waiter) {
      pending.delete(String(message.id));
      waiter.resolve(message);
    }
  });

  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = `test-${++sequence}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}; stderr=${stderr}`));
    }, 5000);
    pending.set(id, { resolve: (message) => { clearTimeout(timer); resolve(message); } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });

  const initialize = () => request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: { roots: { listChanged: false } },
    clientInfo: { name: "agent-context-map-test-client", version: "1.0.0" },
  });
  const callTool = (name, args = {}, meta = {}) => request("tools/call", { name, arguments: args, _meta: meta });
  let closePromise;
  const close = () => {
    if (closePromise) return closePromise;
    closePromise = new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        lines.close();
        resolve();
        return;
      }
      const forceTimer = setTimeout(() => { child.kill("SIGKILL"); }, 1500);
      child.once("exit", () => {
        clearTimeout(forceTimer);
        lines.close();
        resolve();
      });
      child.stdin.end();
      child.kill();
    });
    return closePromise;
  };
  return { child, request, initialize, callTool, close, setRoots(next) { currentRoots = next; }, stderr: () => stderr };
}

export function trustedMeta(root, task = "task-test") {
  return {
    threadId: task,
    "x-codex-turn-metadata": {
      session_id: task,
      thread_id: task,
      workspaces: { [root]: { has_changes: false } },
    },
  };
}
