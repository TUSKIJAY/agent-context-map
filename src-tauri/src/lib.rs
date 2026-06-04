use tauri_plugin_sql::{Migration, MigrationKind};

// SQLite schema for local persistence. The graph body is stored as a JSON blob
// per document (lossless ACM-MD round-trip), with title/updated_at indexed for
// fast "recent documents" listing. app_state holds last-opened id, window and
// viewport so the editor can restore the previous working session.
const MIGRATIONS_V1: &str = "
CREATE TABLE IF NOT EXISTS documents (
  doc_id         TEXT PRIMARY KEY,
  title          TEXT NOT NULL DEFAULT '',
  domain_profile TEXT NOT NULL DEFAULT 'generic',
  body           TEXT NOT NULL,
  base_snapshot  TEXT,
  source_path    TEXT,
  dirty          INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT '',
  updated_at     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

CREATE TABLE IF NOT EXISTS snapshots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id     TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_snapshots_doc ON snapshots(doc_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![Migration {
    version: 1,
    description: "create core tables: documents, snapshots, app_state",
    sql: MIGRATIONS_V1,
    kind: MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:acm.db", migrations)
        .build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
