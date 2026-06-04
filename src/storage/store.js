// store.js — document-level local persistence for Agent Context Map.
//
// Two backends behind one async API:
//   • Tauri desktop  → SQLite via @tauri-apps/plugin-sql (the real product).
//   • Browser dev     → localStorage fallback, so `npm run dev` still works
//                       without the Tauri runtime.
//
// The ACM-MD graph body is stored as a JSON blob per document so the protocol
// round-trip never loses fields; title/updated_at are kept as columns for fast
// "recent documents" listing. Schema is created by the Rust-side migrations
// (see src-tauri/src/lib.rs); this module only reads/writes.
import Database from "@tauri-apps/plugin-sql";

// __TAURI_INTERNALS__ is always injected into the Tauri webview (it backs IPC),
// so it is the most reliable "am I running inside the desktop shell?" signal.
const inTauri =
  typeof window !== "undefined" &&
  (window.isTauri === true || typeof window.__TAURI_INTERNALS__ !== "undefined");

export const persistenceMode = inTauri ? "sqlite" : "local";

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------- SQLite ----
let _dbPromise = null;
function getDb() {
  if (!_dbPromise) _dbPromise = Database.load("sqlite:acm.db");
  return _dbPromise;
}

const sqliteBackend = {
  async listDocuments() {
    const db = await getDb();
    const rows = await db.select(
      "SELECT doc_id, title, domain_profile, source_path, dirty, created_at, updated_at FROM documents ORDER BY updated_at DESC"
    );
    return rows.map((r) => ({ ...r, dirty: !!r.dirty, source_path: r.source_path || null }));
  },
  async getDocument(docId) {
    const db = await getDb();
    const rows = await db.select("SELECT * FROM documents WHERE doc_id = $1", [docId]);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      doc_id: r.doc_id,
      title: r.title,
      domain_profile: r.domain_profile,
      body: JSON.parse(r.body),
      base_snapshot: r.base_snapshot ? JSON.parse(r.base_snapshot) : null,
      source_path: r.source_path || null,
      dirty: !!r.dirty,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  },
  async upsertDocument(rec) {
    const db = await getDb();
    const now = nowIso();
    const body = JSON.stringify(rec.body);
    const baseSnap = rec.base_snapshot != null ? JSON.stringify(rec.base_snapshot) : null;
    await db.execute(
      `INSERT INTO documents (doc_id, title, domain_profile, body, base_snapshot, source_path, dirty, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT(doc_id) DO UPDATE SET
         title=excluded.title, domain_profile=excluded.domain_profile,
         body=excluded.body, base_snapshot=excluded.base_snapshot,
         source_path=excluded.source_path, dirty=excluded.dirty,
         updated_at=excluded.updated_at`,
      [rec.doc_id, rec.title || "", rec.domain_profile || "generic", body, baseSnap,
        rec.source_path || null, rec.dirty ? 1 : 0, rec.created_at || now, now]
    );
    return now;
  },
  async deleteDocument(docId) {
    const db = await getDb();
    await db.execute("DELETE FROM documents WHERE doc_id = $1", [docId]);
    await db.execute("DELETE FROM snapshots WHERE doc_id = $1", [docId]);
  },
  // Autosave path: update body/title/dirty only — never touches base_snapshot.
  async saveBody(docId, { title, domain_profile, body, dirty }) {
    const db = await getDb();
    await db.execute(
      "UPDATE documents SET title=$1, domain_profile=$2, body=$3, dirty=$4, updated_at=$5 WHERE doc_id=$6",
      [title || "", domain_profile || "generic", JSON.stringify(body), dirty ? 1 : 0, nowIso(), docId]
    );
  },
  // Manual save: move the diff baseline forward and clear dirty.
  async saveBaseline(docId, baseBody) {
    const db = await getDb();
    await db.execute(
      "UPDATE documents SET base_snapshot=$1, dirty=0, updated_at=$2 WHERE doc_id=$3",
      [JSON.stringify(baseBody), nowIso(), docId]
    );
  },
  async getAppState(key, fallback = null) {
    const db = await getDb();
    const rows = await db.select("SELECT value FROM app_state WHERE key = $1", [key]);
    if (!rows.length) return fallback;
    try { return JSON.parse(rows[0].value); } catch { return fallback; }
  },
  async setAppState(key, value) {
    const db = await getDb();
    await db.execute(
      `INSERT INTO app_state (key, value) VALUES ($1,$2)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
      [key, JSON.stringify(value)]
    );
  },
  async addSnapshot(docId, label, body) {
    const db = await getDb();
    await db.execute(
      "INSERT INTO snapshots (doc_id, label, body, created_at) VALUES ($1,$2,$3,$4)",
      [docId, label || "", JSON.stringify(body), nowIso()]
    );
  },
  async listSnapshots(docId) {
    const db = await getDb();
    return db.select(
      "SELECT id, label, created_at FROM snapshots WHERE doc_id = $1 ORDER BY created_at DESC",
      [docId]
    );
  },
};

// ----------------------------------------------------- localStorage (dev) ----
const LS = typeof localStorage !== "undefined" ? localStorage : null;
const K = {
  index: "acm:index",
  doc: (id) => "acm:doc:" + id,
  state: (key) => "acm:state:" + key,
  snaps: (id) => "acm:snaps:" + id,
};
const lsGet = (key, fb) => { try { const v = LS.getItem(key); return v == null ? fb : JSON.parse(v); } catch { return fb; } };
const lsSet = (key, val) => { try { LS.setItem(key, JSON.stringify(val)); } catch (e) { console.warn("[store] localStorage write failed", e); } };

const localBackend = {
  async listDocuments() {
    return lsGet(K.index, [])
      .map((id) => lsGet(K.doc(id), null))
      .filter(Boolean)
      .map((d) => ({ doc_id: d.doc_id, title: d.title, domain_profile: d.domain_profile,
        source_path: d.source_path || null, dirty: !!d.dirty, created_at: d.created_at, updated_at: d.updated_at }))
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
  },
  async getDocument(docId) {
    const d = lsGet(K.doc(docId), null);
    if (!d) return null;
    return { ...d, base_snapshot: d.base_snapshot ?? null, source_path: d.source_path || null, dirty: !!d.dirty };
  },
  async upsertDocument(rec) {
    const now = nowIso();
    const existing = lsGet(K.doc(rec.doc_id), null);
    lsSet(K.doc(rec.doc_id), {
      doc_id: rec.doc_id, title: rec.title || "", domain_profile: rec.domain_profile || "generic",
      body: rec.body, base_snapshot: rec.base_snapshot != null ? rec.base_snapshot : null,
      source_path: rec.source_path || null, dirty: rec.dirty ? 1 : 0,
      created_at: rec.created_at || existing?.created_at || now, updated_at: now,
    });
    const idx = lsGet(K.index, []);
    if (!idx.includes(rec.doc_id)) { idx.push(rec.doc_id); lsSet(K.index, idx); }
    return now;
  },
  async deleteDocument(docId) {
    LS?.removeItem(K.doc(docId));
    LS?.removeItem(K.snaps(docId));
    lsSet(K.index, lsGet(K.index, []).filter((id) => id !== docId));
  },
  async saveBody(docId, { title, domain_profile, body, dirty }) {
    const d = lsGet(K.doc(docId), null);
    if (!d) return;
    lsSet(K.doc(docId), { ...d, title: title ?? d.title, domain_profile: domain_profile ?? d.domain_profile,
      body, dirty: dirty ? 1 : 0, updated_at: nowIso() });
  },
  async saveBaseline(docId, baseBody) {
    const d = lsGet(K.doc(docId), null);
    if (!d) return;
    lsSet(K.doc(docId), { ...d, base_snapshot: baseBody, dirty: 0, updated_at: nowIso() });
  },
  async getAppState(key, fallback = null) { return lsGet(K.state(key), fallback); },
  async setAppState(key, value) { lsSet(K.state(key), value); },
  async addSnapshot(docId, label, body) {
    const arr = lsGet(K.snaps(docId), []);
    arr.unshift({ id: Date.now(), label: label || "", created_at: nowIso(), body });
    lsSet(K.snaps(docId), arr.slice(0, 50));
  },
  async listSnapshots(docId) {
    return lsGet(K.snaps(docId), []).map(({ id, label, created_at }) => ({ id, label, created_at }));
  },
};

// ---------------------------------------------------------------- export ----
const backend = inTauri ? sqliteBackend : localBackend;

export const listDocuments = () => backend.listDocuments();
export const getDocument = (id) => backend.getDocument(id);
export const upsertDocument = (rec) => backend.upsertDocument(rec);
export const saveBody = (id, fields) => backend.saveBody(id, fields);
export const saveBaseline = (id, base) => backend.saveBaseline(id, base);
export const deleteDocument = (id) => backend.deleteDocument(id);
export const getAppState = (key, fallback) => backend.getAppState(key, fallback);
export const setAppState = (key, value) => backend.setAppState(key, value);
export const addSnapshot = (id, label, body) => backend.addSnapshot(id, label, body);
export const listSnapshots = (id) => backend.listSnapshots(id);
