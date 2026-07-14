const STORE_METHODS = [
  "listDocuments", "getDocument", "upsertDocument", "saveBody", "saveBaseline",
  "deleteDocument", "getAppState", "setAppState", "addSnapshot", "listSnapshots",
  "selectProjectRoot", "getProjectInfo", "getProjectDiagnostics", "previewLegacyMigration",
  "backupLegacyMigration", "migrateLegacyDocument",
];

const requireMethod = (owner, key, label) => {
  if (typeof owner?.[key] !== "function") throw new TypeError(`AcmEditorShell requires ${label}.${key}()`);
};

export function assertEditorPlatform(platform) {
  if (!platform || typeof platform !== "object") throw new TypeError("AcmEditorShell requires an injected platform adapter");
  for (const method of STORE_METHODS) requireMethod(platform.store, method, "platform.store");
  requireMethod(platform.files, "openTextFile", "platform.files");
  requireMethod(platform.files, "saveTextFile", "platform.files");
  requireMethod(platform.agent, "requestAgentPatch", "platform.agent");
  requireMethod(platform.exportAdapter, "exportGraph", "platform.exportAdapter");
  requireMethod(platform.host, "confirm", "platform.host");
  requireMethod(platform.host, "alert", "platform.host");
  requireMethod(platform.host, "getViewportSize", "platform.host");
  requireMethod(platform.host, "subscribeKeydown", "platform.host");
  if (!['project', 'local'].includes(platform.store.persistenceMode)) {
    throw new TypeError("platform.store.persistenceMode must be project or local");
  }
  return platform;
}

export function createMockEditorPlatform(overrides = {}) {
  const documents = new Map();
  const state = new Map();
  const snapshots = new Map();
  const store = {
    persistenceMode: "local",
    async listDocuments() { return [...documents.values()].map(({ body, base_snapshot, ...record }) => record); },
    async getDocument(id) { return documents.get(id) || null; },
    async upsertDocument(record) { documents.set(record.doc_id, structuredClone(record)); },
    async saveBody(id, fields) { const current = documents.get(id); if (current) documents.set(id, { ...current, ...structuredClone(fields) }); },
    async saveBaseline(id, base) { const current = documents.get(id); if (current) documents.set(id, { ...current, base_snapshot: structuredClone(base), dirty: false }); },
    async deleteDocument(id) { documents.delete(id); snapshots.delete(id); },
    async getAppState(key, fallback = null) { return state.has(key) ? state.get(key) : fallback; },
    async setAppState(key, value) { state.set(key, structuredClone(value)); },
    async addSnapshot(id, label, body) { snapshots.set(id, [{ label, body: structuredClone(body) }, ...(snapshots.get(id) || [])]); },
    async listSnapshots(id) { return snapshots.get(id) || []; },
    async selectProjectRoot() { return null; },
    getProjectInfo() { return null; },
    getProjectDiagnostics() { return { invalid: [], recovery: [], indexStatus: "mock" }; },
    async previewLegacyMigration() { return { snapshot: null, plan: { documents: [] } }; },
    async backupLegacyMigration() { return null; },
    async migrateLegacyDocument() { return null; },
    ...overrides.store,
  };
  return assertEditorPlatform({
    id: "mock",
    store,
    files: { async openTextFile() { return null; }, async saveTextFile() { return null; }, ...overrides.files },
    agent: { async requestAgentPatch() { throw new Error("mock agent not configured"); }, ...overrides.agent },
    exportAdapter: { async exportGraph() { return null; }, ...overrides.exportAdapter },
    host: {
      confirm() { return false; },
      alert() {},
      getViewportSize() { return { width: 1280, height: 720 }; },
      subscribeKeydown() { return () => {}; },
      ...overrides.host,
    },
    capabilities: { imageExport: false, ...overrides.capabilities },
  });
}
