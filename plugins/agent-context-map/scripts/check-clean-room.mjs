#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..", "..", "..");
const base = await fs.mkdtemp(path.join(os.tmpdir(), "agent-context-map-clean-room-"));
const checkout = path.join(base, "checkout");

const excluded = [
  ".git",
  ".playwright-cli",
  "dist",
  "doc",
  "node_modules",
  "output",
  "src-tauri/gen",
  "src-tauri/target",
  "plugins/agent-context-map/mcp/server.mjs",
  "plugins/agent-context-map/skills",
  "plugins/agent-context-map/widget/dist",
];

function isExcluded(source) {
  const relative = path.relative(workspaceRoot, source).replaceAll("\\", "/");
  return excluded.some((entry) => relative === entry || relative.startsWith(`${entry}/`));
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: checkout,
      env: { ...process.env, CI: "1" },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} failed with ${signal ?? code}`));
    });
  });
}

try {
  await fs.cp(workspaceRoot, checkout, { recursive: true, filter: (source) => !isExcluded(source) });
  await runNpm(["ci", "--no-audit", "--no-fund"]);
  await runNpm(["run", "test:all"]);
  await runNpm(["run", "build"]);
  await runNpm(["run", "build:plugin"]);
  await runNpm(["run", "test:mcp-bundle-repro"]);
  process.stdout.write(`${JSON.stringify({ ok: true, source: "isolated-copy", npmCi: true, packageBuilds: 2 })}\n`);
} finally {
  await fs.rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
