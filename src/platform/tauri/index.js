import { assertEditorPlatform } from "../../../packages/acm-editor/src/contracts.js";
import {
  backend, backupLegacyMigration, getProjectDiagnostics, getProjectInfo,
  migrateLegacyDocument, previewLegacyMigration, selectProjectRoot,
} from "../../storage/tauriProjectStore.js";
import { browserHost, exportAdapter } from "../browser/dom.js";
import { requestTauriAgentPatch } from "./agent.js";
import { openTextFile, saveTauriTextFile } from "./files.js";

export function createTauriPlatform() {
  return assertEditorPlatform({
    id: "tauri-desktop",
    store: {
      persistenceMode: "project",
      ...backend,
      selectProjectRoot,
      getProjectInfo,
      getProjectDiagnostics,
      previewLegacyMigration,
      backupLegacyMigration,
      migrateLegacyDocument,
    },
    files: { openTextFile, saveTextFile: saveTauriTextFile },
    agent: { requestAgentPatch: requestTauriAgentPatch },
    exportAdapter,
    host: browserHost,
    capabilities: { imageExport: true, projectTruth: true, browserDemo: false },
  });
}
