#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist-artifact-single");
const entry = path.join(projectRoot, "src", "artifact", "main.jsx");

function escapeInlineScript(source) {
  return source.replaceAll("</script", "<\\/script").replaceAll("</SCRIPT", "<\\/SCRIPT");
}

function artifactHtml(css, javascript) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:">
  <title>Agent Context Map · Single-file Artifact Spike</title>
  <style>
    :root { --sans: system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif; --mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    * { box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; margin: 0; }
    body { min-width: 320px; background: #f7f8fa; color: #1d2433; font-family: var(--sans); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    button { font-family: inherit; }
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${escapeInlineScript(javascript)}</script>
</body>
</html>`;
}

if (outputRoot === path.parse(outputRoot).root) throw new Error("Refusing to use a filesystem root as Artifact output");
await fs.rm(outputRoot, { recursive: true, force: true });

await build({
  configFile: false,
  root: projectRoot,
  mode: "production",
  plugins: [react()],
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: { dedupe: ["react", "react-dom"] },
  build: {
    target: "es2022",
    outDir: outputRoot,
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: true,
    sourcemap: false,
    lib: {
      entry,
      formats: ["iife"],
      name: "AgentContextMapArtifactSpike",
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

const html = artifactHtml(css, javascript);
const outputPath = path.join(outputRoot, "artifact.html");
await fs.writeFile(outputPath, html, "utf8");
for (const file of await fs.readdir(outputRoot)) {
  if (file !== "artifact.html") await fs.rm(path.join(outputRoot, file), { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  outputPath,
  bytes: Buffer.byteLength(html),
  sha256: createHash("sha256").update(html).digest("hex"),
})}\n`);
