#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requiredFiles = [
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "CHANGELOG.md",
  "README.md",
  "dist/dependencies.json",
  "dist/manifest.json",
  "dist/sbom.cdx.json",
  "mcp/server.mjs",
  "skills/acm-md/SKILL.md",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function filesUnder(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Release artifact must not contain a symbolic link: ${path.relative(root, target)}`);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
      else throw new Error(`Release artifact contains an unsupported filesystem entry: ${path.relative(root, target)}`);
    }
  }
  await visit(root);
  return files;
}

function safeRelativePath(root, relative) {
  if (!relative || relative.includes("\\") || path.posix.normalize(relative) !== relative || relative.startsWith("../") || path.posix.isAbsolute(relative)) {
    throw new Error(`Unsafe release checksum path: ${relative}`);
  }
  const target = path.resolve(root, ...relative.split("/"));
  const relation = path.relative(root, target);
  if (!relation || relation.startsWith("..") || path.isAbsolute(relation)) throw new Error(`Release checksum path escapes its root: ${relative}`);
  return target;
}

export async function verifyRelease({ releaseRoot, expectedVersion } = {}) {
  if (!releaseRoot) throw new Error("releaseRoot is required");
  const root = path.resolve(releaseRoot);
  const checksumBytes = await fs.readFile(path.join(root, "SHA256SUMS"));
  const lines = checksumBytes.toString("utf8").trimEnd().split(/\r?\n/u);
  const checksums = new Map();
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/u);
    if (!match) throw new Error(`Invalid SHA256SUMS line: ${line}`);
    if (checksums.has(match[2])) throw new Error(`Duplicate SHA256SUMS path: ${match[2]}`);
    const target = safeRelativePath(root, match[2]);
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Checksum target is not a regular file: ${match[2]}`);
    const actual = sha256(await fs.readFile(target));
    if (actual !== match[1]) throw new Error(`Checksum mismatch for ${match[2]}: expected ${match[1]}, received ${actual}`);
    checksums.set(match[2], match[1]);
  }

  const files = await filesUnder(root);
  const relativeFiles = files.map((file) => path.relative(root, file).replaceAll("\\", "/"));
  const checksumTargets = relativeFiles.filter((relative) => relative !== "SHA256SUMS");
  if (checksums.size !== checksumTargets.length || checksumTargets.some((relative) => !checksums.has(relative))) {
    throw new Error("SHA256SUMS must cover every release file except itself and contain no missing targets");
  }
  for (const relative of requiredFiles) {
    if (!relativeFiles.includes(relative)) throw new Error(`Release artifact is missing required file: ${relative}`);
  }

  const plugin = JSON.parse(await fs.readFile(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
  if (expectedVersion && plugin.version !== expectedVersion) {
    throw new Error(`Release version mismatch: expected ${expectedVersion}, received ${plugin.version}`);
  }
  const releaseManifest = JSON.parse(await fs.readFile(path.join(root, "dist", "manifest.json"), "utf8"));
  const manifestTargets = new Map((releaseManifest.files ?? []).map((item) => [item.path, item]));
  const filesBeforeManifest = checksumTargets.filter((relative) => relative !== "dist/manifest.json");
  if (releaseManifest.schemaVersion !== "agent-context-map-plugin-release/v1"
      || manifestTargets.size !== filesBeforeManifest.length
      || filesBeforeManifest.some((relative) => !manifestTargets.has(relative))) {
    throw new Error("dist/manifest.json must cover every release file that precedes the manifest");
  }
  for (const [relative, item] of manifestTargets) {
    const bytes = await fs.readFile(safeRelativePath(root, relative));
    if (item.bytes !== bytes.length || item.sha256 !== sha256(bytes)) throw new Error(`Release manifest mismatch for ${relative}`);
  }

  const tree = createHash("sha256");
  for (const file of files) {
    tree.update(path.relative(root, file).replaceAll("\\", "/"));
    tree.update(await fs.readFile(file));
  }
  return {
    ok: true,
    releaseRoot: root,
    pluginVersion: plugin.version,
    totalFiles: files.length,
    checksumEntries: checksums.size,
    treeSha256: tree.digest("hex"),
    checksumSetDigest: sha256(lines.join("\n")),
    sha256SumsFileSha256: sha256(checksumBytes),
  };
}

function parseCli(args) {
  const options = { releaseRoot: args[0] };
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== "--expected-version" || !args[index + 1]) throw new Error(`Unknown or incomplete verify option: ${args[index]}`);
    options.expectedVersion = args[index + 1];
    index += 1;
  }
  return options;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const result = await verifyRelease(parseCli(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
