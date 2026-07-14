// store.js — document persistence facade.
//
// Desktop business truth is the user-selected project's
// `.acm/documents/*.acm.md`. SQLite is not a write backend; it is reachable
// only through the explicit read-only migration flow. Browser preview keeps a
// clearly labelled localStorage demo backend and never synchronizes to a
// project directory.
import {
  backend as projectBackend,
  backupLegacyMigration as backupLegacyMigrationNative,
  getProjectDiagnostics as getProjectDiagnosticsNative,
  getProjectInfo as getProjectInfoNative,
  migrateLegacyDocument as migrateLegacyDocumentNative,
  previewLegacyMigration as previewLegacyMigrationNative,
  selectProjectRoot as selectProjectRootNative,
} from "./tauriProjectStore.js";

const inTauri =
  typeof window !== "undefined"
  && (window.isTauri === true || typeof window.__TAURI_INTERNALS__ !== "undefined");

export const persistenceMode = inTauri ? "project" : "local";
const nowIso = () => new Date().toISOString();

// Browser-only development fallback. This remains intentionally isolated from
// desktop project files and is not a product content source.
const LS = typeof localStorage !== "undefined" ? localStorage : null;
const K = {
  index: "acm:index",
  doc: (id) => `acm:doc:${id}`,
  state: (key) => `acm:state:${key}`,
  snaps: (id) => `acm:snaps:${id}`,
};
const lsGet = (key, fallback) => {
  try {
    const value = LS?.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};
const lsSet = (key, value) => {
  try { LS?.setItem(key, JSON.stringify(value)); } catch (error) { console.warn("[store] localStorage write failed", error); }
};

const localBackend = {
  async listDocuments() {
    return lsGet(K.index, [])
      .map((id) => lsGet(K.doc(id), null))
      .filter(Boolean)
      .map((record) => ({
        doc_id: record.doc_id,
        title: record.title,
        domain_profile: record.domain_profile,
        source_path: record.source_path || null,
        dirty: Boolean(record.dirty),
        created_at: record.created_at,
        updated_at: record.updated_at,
      }))
      .sort((left, right) => (right.updated_at || "").localeCompare(left.updated_at || ""));
  },
  async getDocument(documentId) {
    const record = lsGet(K.doc(documentId), null);
    return record ? { ...record, base_snapshot: record.base_snapshot ?? null, source_path: record.source_path || null, dirty: Boolean(record.dirty) } : null;
  },
  async upsertDocument(record) {
    const now = nowIso();
    const existing = lsGet(K.doc(record.doc_id), null);
    lsSet(K.doc(record.doc_id), {
      doc_id: record.doc_id,
      title: record.title || "",
      domain_profile: record.domain_profile || "generic",
      body: record.body,
      base_snapshot: record.base_snapshot != null ? record.base_snapshot : null,
      source_path: record.source_path || null,
      dirty: record.dirty ? 1 : 0,
      created_at: record.created_at || existing?.created_at || now,
      updated_at: now,
    });
    const index = lsGet(K.index, []);
    if (!index.includes(record.doc_id)) { index.push(record.doc_id); lsSet(K.index, index); }
    return now;
  },
  async deleteDocument(documentId) {
    LS?.removeItem(K.doc(documentId));
    LS?.removeItem(K.snaps(documentId));
    lsSet(K.index, lsGet(K.index, []).filter((id) => id !== documentId));
  },
  async saveBody(documentId, { title, domain_profile, body, dirty }) {
    const record = lsGet(K.doc(documentId), null);
    if (!record) return;
    lsSet(K.doc(documentId), {
      ...record,
      title: title ?? record.title,
      domain_profile: domain_profile ?? record.domain_profile,
      body,
      dirty: dirty ? 1 : 0,
      updated_at: nowIso(),
    });
  },
  async saveBaseline(documentId, baseBody) {
    const record = lsGet(K.doc(documentId), null);
    if (record) lsSet(K.doc(documentId), { ...record, base_snapshot: baseBody, dirty: 0, updated_at: nowIso() });
  },
  async getAppState(key, fallback = null) { return lsGet(K.state(key), fallback); },
  async setAppState(key, value) { lsSet(K.state(key), value); },
  async addSnapshot(documentId, label, body) {
    const snapshots = lsGet(K.snaps(documentId), []);
    snapshots.unshift({ id: Date.now(), label: label || "", created_at: nowIso(), body });
    lsSet(K.snaps(documentId), snapshots.slice(0, 50));
  },
  async listSnapshots(documentId) {
    return lsGet(K.snaps(documentId), []).map(({ id, label, created_at }) => ({ id, label, created_at }));
  },
};

const backend = inTauri ? projectBackend : localBackend;

export const listDocuments = () => backend.listDocuments();
export const getDocument = (id) => backend.getDocument(id);
export const upsertDocument = (record) => backend.upsertDocument(record);
export const saveBody = (id, fields) => backend.saveBody(id, fields);
export const saveBaseline = (id, base) => backend.saveBaseline(id, base);
export const deleteDocument = (id) => backend.deleteDocument(id);
export const getAppState = (key, fallback) => backend.getAppState(key, fallback);
export const setAppState = (key, value) => backend.setAppState(key, value);
export const addSnapshot = (id, label, body) => backend.addSnapshot(id, label, body);
export const listSnapshots = (id) => backend.listSnapshots(id);

export const selectProjectRoot = () => inTauri ? selectProjectRootNative() : Promise.resolve(null);
export const getProjectInfo = () => inTauri ? getProjectInfoNative() : null;
export const getProjectDiagnostics = () => inTauri ? getProjectDiagnosticsNative() : { invalid: [], recovery: [], indexStatus: "browser_demo" };
export const previewLegacyMigration = () => {
  if (!inTauri) return Promise.reject(new Error("SQLite migration is available only in the desktop app."));
  return previewLegacyMigrationNative();
};
export const backupLegacyMigration = (sourceToken) => backupLegacyMigrationNative(sourceToken);
export const migrateLegacyDocument = (candidate) => migrateLegacyDocumentNative(candidate);
