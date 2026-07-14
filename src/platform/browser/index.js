import { createMockAgentPatch } from "../../../packages/acm-core/src/index.js";
import { assertEditorPlatform } from "../../../packages/acm-editor/src/contracts.js";
import { browserHost, exportAdapter, openTextFile, saveBrowserTextFile } from "./dom.js";
import { createBrowserDemoStore } from "./store.js";

export function createBrowserPlatform() {
  return assertEditorPlatform({
    id: "browser-demo",
    store: createBrowserDemoStore(),
    files: { openTextFile, saveTextFile: saveBrowserTextFile },
    agent: {
      async requestAgentPatch({ doc, baseNodeId, prompt }) {
        const patch = createMockAgentPatch(doc, baseNodeId, prompt);
        return { ...patch, fallbackReason: "浏览器开发模式只提供本地 mock proposal" };
      },
    },
    exportAdapter,
    host: browserHost,
    capabilities: { imageExport: true, projectTruth: false, browserDemo: true },
  });
}
