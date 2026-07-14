#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { buildWidget } from "./build-widget.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(scriptDirectory, "..");
export const workspaceRoot = path.resolve(pluginRoot, "..", "..");
export const defaultReleaseRoot = path.join(workspaceRoot, "dist", "agent-context-map-plugin");
const entry = path.join(pluginRoot, "mcp", "src", "server.js");
const sourceSkill = path.join(workspaceRoot, "skills", "acm-md");

async function bundleServer(targetRoot, widgetHtml) {
  const mcpDirectory = path.join(targetRoot, "mcp");
  await fs.mkdir(mcpDirectory, { recursive: true });
  await build({
    configFile: false,
    logLevel: "silent",
    define: { "globalThis.__ACM_WIDGET_HTML__": JSON.stringify(widgetHtml) },
    build: {
      target: "node20",
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      lib: { entry, formats: ["es"], fileName: () => "server.mjs" },
      outDir: mcpDirectory,
      rollupOptions: { external: [/^node:/], output: { entryFileNames: "server.mjs", inlineDynamicImports: true } },
    },
  });
}

async function copySkill(targetRoot) {
  const target = path.join(targetRoot, "skills", "acm-md");
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(sourceSkill, target, { recursive: true });
}

async function copyPluginMetadata(targetRoot) {
  await fs.mkdir(path.join(targetRoot, ".codex-plugin"), { recursive: true });
  await fs.copyFile(path.join(pluginRoot, ".codex-plugin", "plugin.json"), path.join(targetRoot, ".codex-plugin", "plugin.json"));
  await fs.copyFile(path.join(pluginRoot, ".mcp.json"), path.join(targetRoot, ".mcp.json"));
  await fs.copyFile(path.join(pluginRoot, "README.md"), path.join(targetRoot, "README.md"));
}

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

async function writeReleaseManifest(releaseRoot) {
  const manifestPath = path.join(releaseRoot, "dist", "manifest.json");
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const files = [];
  for (const file of await filesUnder(releaseRoot)) {
    if (file === manifestPath) continue;
    const bytes = await fs.readFile(file);
    files.push({
      path: path.relative(releaseRoot, file).replaceAll("\\", "/"),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  const payload = { schemaVersion: "agent-context-map-plugin-release/v1", files };
  await fs.writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export async function buildMcp({ releaseRoot = defaultReleaseRoot, writeDevelopmentBundle = true } = {}) {
  const resolvedRelease = path.resolve(releaseRoot);
  if (resolvedRelease === path.parse(resolvedRelease).root) throw new Error("Refusing to use a filesystem root as release output");
  const widget = await buildWidget();
  if (writeDevelopmentBundle) {
    await bundleServer(pluginRoot, widget.html);
    await copySkill(pluginRoot);
  }
  await fs.rm(resolvedRelease, { recursive: true, force: true });
  await copyPluginMetadata(resolvedRelease);
  await bundleServer(resolvedRelease, widget.html);
  await copySkill(resolvedRelease);
  const manifest = await writeReleaseManifest(resolvedRelease);
  return { releaseRoot: resolvedRelease, files: manifest.files };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const result = await buildMcp();
  process.stdout.write(`${JSON.stringify({ ok: true, releaseRoot: result.releaseRoot, fileCount: result.files.length })}\n`);
}
