import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  ProjectStore,
  ProjectStoreError,
} from "../../packages/project-store/src/index.js";
import {
  applyMigrationPlan,
  createMigrationPlan,
  readLegacySqlite,
} from "../../packages/project-store/src/sqlite-migration.js";
import { makeDoc, repoRoot, tempWorkspace } from "./helpers.js";

const cleanups = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()(); });

async function hashFile(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

function createLegacyDatabase(dbPath, rows) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE documents (
      doc_id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', domain_profile TEXT NOT NULL DEFAULT 'generic',
      body TEXT NOT NULL, base_snapshot TEXT, source_path TEXT, dirty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '');
    CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const insert = db.prepare("INSERT INTO documents (doc_id,title,domain_profile,body,base_snapshot,source_path,dirty,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)");
  for (const row of rows) insert.run(row.doc_id, row.title, row.domain_profile || "generic", row.body, row.base_snapshot ?? null, null, row.dirty ? 1 : 0, "2026-07-14T00:00:00.000Z", "2026-07-14T00:00:00.000Z");
  db.prepare("INSERT INTO snapshots (doc_id,label,body,created_at) VALUES (?,?,?,?)").run(rows[0].doc_id, "legacy snapshot", rows[0].body, "2026-07-14T00:00:00.000Z");
  db.prepare("INSERT INTO app_state (key,value) VALUES (?,?)").run("last_opened_doc_id", JSON.stringify(rows[0].doc_id));
  db.close();
}

function rowFor(doc) {
  return { doc_id: doc.doc_id, title: doc.meta.title, domain_profile: "generic", body: JSON.stringify(doc), base_snapshot: JSON.stringify(doc), dirty: 0 };
}

describe("legacy SQLite read-only migration", () => {
  it("reads in query-only mode, produces a lossless preview, and passes both validators", async () => {
    const workspace = await tempWorkspace("acm-sqlite-migration-");
    cleanups.push(workspace.cleanup);
    const dbPath = path.join(workspace.parent, "acm.db");
    createLegacyDatabase(dbPath, [rowFor(makeDoc("acm_legacy_001", "Legacy valid"))]);
    const before = await hashFile(dbPath);
    const snapshot = await readLegacySqlite(dbPath);
    const plan = createMigrationPlan(snapshot);
    expect(plan).toMatchObject({ allValid: true, sourceUnchanged: true, preservedLegacyState: { snapshotCount: 1, appStateCount: 1 } });
    expect(plan.documents[0]).toMatchObject({ ok: true, roundTripEquivalent: true, baseSnapshotStatus: "valid_preserved_in_legacy_backup" });
    const candidate = path.join(workspace.parent, "candidate.acm.md");
    await fs.writeFile(candidate, plan.documents[0].canonicalText, "utf8");
    const validator = path.join(repoRoot, "skills", "acm-md", "scripts", "validate_acm_md.py");
    expect(() => execFileSync("python", [validator, candidate], { cwd: repoRoot, stdio: "pipe" })).not.toThrow();
    expect(await hashFile(dbPath)).toBe(before);
  });

  it("applies only after an all-valid preview, keeps SQLite unchanged, and writes a verified backup", async () => {
    const workspace = await tempWorkspace("acm-sqlite-apply-");
    cleanups.push(workspace.cleanup);
    const dbPath = path.join(workspace.parent, "acm.db");
    createLegacyDatabase(dbPath, [rowFor(makeDoc("acm_legacy_001", "Legacy valid"))]);
    const before = await hashFile(dbPath);
    const snapshot = await readLegacySqlite(dbPath);
    const plan = createMigrationPlan(snapshot);
    const store = new ProjectStore(workspace);
    const result = await applyMigrationPlan({ snapshot, plan, projectStore: store, backupRoot: path.join(workspace.stateRoot, "legacy-backups") });
    expect(result).toMatchObject({ status: "migration_committed", sourceUnchanged: true });
    expect((await store.readDocument("acm_legacy_001")).doc.meta.title).toBe("Legacy valid");
    expect(await hashFile(dbPath)).toBe(before);
    const backupDb = path.join(result.backup.destination, "acm.db");
    expect(await hashFile(backupDb)).toBe(before);
    expect(JSON.parse(await fs.readFile(path.join(result.backup.destination, "manifest.json"), "utf8")).sourceDigest).toBe(snapshot.sourceDigest);
  });

  it("is all-or-report for invalid documents and creates no project store", async () => {
    const workspace = await tempWorkspace("acm-sqlite-invalid-");
    cleanups.push(workspace.cleanup);
    const dbPath = path.join(workspace.parent, "acm.db");
    createLegacyDatabase(dbPath, [rowFor(makeDoc("acm_legacy_001")), { doc_id: "broken", title: "Broken", body: "{not-json", base_snapshot: null }]);
    const snapshot = await readLegacySqlite(dbPath);
    const plan = createMigrationPlan(snapshot);
    expect(plan.allValid).toBe(false);
    const store = new ProjectStore(workspace);
    await expect(applyMigrationPlan({ snapshot, plan, projectStore: store, backupRoot: workspace.stateRoot }))
      .rejects.toMatchObject({ code: "migration_preview_invalid" });
    expect((await store.scanDocuments()).documents).toHaveLength(0);
  });

  it("rolls back newly created documents when a later apply fails", async () => {
    const workspace = await tempWorkspace("acm-sqlite-rollback-");
    cleanups.push(workspace.cleanup);
    const dbPath = path.join(workspace.parent, "acm.db");
    createLegacyDatabase(dbPath, [rowFor(makeDoc("acm_legacy_001")), rowFor(makeDoc("acm_legacy_002"))]);
    const snapshot = await readLegacySqlite(dbPath);
    const plan = createMigrationPlan(snapshot);
    const store = new ProjectStore(workspace);
    const write = store.writeDocument.bind(store);
    let calls = 0;
    store.writeDocument = async (input) => {
      calls += 1;
      if (calls === 2) throw new ProjectStoreError("fault_injected", "second document failed");
      return write(input);
    };
    await expect(applyMigrationPlan({ snapshot, plan, projectStore: store, backupRoot: path.join(workspace.stateRoot, "backups") }))
      .rejects.toMatchObject({ code: "migration_rolled_back", details: { rollback: { ok: true } } });
    expect((await store.scanDocuments()).documents).toHaveLength(0);
  });
});
