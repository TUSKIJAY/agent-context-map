#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(scriptDirectory, "..");
export const widgetRoot = path.join(pluginRoot, "widget");
export const widgetDist = path.join(widgetRoot, "dist");
const entry = path.join(widgetRoot, "src", "main.jsx");

function escapeInlineScript(source) {
  return source.replaceAll("</script", "<\\/script").replaceAll("</SCRIPT", "<\\/SCRIPT");
}

function widgetHtml(css, javascript) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'">
  <title>Agent Context Map</title>
  <style>${css}</style>
</head>
<body>
  <div id="root" data-acm-widget-state="booting"></div>
  <script>${escapeInlineScript(javascript)}</script>
</body>
</html>`;
}

export async function buildWidget({ outputRoot = widgetDist } = {}) {
  const resolvedOutput = path.resolve(outputRoot);
  if (resolvedOutput === path.parse(resolvedOutput).root) throw new Error("Refusing to use a filesystem root as Widget output");
  await fs.rm(resolvedOutput, { recursive: true, force: true });
  await build({
    configFile: false,
    plugins: [react()],
    logLevel: "silent",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: { dedupe: ["react", "react-dom"] },
    build: {
      target: "es2022",
      outDir: resolvedOutput,
      emptyOutDir: true,
      cssCodeSplit: false,
      minify: true,
      sourcemap: false,
      lib: { entry, formats: ["iife"], name: "AgentContextMapWidget", fileName: () => "widget.js" },
      rollupOptions: { output: { entryFileNames: "widget.js", assetFileNames: "[name][extname]", inlineDynamicImports: true } },
    },
  });
  const javascript = await fs.readFile(path.join(resolvedOutput, "widget.js"), "utf8");
  let css = "";
  for (const file of await fs.readdir(resolvedOutput)) {
    if (file.endsWith(".css")) css += await fs.readFile(path.join(resolvedOutput, file), "utf8");
  }
  const html = widgetHtml(css, javascript);
  await fs.writeFile(path.join(resolvedOutput, "widget.html"), html, "utf8");
  for (const file of await fs.readdir(resolvedOutput)) {
    if (file !== "widget.html") await fs.rm(path.join(resolvedOutput, file), { recursive: true, force: true });
  }
  return { html, outputPath: path.join(resolvedOutput, "widget.html"), sha256: createHash("sha256").update(html).digest("hex") };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const result = await buildWidget();
  process.stdout.write(`${JSON.stringify({ ok: true, outputPath: result.outputPath, bytes: Buffer.byteLength(result.html), sha256: result.sha256 })}\n`);
}
