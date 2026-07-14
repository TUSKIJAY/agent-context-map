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
const packageLockPath = path.join(workspaceRoot, "package-lock.json");
const releaseNodeVersion = "24.12.0";

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

async function copyPluginMetadata(targetRoot, pluginVersion) {
  await fs.mkdir(path.join(targetRoot, ".codex-plugin"), { recursive: true });
  const sourceManifest = JSON.parse(await fs.readFile(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
  const manifest = { ...sourceManifest, version: pluginVersion ?? sourceManifest.version };
  await fs.writeFile(path.join(targetRoot, ".codex-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.copyFile(path.join(pluginRoot, ".mcp.json"), path.join(targetRoot, ".mcp.json"));
  await fs.copyFile(path.join(pluginRoot, "README.md"), path.join(targetRoot, "README.md"));
  await fs.copyFile(path.join(pluginRoot, "CHANGELOG.md"), path.join(targetRoot, "CHANGELOG.md"));
  return manifest;
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

function dependencyName(lockPath, metadata) {
  if (metadata.name) return metadata.name;
  const marker = "node_modules/";
  const offset = lockPath.lastIndexOf(marker);
  return offset >= 0 ? lockPath.slice(offset + marker.length) : lockPath;
}

async function writeDependencyArtifacts(releaseRoot, pluginVersion) {
  const lock = JSON.parse(await fs.readFile(packageLockPath, "utf8"));
  const packages = Object.entries(lock.packages ?? {})
    .filter(([lockPath, metadata]) => lockPath && metadata?.version)
    .map(([lockPath, metadata]) => ({
      name: dependencyName(lockPath.replaceAll("\\", "/"), metadata),
      version: metadata.version,
      development: Boolean(metadata.dev),
      lockPath: lockPath.replaceAll("\\", "/"),
    }))
    .sort((left, right) => left.lockPath.localeCompare(right.lockPath));
  const directory = path.join(releaseRoot, "dist");
  await fs.mkdir(directory, { recursive: true });
  const dependencies = {
    schemaVersion: "agent-context-map-plugin-dependencies/v1",
    pluginVersion,
    buildRuntime: { node: "24.12.0", npm: "11.6.2", lockfileVersion: lock.lockfileVersion },
    packages,
  };
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: { component: { type: "application", name: "agent-context-map", version: pluginVersion } },
    components: packages.map((item) => ({
      type: "library",
      "bom-ref": `${item.lockPath}@${item.version}`,
      name: item.name,
      version: item.version,
      scope: item.development ? "excluded" : "required",
    })),
  };
  await fs.writeFile(path.join(directory, "dependencies.json"), `${JSON.stringify(dependencies, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(directory, "sbom.cdx.json"), `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
}

async function writeChecksums(releaseRoot) {
  const checksumPath = path.join(releaseRoot, "SHA256SUMS");
  const lines = [];
  for (const file of await filesUnder(releaseRoot)) {
    if (file === checksumPath) continue;
    const relative = path.relative(releaseRoot, file).replaceAll("\\", "/");
    const sha256 = createHash("sha256").update(await fs.readFile(file)).digest("hex");
    lines.push(`${sha256}  ${relative}`);
  }
  await fs.writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

export async function buildMcp({ releaseRoot = defaultReleaseRoot, writeDevelopmentBundle = true, pluginVersion } = {}) {
  if (process.versions.node !== releaseNodeVersion) {
    throw new Error(`Release builds require Node ${releaseNodeVersion}; received ${process.versions.node}`);
  }
  const resolvedRelease = path.resolve(releaseRoot);
  if (resolvedRelease === path.parse(resolvedRelease).root) throw new Error("Refusing to use a filesystem root as release output");
  const widget = await buildWidget();
  if (writeDevelopmentBundle) {
    await bundleServer(pluginRoot, widget.html);
    await copySkill(pluginRoot);
  }
  await fs.rm(resolvedRelease, { recursive: true, force: true });
  const manifestMetadata = await copyPluginMetadata(resolvedRelease, pluginVersion);
  await bundleServer(resolvedRelease, widget.html);
  await copySkill(resolvedRelease);
  await writeDependencyArtifacts(resolvedRelease, manifestMetadata.version);
  const manifest = await writeReleaseManifest(resolvedRelease);
  const checksum = await writeChecksums(resolvedRelease);
  return { releaseRoot: resolvedRelease, files: manifest.files, checksum, pluginVersion: manifestMetadata.version };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const result = await buildMcp();
  process.stdout.write(`${JSON.stringify({ ok: true, releaseRoot: result.releaseRoot, fileCount: result.files.length, pluginVersion: result.pluginVersion, checksum: result.checksum })}\n`);
}
