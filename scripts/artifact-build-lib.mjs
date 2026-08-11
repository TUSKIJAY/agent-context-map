import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import { parseAcmMd, validateDoc } from "../src/acm/data.js";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const defaultSpecPath = path.join(projectRoot, "skills", "acm-md", "examples", "valid-viewer-views.acm.md");
export const DEFAULT_MAX_ARTIFACT_BYTES = 750_000;

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

export function escapeInlineStyle(source) {
  return source.replace(/<\/style/gi, "<\\/style");
}

function escapeHtmlAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function generatedAtFrom({ generatedAt, sourceDateEpoch }) {
  let value = generatedAt;
  if (!value && sourceDateEpoch != null && sourceDateEpoch !== "") {
    const seconds = Number(sourceDateEpoch);
    if (!Number.isFinite(seconds)) throw new Error("SOURCE_DATE_EPOCH must be a finite number of seconds");
    value = new Date(seconds * 1000).toISOString();
  }
  if (!value) value = new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid generated_at value: ${value}`);
  return parsed.toISOString();
}

function sourceLabel(specPath) {
  const relative = path.relative(projectRoot, specPath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.split(path.sep).join("/")
    : path.basename(specPath);
}

export async function loadArtifactContext({ specPath = defaultSpecPath, generatedAt, sourceDateEpoch = process.env.SOURCE_DATE_EPOCH } = {}) {
  const absoluteSpecPath = path.resolve(specPath);
  const specText = await fs.readFile(absoluteSpecPath, "utf8");
  const packageMetadata = JSON.parse(await fs.readFile(path.join(projectRoot, "package.json"), "utf8"));
  const parsed = parseAcmMd(specText);
  if (!parsed.doc) throw new Error(`Artifact Spec parse failed: ${parsed.errors.join("; ")}`);
  const errors = validateDoc(parsed.doc).filter((issue) => issue.level === "error");
  if (errors.length) throw new Error(`Artifact Spec validation failed: ${errors.map((issue) => issue.message).join("; ")}`);
  const canonicalStructure = JSON.stringify({
    schema_version: parsed.doc.schema_version,
    doc_id: parsed.doc.doc_id,
    meta: parsed.doc.meta,
    nodes: parsed.doc.nodes,
    edges: parsed.doc.edges,
  });
  const metadata = {
    doc_id: parsed.doc.doc_id,
    schema_version: parsed.doc.schema_version,
    generated_at: generatedAtFrom({ generatedAt, sourceDateEpoch }),
    source_spec: sourceLabel(absoluteSpecPath),
    source_spec_sha256: sha256(specText),
    canonical_structure_sha256: sha256(canonicalStructure),
    layout_engine: "dagre",
    includes_elk: false,
    renderer_version: packageMetadata.version,
  };
  return { absoluteSpecPath, specText, doc: parsed.doc, metadata };
}

function isManagedOutput(outputRoot) {
  const relative = path.relative(projectRoot, outputRoot);
  return !relative.startsWith("..") && !path.isAbsolute(relative) && path.basename(outputRoot).startsWith("dist-artifact");
}

async function prepareOutput(outputRoot) {
  const resolved = path.resolve(outputRoot);
  if (resolved === path.parse(resolved).root || resolved === projectRoot) {
    throw new Error(`Refusing unsafe Artifact output path: ${resolved}`);
  }
  let files = [];
  try { files = await fs.readdir(resolved); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (files.length && !isManagedOutput(resolved)) {
    throw new Error(`Refusing to clear non-empty unmanaged Artifact output: ${resolved}`);
  }
  if (files.length) await fs.rm(resolved, { recursive: true, force: true });
  await fs.mkdir(resolved, { recursive: true });
  return resolved;
}

async function listFiles(root) {
  const output = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else output.push(absolute);
    }
  }
  await walk(root);
  return output.sort();
}

async function fileRecords(outputRoot, ignored = new Set()) {
  const records = [];
  for (const absolute of await listFiles(outputRoot)) {
    const relative = path.relative(outputRoot, absolute).split(path.sep).join("/");
    if (ignored.has(relative)) continue;
    const bytes = await fs.readFile(absolute);
    records.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return records;
}

function aggregateFiles(records) {
  return sha256(records.map((record) => `${record.sha256}  ${record.path}\n`).join(""));
}

function assertArtifactBoundary({ records, runtimeText, maxBytes }) {
  const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);
  if (totalBytes > maxBytes) throw new Error(`Artifact runtime ${totalBytes} B exceeds ${maxBytes} B limit`);
  if (/elk\.bundled|elkjs\/lib/i.test(runtimeText)) throw new Error("Artifact unexpectedly includes ELK runtime code");
  if (/@tauri-apps|plugin-sql|last_opened_doc_id|persistenceMode/.test(runtimeText)) {
    throw new Error("Artifact unexpectedly includes editor/storage/Tauri runtime markers");
  }
  return totalBytes;
}

function singleFileHtml(css, javascript, metadata) {
  const docId = escapeHtmlAttribute(metadata.doc_id);
  const generatedAt = escapeHtmlAttribute(metadata.generated_at);
  const schemaVersion = escapeHtmlAttribute(metadata.schema_version);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="acm:doc_id" content="${docId}">
  <meta name="acm:schema_version" content="${schemaVersion}">
  <meta name="acm:generated_at" content="${generatedAt}">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'">
  <title>Agent Context Map · Single-file Read-only Viewer</title>
  <style>
    :root { --sans: system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif; --mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    * { box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; margin: 0; }
    body { min-width: 320px; background: #f7f8fa; color: #1d2433; font-family: var(--sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    button { font-family: inherit; }
    ${escapeInlineStyle(css)}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${escapeInlineScript(javascript)}</script>
</body>
</html>`;
}

function baseViteConfig({ outputRoot, context, logLevel }) {
  return {
    configFile: false,
    root: projectRoot,
    base: "./",
    mode: "production",
    plugins: [react()],
    logLevel,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      __ACM_ARTIFACT_SPEC_TEXT__: JSON.stringify(context.specText),
      __ACM_ARTIFACT_BUILD_META__: JSON.stringify(context.metadata),
    },
    resolve: { dedupe: ["react", "react-dom"] },
    build: {
      target: "es2022",
      outDir: outputRoot,
      emptyOutDir: false,
      minify: true,
      sourcemap: false,
    },
  };
}

async function buildDirectory({ outputRoot, context, maxBytes, logLevel }) {
  await build({
    ...baseViteConfig({ outputRoot, context, logLevel }),
    build: {
      ...baseViteConfig({ outputRoot, context, logLevel }).build,
      rollupOptions: { input: path.join(projectRoot, "artifact.html") },
    },
  });
  const records = await fileRecords(outputRoot, new Set(["artifact-manifest.json"]));
  const runtimeText = (await Promise.all(records.filter((record) => /\.(?:html|js)$/i.test(record.path)).map((record) => fs.readFile(path.join(outputRoot, record.path), "utf8")))).join("\n");
  const totalRuntimeBytes = assertArtifactBoundary({ records, runtimeText, maxBytes });
  const manifest = {
    artifact_format: "directory",
    ...context.metadata,
    max_runtime_bytes: maxBytes,
    total_runtime_bytes: totalRuntimeBytes,
    runtime_sha256: aggregateFiles(records),
    files: records,
  };
  const manifestPath = path.join(outputRoot, "artifact-manifest.json");
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { ok: true, format: "directory", outputPath: path.join(outputRoot, "artifact.html"), manifestPath, ...manifest };
}

async function buildSingle({ outputRoot, context, maxBytes, logLevel }) {
  const entry = path.join(projectRoot, "src", "artifact", "main.jsx");
  const config = baseViteConfig({ outputRoot, context, logLevel });
  await build({
    ...config,
    build: {
      ...config.build,
      cssCodeSplit: false,
      lib: {
        entry,
        formats: ["iife"],
        name: "AgentContextMapArtifact",
        fileName: () => "artifact.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "artifact.js",
          assetFileNames: "[name][extname]",
          inlineDynamicImports: true,
        },
      },
    },
  });
  const javascript = await fs.readFile(path.join(outputRoot, "artifact.js"), "utf8");
  let css = "";
  for (const file of await fs.readdir(outputRoot)) {
    if (file.endsWith(".css")) css += await fs.readFile(path.join(outputRoot, file), "utf8");
  }
  const html = singleFileHtml(css, javascript, context.metadata);
  const outputPath = path.join(outputRoot, "artifact.html");
  await fs.writeFile(outputPath, html, "utf8");
  for (const file of await fs.readdir(outputRoot)) {
    if (file !== "artifact.html") await fs.rm(path.join(outputRoot, file), { recursive: true, force: true });
  }
  const record = { path: "artifact.html", bytes: Buffer.byteLength(html), sha256: sha256(html) };
  assertArtifactBoundary({ records: [record], runtimeText: html, maxBytes });
  return {
    ok: true,
    format: "single",
    outputPath,
    ...context.metadata,
    max_runtime_bytes: maxBytes,
    total_runtime_bytes: record.bytes,
    runtime_sha256: record.sha256,
    files: [record],
  };
}

export async function buildArtifact({
  format = "directory",
  specPath = defaultSpecPath,
  outputRoot = path.join(projectRoot, format === "single" ? "dist-artifact-single" : "dist-artifact-dir"),
  generatedAt,
  sourceDateEpoch = process.env.SOURCE_DATE_EPOCH,
  maxBytes = DEFAULT_MAX_ARTIFACT_BYTES,
  logLevel = "info",
} = {}) {
  if (!new Set(["directory", "single"]).has(format)) throw new Error(`Unsupported Artifact format: ${format}`);
  const parsedMaxBytes = Number(maxBytes);
  if (!Number.isFinite(parsedMaxBytes) || parsedMaxBytes <= 0) {
    throw new Error(`Artifact max byte limit must be a positive finite number: ${maxBytes}`);
  }
  const preparedOutput = await prepareOutput(outputRoot);
  const context = await loadArtifactContext({ specPath, generatedAt, sourceDateEpoch });
  const args = { outputRoot: preparedOutput, context, maxBytes: parsedMaxBytes, logLevel };
  return format === "single" ? buildSingle(args) : buildDirectory(args);
}
