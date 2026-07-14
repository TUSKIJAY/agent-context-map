use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, VecDeque},
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{Arc, Condvar, Mutex, OnceLock},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;

const LOCK_TIMEOUT: Duration = Duration::from_secs(2);
const LOCK_TTL: Duration = Duration::from_secs(30);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub relative_path: String,
    pub text: String,
    pub modified_at_ms: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWriteOutcome {
    pub status: String,
    pub current_text: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecoveryTemp {
    pub temp_relative_path: String,
    pub target_relative_path: String,
    pub temp_text: String,
    pub target_text: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecoveryEvidence {
    pub temps: Vec<ProjectRecoveryTemp>,
    pub locks: Vec<serde_json::Value>,
    pub auto_action_taken: bool,
}

#[derive(Default)]
struct FairState {
    queue: VecDeque<u64>,
    held: bool,
    next_ticket: u64,
}

#[derive(Default)]
struct FairLock {
    state: Mutex<FairState>,
    changed: Condvar,
}

struct FairGuard {
    lock: Arc<FairLock>,
}

impl Drop for FairGuard {
    fn drop(&mut self) {
        if let Ok(mut state) = self.lock.state.lock() {
            state.held = false;
            self.lock.changed.notify_all();
        }
    }
}

impl FairLock {
    fn acquire(self: &Arc<Self>, timeout: Duration) -> Result<FairGuard, String> {
        let deadline = Instant::now() + timeout;
        let mut state = self
            .state
            .lock()
            .map_err(|_| "document lock poisoned".to_string())?;
        let ticket = state.next_ticket;
        state.next_ticket = state.next_ticket.wrapping_add(1);
        state.queue.push_back(ticket);
        loop {
            if !state.held && state.queue.front() == Some(&ticket) {
                state.queue.pop_front();
                state.held = true;
                return Ok(FairGuard { lock: self.clone() });
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                state.queue.retain(|queued| *queued != ticket);
                self.changed.notify_all();
                return Err("document_busy".to_string());
            }
            let (next, wait) = self
                .changed
                .wait_timeout(state, remaining)
                .map_err(|_| "document lock poisoned".to_string())?;
            state = next;
            if wait.timed_out() && (state.held || state.queue.front() != Some(&ticket)) {
                state.queue.retain(|queued| *queued != ticket);
                self.changed.notify_all();
                return Err("document_busy".to_string());
            }
        }
    }
}

fn lock_map() -> &'static Mutex<HashMap<String, Arc<FairLock>>> {
    static LOCKS: OnceLock<Mutex<HashMap<String, Arc<FairLock>>>> = OnceLock::new();
    LOCKS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn fair_lock(key: &str) -> Result<Arc<FairLock>, String> {
    let mut locks = lock_map()
        .lock()
        .map_err(|_| "lock registry poisoned".to_string())?;
    Ok(locks
        .entry(key.to_string())
        .or_insert_with(|| Arc::new(FairLock::default()))
        .clone())
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

pub(crate) fn agent_state_root() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .map(|root| root.join("AgentContextMap"))
            .ok_or_else(|| "state_directory_unavailable: LOCALAPPDATA is not set".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        return std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|root| {
                root.join("Library")
                    .join("Application Support")
                    .join("AgentContextMap")
            })
            .ok_or_else(|| "state_directory_unavailable: HOME is not set".to_string());
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        if let Some(root) = std::env::var_os("XDG_STATE_HOME") {
            return Ok(PathBuf::from(root).join("agent-context-map"));
        }
        return std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|root| root.join(".local").join("state").join("agent-context-map"))
            .ok_or_else(|| "state_directory_unavailable: HOME is not set".to_string());
    }
}

fn normalized_root_for_lock(root: &Path) -> String {
    let value = root.to_string_lossy().to_string();
    #[cfg(target_os = "windows")]
    {
        return value
            .strip_prefix(r"\\?\")
            .unwrap_or(&value)
            .replace('/', r"\")
            .to_lowercase();
    }
    #[cfg(not(target_os = "windows"))]
    {
        value
    }
}

fn lock_key(root: &Path, document_id: &str) -> String {
    format!("{}\0{}", normalized_root_for_lock(root), document_id)
}

fn lock_name(key: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(key.as_bytes());
    format!("{:x}.lock", digest.finalize())
}

fn safe_document_id(document_id: &str) -> bool {
    let bytes = document_id.as_bytes();
    !bytes.is_empty()
        && bytes.len() <= 128
        && bytes[0].is_ascii_alphanumeric()
        && bytes
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn canonical_root(project_root: &str) -> Result<PathBuf, String> {
    let root = fs::canonicalize(project_root)
        .map_err(|error| format!("project_root_unavailable: {error}"))?;
    if !root.is_dir() {
        return Err("invalid_project_root: project root must be a directory".to_string());
    }
    Ok(root)
}

fn ensure_not_symlink(path: &Path) -> Result<(), String> {
    if let Ok(metadata) = fs::symlink_metadata(path) {
        if metadata.file_type().is_symlink() {
            return Err(format!("project_symlink_rejected: {}", path.display()));
        }
    }
    Ok(())
}

fn documents_directory(root: &Path, create: bool) -> Result<PathBuf, String> {
    let acm = root.join(".acm");
    let documents = acm.join("documents");
    ensure_not_symlink(&acm)?;
    ensure_not_symlink(&documents)?;
    if create {
        fs::create_dir_all(&documents)
            .map_err(|error| format!("project_store_create_failed: {error}"))?;
    }
    if documents.exists() {
        let canonical = fs::canonicalize(&documents)
            .map_err(|error| format!("project_store_path_failed: {error}"))?;
        if !canonical.starts_with(root) {
            return Err(
                "path_escape: .acm/documents resolves outside the project root".to_string(),
            );
        }
        return Ok(canonical);
    }
    Ok(documents)
}

fn document_path(
    root: &Path,
    document_id: &str,
    create_directory: bool,
) -> Result<PathBuf, String> {
    if !safe_document_id(document_id) {
        return Err("unsafe_document_id: documentId must be a normalized safe ID".to_string());
    }
    let directory = documents_directory(root, create_directory)?;
    Ok(directory.join(format!("{document_id}.acm.md")))
}

fn lock_file(app: &AppHandle, root: &Path, document_id: &str) -> Result<PathBuf, String> {
    let _ = app;
    let directory = agent_state_root()?.join("project-locks");
    fs::create_dir_all(&directory).map_err(|error| format!("lock_directory_failed: {error}"))?;
    let key = lock_key(root, document_id);
    Ok(directory.join(lock_name(&key)))
}

struct OsLock {
    path: PathBuf,
    nonce: String,
}

impl Drop for OsLock {
    fn drop(&mut self) {
        let owned = fs::read_to_string(&self.path)
            .map(|text| text.contains(&self.nonce))
            .unwrap_or(false);
        if owned {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn acquire_os_lock(app: &AppHandle, root: &Path, document_id: &str) -> Result<OsLock, String> {
    let path = lock_file(app, root, document_id)?;
    let deadline = Instant::now() + LOCK_TIMEOUT;
    let nonce = format!("{}-{}-{}", std::process::id(), now_millis(), document_id);
    loop {
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                let payload = serde_json::json!({
                    "schemaVersion": 1,
                    "pid": std::process::id(),
                    "processNonce": nonce,
                    "projectRoot": normalized_root_for_lock(root),
                    "documentId": document_id,
                    "acquiredAtMs": now_millis(),
                    "expiresAtMs": now_millis() + LOCK_TTL.as_millis(),
                });
                file.write_all(format!("{}\n", payload).as_bytes())
                    .map_err(|error| format!("lock_write_failed: {error}"))?;
                file.sync_all()
                    .map_err(|error| format!("lock_sync_failed: {error}"))?;
                return Ok(OsLock { path, nonce });
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                if Instant::now() >= deadline {
                    return Err(
                        "document_busy: existing OS lock requires recovery review".to_string()
                    );
                }
                thread::sleep(Duration::from_millis(25));
            }
            Err(error) => return Err(format!("lock_create_failed: {error}")),
        }
    }
}

fn with_document_lock<T>(
    app: &AppHandle,
    root: &Path,
    document_id: &str,
    callback: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let key = lock_key(root, document_id);
    let lock = fair_lock(&key)?;
    let _fair_guard = lock.acquire(LOCK_TIMEOUT)?;
    let _os_guard = acquire_os_lock(app, root, document_id)?;
    callback()
}

fn sync_parent(path: &Path) {
    if let Some(parent) = path.parent() {
        if let Ok(file) = File::open(parent) {
            let _ = file.sync_all();
        }
    }
}

fn safe_replace(target: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or_else(|| "atomic_replace_failed: target has no parent".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("atomic_replace_failed: {error}"))?;
    let nonce = format!("{}-{}", std::process::id(), now_millis());
    let filename = target
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "atomic_replace_failed: invalid target filename".to_string())?;
    let temp = parent.join(format!(".{filename}.acm-write-{nonce}.tmp"));
    let result = (|| {
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        let mut file = options
            .open(&temp)
            .map_err(|error| format!("atomic_replace_failed: {error}"))?;
        file.write_all(bytes)
            .map_err(|error| format!("atomic_replace_failed: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("atomic_replace_failed: {error}"))?;
        drop(file);
        fs::rename(&temp, target).map_err(|error| format!("atomic_replace_failed: {error}"))?;
        sync_parent(target);
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

fn read_target(target: &Path) -> Result<Option<String>, String> {
    match fs::symlink_metadata(target) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err("project_symlink_rejected: document is a symlink".to_string())
        }
        Ok(_) => fs::read_to_string(target)
            .map(Some)
            .map_err(|error| format!("project_read_failed: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("project_read_failed: {error}")),
    }
}

#[tauri::command]
pub fn project_scan(project_root: String) -> Result<Vec<ProjectFile>, String> {
    let root = canonical_root(&project_root)?;
    let directory = documents_directory(&root, false)?;
    if !directory.exists() {
        return Ok(Vec::new());
    }
    let mut files = Vec::new();
    for entry in
        fs::read_dir(&directory).map_err(|error| format!("project_scan_failed: {error}"))?
    {
        let entry = entry.map_err(|error| format!("project_scan_failed: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("project_scan_failed: {error}"))?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !file_type.is_file() || file_type.is_symlink() || !name.ends_with(".acm.md") {
            continue;
        }
        let path = entry.path();
        let text =
            fs::read_to_string(&path).map_err(|error| format!("project_read_failed: {error}"))?;
        let modified_at_ms = entry
            .metadata()
            .ok()
            .and_then(|meta| meta.modified().ok())
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis())
            .unwrap_or(0);
        files.push(ProjectFile {
            relative_path: format!(".acm/documents/{name}"),
            text,
            modified_at_ms,
        });
    }
    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(files)
}

#[tauri::command]
pub fn project_scan_recovery(project_root: String) -> Result<ProjectRecoveryEvidence, String> {
    let root = canonical_root(&project_root)?;
    let directory = documents_directory(&root, false)?;
    let mut temps = Vec::new();
    if directory.exists() {
        for entry in fs::read_dir(&directory)
            .map_err(|error| format!("project_recovery_scan_failed: {error}"))?
        {
            let entry = entry.map_err(|error| format!("project_recovery_scan_failed: {error}"))?;
            if !entry
                .file_type()
                .map_err(|error| format!("project_recovery_scan_failed: {error}"))?
                .is_file()
            {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            let Some(rest) = name.strip_prefix('.') else {
                continue;
            };
            let Some((target_name, suffix)) = rest.split_once(".acm-write-") else {
                continue;
            };
            if !target_name.ends_with(".acm.md") || !suffix.ends_with(".tmp") {
                continue;
            }
            let temp_path = entry.path();
            let target_path = directory.join(target_name);
            temps.push(ProjectRecoveryTemp {
                temp_relative_path: format!(".acm/documents/{name}"),
                target_relative_path: format!(".acm/documents/{target_name}"),
                temp_text: fs::read_to_string(&temp_path)
                    .map_err(|error| format!("project_recovery_scan_failed: {error}"))?,
                target_text: match fs::read_to_string(&target_path) {
                    Ok(text) => Some(text),
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
                    Err(error) => {
                        return Err(format!("project_recovery_scan_failed: {error}"));
                    }
                },
            });
        }
    }
    let mut locks = Vec::new();
    let lock_directory = agent_state_root()?.join("project-locks");
    if lock_directory.exists() {
        let expected_root = normalized_root_for_lock(&root);
        for entry in fs::read_dir(lock_directory)
            .map_err(|error| format!("project_recovery_scan_failed: {error}"))?
        {
            let entry = entry.map_err(|error| format!("project_recovery_scan_failed: {error}"))?;
            if !entry.file_name().to_string_lossy().ends_with(".lock") {
                continue;
            }
            let Ok(text) = fs::read_to_string(entry.path()) else {
                continue;
            };
            let Ok(payload) = serde_json::from_str::<serde_json::Value>(&text) else {
                continue;
            };
            if payload.get("projectRoot").and_then(|value| value.as_str())
                == Some(expected_root.as_str())
            {
                locks.push(payload);
            }
        }
    }
    Ok(ProjectRecoveryEvidence {
        temps,
        locks,
        auto_action_taken: false,
    })
}

#[tauri::command]
pub fn project_read_index(project_root: String) -> Result<Option<String>, String> {
    let root = canonical_root(&project_root)?;
    let index = root.join(".acm").join("index.json");
    ensure_not_symlink(&root.join(".acm"))?;
    ensure_not_symlink(&index)?;
    match fs::read_to_string(index) {
        Ok(text) => Ok(Some(text)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("project_index_read_failed: {error}")),
    }
}

#[tauri::command]
pub fn project_write_document(
    app: AppHandle,
    project_root: String,
    document_id: String,
    new_text: String,
    expected_text: Option<String>,
    create: bool,
) -> Result<ProjectWriteOutcome, String> {
    let root = canonical_root(&project_root)?;
    let target = document_path(&root, &document_id, true)?;
    with_document_lock(&app, &root, &document_id, || {
        let current = read_target(&target)?;
        if create {
            if current.is_some() || expected_text.is_some() {
                return Ok(ProjectWriteOutcome {
                    status: "document_already_exists".to_string(),
                    current_text: current,
                });
            }
        } else if current.is_none() {
            return Ok(ProjectWriteOutcome {
                status: "document_not_found".to_string(),
                current_text: None,
            });
        } else if expected_text.as_deref() != current.as_deref() {
            return Ok(ProjectWriteOutcome {
                status: "revision_conflict".to_string(),
                current_text: current,
            });
        }
        safe_replace(&target, new_text.as_bytes())?;
        Ok(ProjectWriteOutcome {
            status: "committed".to_string(),
            current_text: None,
        })
    })
}

#[tauri::command]
pub fn project_write_index(
    app: AppHandle,
    project_root: String,
    new_text: String,
    expected_text: Option<String>,
) -> Result<ProjectWriteOutcome, String> {
    let root = canonical_root(&project_root)?;
    let target = root.join(".acm").join("index.json");
    with_document_lock(&app, &root, "__index__", || {
        let current = read_target(&target)?;
        if current.is_some() && expected_text.as_deref() != current.as_deref() {
            return Ok(ProjectWriteOutcome {
                status: "revision_conflict".to_string(),
                current_text: current,
            });
        }
        if current.is_none() && expected_text.is_some() {
            return Ok(ProjectWriteOutcome {
                status: "revision_conflict".to_string(),
                current_text: None,
            });
        }
        safe_replace(&target, new_text.as_bytes())?;
        Ok(ProjectWriteOutcome {
            status: "committed".to_string(),
            current_text: None,
        })
    })
}

#[tauri::command]
pub fn project_delete_document(
    app: AppHandle,
    project_root: String,
    document_id: String,
    expected_text: String,
) -> Result<ProjectWriteOutcome, String> {
    let root = canonical_root(&project_root)?;
    let target = document_path(&root, &document_id, false)?;
    with_document_lock(&app, &root, &document_id, || {
        let current = read_target(&target)?;
        if current.is_none() {
            return Ok(ProjectWriteOutcome {
                status: "already_absent".to_string(),
                current_text: None,
            });
        }
        if current.as_deref() != Some(expected_text.as_str()) {
            return Ok(ProjectWriteOutcome {
                status: "revision_conflict".to_string(),
                current_text: current,
            });
        }
        let trash = agent_state_root()?.join("deleted-documents");
        fs::create_dir_all(&trash).map_err(|error| format!("delete_backup_failed: {error}"))?;
        let backup = trash.join(format!(
            "{document_id}-{}-{}.acm.md",
            now_millis(),
            std::process::id()
        ));
        let bytes = current.unwrap().into_bytes();
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&backup)
            .map_err(|error| format!("delete_backup_failed: {error}"))?;
        file.write_all(&bytes)
            .map_err(|error| format!("delete_backup_failed: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("delete_backup_failed: {error}"))?;
        drop(file);
        fs::remove_file(&target).map_err(|error| format!("project_delete_failed: {error}"))?;
        sync_parent(&target);
        Ok(ProjectWriteOutcome {
            status: "deleted".to_string(),
            current_text: None,
        })
    })
}

#[cfg(test)]
mod tests {
    use super::{lock_key, lock_name, safe_document_id, safe_replace};
    use std::fs;
    use std::path::Path;

    #[test]
    fn normalized_document_ids_only() {
        assert!(safe_document_id("acm_test-01.v1"));
        assert!(!safe_document_id("../escape"));
        assert!(!safe_document_id("folder/doc"));
        assert!(!safe_document_id(""));
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn cross_runtime_lock_key_and_filename_are_stable() {
        let key = lock_key(Path::new(r"\\?\D:\Code\Repo"), "doc");
        assert_eq!(key, "d:\\code\\repo\0doc");
        assert_eq!(
            lock_name(&key),
            "1f3bf62a6923a1b4a974ac39720504b620b0f22e983aae308a267cdbaa48335d.lock"
        );
    }

    #[test]
    fn same_volume_replace_overwrites_complete_file() {
        let directory = std::env::temp_dir().join(format!(
            "agent-context-map-rust-replace-{}-{}",
            std::process::id(),
            super::now_millis()
        ));
        fs::create_dir_all(&directory).unwrap();
        let target = directory.join("document.acm.md");
        fs::write(&target, b"old-complete-document").unwrap();
        safe_replace(&target, b"new-complete-document").unwrap();
        assert_eq!(fs::read(&target).unwrap(), b"new-complete-document");
        fs::remove_dir_all(&directory).unwrap();
    }
}
