use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Row,
};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

use crate::project_store::agent_state_root;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyDocumentRow {
    pub doc_id: String,
    pub title: String,
    pub domain_profile: String,
    pub body: String,
    pub base_snapshot: Option<String>,
    pub source_path: Option<String>,
    pub dirty: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySqlitePreview {
    pub source_token: String,
    pub source_unchanged: bool,
    pub documents: Vec<LegacyDocumentRow>,
    pub snapshot_count: i64,
    pub app_state_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyBackupResult {
    pub backup_directory: String,
    pub source_token: String,
    pub source_unchanged: bool,
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|error| format!("legacy_sqlite_path_failed: {error}"))?
        .join("acm.db"))
}

fn companion_paths(db: &Path) -> [PathBuf; 2] {
    [
        db.to_path_buf(),
        PathBuf::from(format!("{}-wal", db.display())),
    ]
}

fn snapshot_bytes(db: &Path) -> Result<Vec<(String, Vec<u8>)>, String> {
    let mut files = Vec::new();
    for path in companion_paths(db) {
        match fs::read(&path) {
            Ok(bytes) => files.push((
                path.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                bytes,
            )),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(format!("legacy_sqlite_read_failed: {error}")),
        }
    }
    if files.is_empty() {
        return Err("legacy_sqlite_not_found".to_string());
    }
    Ok(files)
}

fn source_token(files: &[(String, Vec<u8>)]) -> String {
    let mut digest = Sha256::new();
    for (name, bytes) in files {
        digest.update((name.len() as u64).to_le_bytes());
        digest.update(name.as_bytes());
        digest.update((bytes.len() as u64).to_le_bytes());
        digest.update(bytes);
    }
    format!("sha256:{:x}", digest.finalize())
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[tauri::command]
pub async fn legacy_sqlite_preview(app: AppHandle) -> Result<LegacySqlitePreview, String> {
    let path = db_path(&app)?;
    let before = snapshot_bytes(&path)?;
    let options = SqliteConnectOptions::new().filename(&path).read_only(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .map_err(|error| format!("legacy_sqlite_open_read_only_failed: {error}"))?;
    let rows = sqlx::query("SELECT doc_id, title, domain_profile, body, base_snapshot, source_path, dirty, created_at, updated_at FROM documents ORDER BY updated_at DESC")
        .fetch_all(&pool).await.map_err(|error| format!("legacy_sqlite_select_failed: {error}"))?;
    let documents = rows
        .into_iter()
        .map(|row| -> Result<LegacyDocumentRow, String> {
            Ok(LegacyDocumentRow {
                doc_id: row.try_get("doc_id").map_err(|error| error.to_string())?,
                title: row.try_get("title").map_err(|error| error.to_string())?,
                domain_profile: row
                    .try_get("domain_profile")
                    .map_err(|error| error.to_string())?,
                body: row.try_get("body").map_err(|error| error.to_string())?,
                base_snapshot: row
                    .try_get("base_snapshot")
                    .map_err(|error| error.to_string())?,
                source_path: row
                    .try_get("source_path")
                    .map_err(|error| error.to_string())?,
                dirty: row.try_get("dirty").map_err(|error| error.to_string())?,
                created_at: row
                    .try_get("created_at")
                    .map_err(|error| error.to_string())?,
                updated_at: row
                    .try_get("updated_at")
                    .map_err(|error| error.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    let snapshot_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM snapshots")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    let app_state_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM app_state")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);
    pool.close().await;
    let after = snapshot_bytes(&path)?;
    if before != after {
        return Err("legacy_source_changed: SQLite changed during read-only preview".to_string());
    }
    Ok(LegacySqlitePreview {
        source_token: source_token(&before),
        source_unchanged: true,
        documents,
        snapshot_count,
        app_state_count,
    })
}

#[tauri::command]
pub fn legacy_sqlite_backup(
    app: AppHandle,
    expected_source_token: String,
) -> Result<LegacyBackupResult, String> {
    let path = db_path(&app)?;
    let before = snapshot_bytes(&path)?;
    let token = source_token(&before);
    if token != expected_source_token {
        return Err("legacy_source_changed: SQLite changed after preview".to_string());
    }
    let backup_directory = agent_state_root()?
        .join("legacy-sqlite-backups")
        .join(format!("{}-{}", now_millis(), std::process::id()));
    fs::create_dir_all(&backup_directory)
        .map_err(|error| format!("legacy_backup_create_failed: {error}"))?;
    for (name, bytes) in &before {
        let target = backup_directory.join(name);
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|error| format!("legacy_backup_write_failed: {error}"))?;
        file.write_all(bytes)
            .map_err(|error| format!("legacy_backup_write_failed: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("legacy_backup_sync_failed: {error}"))?;
    }
    let manifest = serde_json::json!({
        "schemaVersion": 1,
        "createdAtMs": now_millis(),
        "sourceToken": token,
        "files": before.iter().map(|(name, bytes)| serde_json::json!({ "name": name, "size": bytes.len() })).collect::<Vec<_>>(),
    });
    let mut manifest_file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(backup_directory.join("manifest.json"))
        .map_err(|error| format!("legacy_backup_write_failed: {error}"))?;
    manifest_file
        .write_all(
            format!(
                "{}\n",
                serde_json::to_string_pretty(&manifest).unwrap_or_default()
            )
            .as_bytes(),
        )
        .map_err(|error| format!("legacy_backup_write_failed: {error}"))?;
    manifest_file
        .sync_all()
        .map_err(|error| format!("legacy_backup_sync_failed: {error}"))?;
    let after = snapshot_bytes(&path)?;
    if before != after {
        return Err("legacy_source_changed: SQLite changed while backup was written".to_string());
    }
    Ok(LegacyBackupResult {
        backup_directory: backup_directory.to_string_lossy().to_string(),
        source_token: token,
        source_unchanged: true,
    })
}
