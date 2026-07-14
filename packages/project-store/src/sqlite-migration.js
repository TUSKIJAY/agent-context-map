import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ProjectStoreError } from "./errors.js";
export { createMigrationPlan, previewLegacyDocument } from "./migration-preview.js";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readCompanions(dbPath) {
  const result = [];
  // `-shm` is an ephemeral shared-memory coordination file and may be touched
  // by a read-only WAL reader. The durable snapshot is the main DB + WAL.
  for (const suffix of ["", "-wal"]) {
    const sourcePath = `${dbPath}${suffix}`;
    try { result.push({ suffix, bytes: await fs.readFile(sourcePath) }); } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return result;
}

function companionDigest(files) {
  return files.map((file) => `${file.suffix}:${sha256(file.bytes)}`).join("|");
}

function queryRows(db, sql) {
  try { return db.prepare(sql).all(); } catch (error) {
    if (/no such table/i.test(error?.message || "")) return [];
    throw error;
  }
}

export async function readLegacySqlite(dbPath) {
  const resolved = path.resolve(dbPath);
  const before = await readCompanions(resolved);
  if (!before.some((file) => file.suffix === "")) throw new ProjectStoreError("legacy_sqlite_not_found", "Legacy SQLite database was not found.", { dbPath: resolved });
  const database = new DatabaseSync(resolved, { readOnly: true });
  let documents;
  let snapshots;
  let appState;
  try {
    database.exec("PRAGMA query_only = ON");
    documents = queryRows(database, "SELECT doc_id, title, domain_profile, body, base_snapshot, source_path, dirty, created_at, updated_at FROM documents ORDER BY updated_at DESC");
    snapshots = queryRows(database, "SELECT id, doc_id, label, body, created_at FROM snapshots ORDER BY id");
    appState = queryRows(database, "SELECT key, value FROM app_state ORDER BY key");
  } finally {
    database.close();
  }
  const after = await readCompanions(resolved);
  if (companionDigest(before) !== companionDigest(after)) {
    throw new ProjectStoreError("legacy_source_changed", "Legacy SQLite changed during the read-only snapshot; retry after closing other writers.", { dbPath: resolved });
  }
  return {
    dbPath: resolved,
    sourceDigest: companionDigest(before),
    sourceFiles: before.map((file) => ({ suffix: file.suffix, size: file.bytes.length, sha256: sha256(file.bytes) })),
    documents,
    snapshots,
    appState,
    sourceUnchanged: true,
  };
}

export async function backupLegacySqlite(snapshot, backupRoot) {
  const current = await readCompanions(snapshot.dbPath);
  if (companionDigest(current) !== snapshot.sourceDigest) {
    throw new ProjectStoreError("legacy_source_changed", "Legacy SQLite changed after preview; migration was not started.");
  }
  const backupId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const destination = path.join(path.resolve(backupRoot), backupId);
  await fs.mkdir(destination, { recursive: true });
  for (const file of current) {
    const name = file.suffix ? `acm.db${file.suffix}` : "acm.db";
    const target = path.join(destination, name);
    const handle = await fs.open(target, "wx", 0o600);
    try { await handle.writeFile(file.bytes); await handle.sync(); } finally { await handle.close(); }
  }
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceDigest: snapshot.sourceDigest,
    files: current.map((file) => ({ name: file.suffix ? `acm.db${file.suffix}` : "acm.db", size: file.bytes.length, sha256: sha256(file.bytes) })),
  };
  await fs.writeFile(path.join(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return { destination, manifest };
}

export async function rollbackMigration(projectStore, committed) {
  const rolledBack = [];
  const conflicts = [];
  for (const entry of [...committed].reverse()) {
    try {
      const result = await projectStore.deleteDocument({
        documentId: entry.documentId,
        expectedRevision: entry.newRevision,
        clientMutationId: `migration-rollback-${entry.mutationId}`,
      });
      rolledBack.push(result);
    } catch (error) {
      conflicts.push({ documentId: entry.documentId, code: error.code || "rollback_failed", message: error.message });
    }
  }
  return { ok: conflicts.length === 0, rolledBack, conflicts };
}

export async function applyMigrationPlan({ snapshot, plan, projectStore, backupRoot, selectedDocumentIds = null } = {}) {
  if (!plan?.allValid) throw new ProjectStoreError("migration_preview_invalid", "Migration apply requires an all-valid preview.", { documents: plan?.documents });
  const selected = selectedDocumentIds ? new Set(selectedDocumentIds) : new Set(plan.documents.map((document) => document.documentId));
  const candidates = plan.documents.filter((document) => selected.has(document.documentId));
  const existing = await projectStore.scanDocuments();
  const collisions = candidates.filter((candidate) => existing.documents.some((record) => record.documentId === candidate.documentId));
  if (collisions.length) throw new ProjectStoreError("migration_target_exists", "Migration will not overwrite existing project documents.", { documentIds: collisions.map((item) => item.documentId) });
  const backup = await backupLegacySqlite(snapshot, backupRoot);
  const committed = [];
  try {
    for (const candidate of candidates) {
      const mutationId = `sqlite-migration-${candidate.documentId}-${randomUUID()}`;
      const result = await projectStore.writeDocument({
        documentId: candidate.documentId,
        document: candidate.document,
        create: true,
        expectedRevision: null,
        clientMutationId: mutationId,
      });
      committed.push({ documentId: candidate.documentId, newRevision: result.newRevision, mutationId });
    }
    const after = await readCompanions(snapshot.dbPath);
    if (companionDigest(after) !== snapshot.sourceDigest) throw new ProjectStoreError("legacy_source_changed", "Legacy SQLite changed while project files were committed.");
    return { status: "migration_committed", backup, committed, sourceUnchanged: true };
  } catch (error) {
    const rollback = await rollbackMigration(projectStore, committed);
    throw new ProjectStoreError(rollback.ok ? "migration_rolled_back" : "migration_recovery_required", error?.message || String(error), {
      causeCode: error?.code,
      backup,
      committed,
      rollback,
    });
  }
}
