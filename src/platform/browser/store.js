const nowIso = () => new Date().toISOString();

export function createBrowserDemoStore(storage = globalThis.localStorage) {
  const keys = {
    index: "acm:index",
    doc: (id) => `acm:doc:${id}`,
    state: (key) => `acm:state:${key}`,
    snapshots: (id) => `acm:snaps:${id}`,
  };
  const get = (key, fallback) => {
    try { const value = storage?.getItem(key); return value == null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  };
  const set = (key, value) => {
    try { storage?.setItem(key, JSON.stringify(value)); }
    catch (error) { console.warn("[browser-demo-store] local state write failed", error); }
  };

  return {
    persistenceMode: "local",
    async listDocuments() {
      return get(keys.index, []).map((id) => get(keys.doc(id), null)).filter(Boolean).map((record) => ({
        doc_id: record.doc_id, title: record.title, domain_profile: record.domain_profile,
        source_path: record.source_path || null, dirty: Boolean(record.dirty),
        created_at: record.created_at, updated_at: record.updated_at,
      })).sort((left, right) => (right.updated_at || "").localeCompare(left.updated_at || ""));
    },
    async getDocument(id) {
      const record = get(keys.doc(id), null);
      return record ? { ...record, base_snapshot: record.base_snapshot ?? null, source_path: record.source_path || null, dirty: Boolean(record.dirty) } : null;
    },
    async upsertDocument(record) {
      const now = nowIso();
      const existing = get(keys.doc(record.doc_id), null);
      set(keys.doc(record.doc_id), {
        doc_id: record.doc_id, title: record.title || "", domain_profile: record.domain_profile || "generic",
        body: record.body, base_snapshot: record.base_snapshot ?? null, source_path: record.source_path || null,
        dirty: record.dirty ? 1 : 0, created_at: record.created_at || existing?.created_at || now, updated_at: now,
      });
      const index = get(keys.index, []);
      if (!index.includes(record.doc_id)) { index.push(record.doc_id); set(keys.index, index); }
      return now;
    },
    async deleteDocument(id) {
      storage?.removeItem(keys.doc(id));
      storage?.removeItem(keys.snapshots(id));
      set(keys.index, get(keys.index, []).filter((item) => item !== id));
    },
    async saveBody(id, fields) {
      const record = get(keys.doc(id), null);
      if (record) set(keys.doc(id), { ...record, ...fields, dirty: fields.dirty ? 1 : 0, updated_at: nowIso() });
    },
    async saveBaseline(id, base) {
      const record = get(keys.doc(id), null);
      if (record) set(keys.doc(id), { ...record, base_snapshot: base, dirty: 0, updated_at: nowIso() });
    },
    async getAppState(key, fallback = null) { return get(keys.state(key), fallback); },
    async setAppState(key, value) { set(keys.state(key), value); },
    async addSnapshot(id, label, body) {
      const items = get(keys.snapshots(id), []);
      items.unshift({ id: Date.now(), label: label || "", created_at: nowIso(), body });
      set(keys.snapshots(id), items.slice(0, 50));
    },
    async listSnapshots(id) { return get(keys.snapshots(id), []).map(({ id: snapshotId, label, created_at }) => ({ id: snapshotId, label, created_at })); },
    async selectProjectRoot() { return null; },
    getProjectInfo() { return null; },
    getProjectDiagnostics() { return { invalid: [], recovery: [], indexStatus: "browser_demo" }; },
    async previewLegacyMigration() { throw new Error("SQLite migration is available only in the desktop app."); },
    async backupLegacyMigration() { throw new Error("SQLite migration is available only in the desktop app."); },
    async migrateLegacyDocument() { throw new Error("SQLite migration is available only in the desktop app."); },
  };
}
