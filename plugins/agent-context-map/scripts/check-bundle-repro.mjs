#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildMcp, workspaceRoot } from "./build-mcp.mjs";

async function hashTree(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else {
        hash.update(path.relative(root, target).replaceAll("\\", "/"));
        hash.update(await fs.readFile(target));
      }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

const base = path.join(os.tmpdir(), `agent-context-map-repro-${randomUUID()}`);
const first = path.join(base, "first");
const second = path.join(base, "second");
if (!path.resolve(base).startsWith(path.resolve(os.tmpdir()))) throw new Error("Unsafe temporary output root");

try {
  await buildMcp({ releaseRoot: first, writeDevelopmentBundle: false });
  await buildMcp({ releaseRoot: second, writeDevelopmentBundle: false });
  const firstHash = await hashTree(first);
  const secondHash = await hashTree(second);
  const bundle = await fs.readFile(path.join(first, "mcp", "server.mjs"), "utf8");
  if (firstHash !== secondHash) throw new Error(`MCP release bundle is not reproducible: ${firstHash} != ${secondHash}`);
  const developmentMarkers = new Set([
    workspaceRoot,
    workspaceRoot.replaceAll("\\", "/"),
    pathToFileURL(workspaceRoot).href,
    JSON.stringify(workspaceRoot).slice(1, -1),
  ]);
  if ([...developmentMarkers].some((marker) => bundle.includes(marker)) || /[A-Za-z]:[\\/]Code[\\/]agent-context-map/i.test(bundle)) {
    throw new Error("MCP bundle leaked an absolute development path");
  }
  process.stdout.write(`${JSON.stringify({ ok: true, sha256: firstHash })}\n`);
} finally {
  await fs.rm(base, { recursive: true, force: true });
}
