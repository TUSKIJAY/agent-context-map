import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve("packages/acm-editor/src");

async function sourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(target));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(target);
  }
  return files;
}

describe("acm-editor import boundaries", () => {
  it("has no Tauri, storage discovery, SQLite or image-download implementation in its dependency closure", async () => {
    const files = await sourceFiles(root);
    const sources = await Promise.all(files.map(async (file) => [file, await fs.readFile(file, "utf8")]));
    for (const [file, source] of sources) {
      expect(source, file).not.toMatch(/@tauri-apps|__TAURI_INTERNALS__|(?:window|globalThis)\.localStorage|Database\.load|plugin-sql|html-to-image/);
      expect(source, file).not.toMatch(/src\/platform|src\/storage|acm\/agentClient/);
    }
  });

  it("injects Browser or Tauri adapters only at the Desktop composition root", async () => {
    const app = await fs.readFile(path.resolve("src/App.jsx"), "utf8");
    const shell = await fs.readFile(path.resolve("packages/acm-editor/src/AcmEditorShell.jsx"), "utf8");
    expect(app).toContain("createDesktopPlatform");
    expect(app).toContain("<AcmEditorShell platform={platform}");
    expect(shell).toContain("assertEditorPlatform(platform)");
    expect(shell).not.toContain("createDesktopPlatform");
  });

  it("does not emit legacy snake_case operations from product editor or platform code", async () => {
    const candidates = [
      ...await sourceFiles(path.resolve("packages/acm-editor/src")),
      ...await sourceFiles(path.resolve("src/platform")),
    ];
    const joined = (await Promise.all(candidates.map((file) => fs.readFile(file, "utf8")))).join("\n");
    expect(joined).not.toMatch(/op:\s*["'](?:add_node|update_node|add_edge)["']/);
  });

  it("keeps Tauri webview filesystem access at dialog-selected write only", async () => {
    const capability = await fs.readFile(path.resolve("src-tauri/capabilities/default.json"), "utf8");
    expect(capability).toContain("dialog:allow-open");
    expect(capability).toContain("dialog:allow-save");
    expect(capability).toContain("fs:allow-write-text-file");
    expect(capability).not.toMatch(/fs:default|allow-read|"path"\s*:\s*"\*\*"/);
  });
});
