import { assertEditorPlatform } from "../../../../../packages/acm-editor/src/contracts.js";

const clone = (value) => structuredClone(value);

export function createWidgetEditorPlatform({ snapshot, onCanvasFirstFrame, onSelectionChange = () => {}, hostWindow = globalThis.window }) {
  if (snapshot?.schemaVersion !== "agent-context-map-widget-snapshot/v1" || !Array.isArray(snapshot.documents)) {
    throw new TypeError("The Widget requires a validated project snapshot.");
  }
  const documents = new Map(snapshot.documents.map((record) => [record.doc_id, clone(record)]));
  const appState = new Map();
  const history = new Map();
  if (snapshot.documents[0]?.doc_id) appState.set("last_opened_doc_id", snapshot.documents[0].doc_id);
  const projectInfo = { projectId: snapshot.projectId, displayName: "Current Codex workspace", mode: "widget_ephemeral" };

  const store = {
    persistenceMode: "project",
    workingCopyMode: "ephemeral",
    async listDocuments() {
      return [...documents.values()].map(({ body, base_snapshot, ...record }) => clone(record));
    },
    async getDocument(documentId) { return documents.has(documentId) ? clone(documents.get(documentId)) : null; },
    async upsertDocument(record) { documents.set(record.doc_id, clone(record)); },
    async saveBody(documentId, fields) {
      const current = documents.get(documentId);
      if (current) documents.set(documentId, { ...current, ...clone(fields), working_copy_only: true });
    },
    async saveBaseline(documentId, baseline) {
      const current = documents.get(documentId);
      if (current) documents.set(documentId, { ...current, base_snapshot: clone(baseline), dirty: false, working_copy_only: true });
    },
    async deleteDocument(documentId) { documents.delete(documentId); history.delete(documentId); },
    async getAppState(key, fallback = null) { return appState.has(key) ? clone(appState.get(key)) : fallback; },
    async setAppState(key, value) { appState.set(key, clone(value)); },
    async addSnapshot(documentId, label, body) {
      history.set(documentId, [{ label, body: clone(body) }, ...(history.get(documentId) || [])]);
    },
    async listSnapshots(documentId) { return clone(history.get(documentId) || []); },
    async selectProjectRoot() { return projectInfo; },
    getProjectInfo() { return projectInfo; },
    getProjectDiagnostics() { return clone(snapshot.diagnostics || { invalid: [], recovery: [], indexStatus: "widget" }); },
    async previewLegacyMigration() { return { snapshot: null, plan: { documents: [] }, unavailable: true }; },
    async backupLegacyMigration() { return null; },
    async migrateLegacyDocument() { return null; },
  };

  const platform = assertEditorPlatform({
    id: "codex-widget",
    store,
    files: {
      async openTextFile() { return null; },
      async saveTextFile() { return null; },
    },
    agent: {
      async requestAgentPatch() { throw new Error("Agent proposals are enabled in Phase 6; the Phase 5 Widget remains local working-copy only."); },
    },
    exportAdapter: { async exportGraph() { return null; } },
    host: {
      confirm(message) { return hostWindow.confirm(message); },
      alert(message) { hostWindow.alert(message); },
      getViewportSize() { return { width: hostWindow.innerWidth, height: hostWindow.innerHeight }; },
      subscribeKeydown(handler) {
        hostWindow.addEventListener("keydown", handler);
        return () => hostWindow.removeEventListener("keydown", handler);
      },
      reportReady(proof) { return onCanvasFirstFrame(proof); },
      reportSelection(selection) { onSelectionChange(selection); },
    },
    capabilities: { imageExport: false, projectTruth: false, ephemeralWorkingCopy: true, browserDemo: false },
  });
  platform.widgetApi = {
    getWorkingDocument(documentId) { return documents.has(documentId) ? clone(documents.get(documentId).body) : null; },
    replaceWorkingRecord(record) { if (record?.doc_id) documents.set(record.doc_id, clone(record)); },
  };
  return platform;
}
