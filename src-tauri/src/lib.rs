use serde_json::Value;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

mod legacy_sqlite;
mod project_store;

const AGY_TIMEOUT_SECS: u64 = 120;

fn json_pretty(value: Option<&Value>) -> String {
    value
        .and_then(|v| serde_json::to_string_pretty(v).ok())
        .unwrap_or_else(|| "null".to_string())
}

fn json_string(value: Option<&Value>) -> String {
    value.and_then(Value::as_str).unwrap_or("").to_string()
}

fn build_agy_prompt(payload: &Value) -> String {
    let prompt = json_string(payload.get("prompt"));
    let base_node_id = json_string(payload.get("baseNodeId"));
    let selection = json_pretty(payload.get("selection"));
    let doc = json_pretty(payload.get("doc"));

    format!(
        r#"你是 Agent Context Map 的协作编辑 Agent。
请基于以下 ACM-MD JSON 文档和用户需求，生成 pending graph patch。

硬性要求：
- 只输出一个 JSON 对象，不要 Markdown，不要解释。
- 不要修改原文档；只返回建议 patch。
- 未采纳建议不得视为正式内容。
- operations 只能包含 add_node、add_edge、update_node。
- 新增节点/关系 status 默认 suggested。
- 需要人工判断的内容 status 用 needs_validation。
- 不要把 AI 建议标为 confirmed。
- 节点 type 必须是：
  Goal, Module, Feature, Page, DataEntity, API, Constraint, Risk, Assumption, Question, Decision, Task
- 关系 type 必须是：
  contains, depends_on, impacts, conflicts_with, requires, replaces, references, constrains, answers, needs_validation

返回 JSON 结构：
{{
  "id": "agent_patch_xxx",
  "createdAt": "...",
  "source": "agy_sdk",
  "prompt": "...",
  "summary": "...",
  "baseNodeId": "...",
  "operations": [
    {{
      "id": "op_xxx",
      "op": "add_node",
      "status": "pending",
      "node": {{
        "id": "feature_xxx",
        "type": "Feature",
        "title": "...",
        "status": "suggested",
        "description": "...",
        "priority": "P1",
        "source": "agy_sdk",
        "confidence": 0.72,
        "tags": ["agent_suggestion"],
        "notes": "",
        "x": 100,
        "y": 100
      }}
    }}
  ]
}}

当前选中节点：
{selection}

baseNodeId:
{base_node_id}

用户需求：
{prompt}

ACM-MD JSON 文档：
{doc}
"#,
        selection = selection,
        base_node_id = base_node_id,
        prompt = prompt,
        doc = doc
    )
}

fn agy_candidates() -> Vec<PathBuf> {
    let mut candidates = vec![PathBuf::from("agy")];
    if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
        candidates.push(
            PathBuf::from(local_app_data)
                .join("agy")
                .join("bin")
                .join("agy.exe"),
        );
    }
    if let Some(user_profile) = env::var_os("USERPROFILE") {
        candidates.push(
            PathBuf::from(user_profile)
                .join("AppData")
                .join("Local")
                .join("agy")
                .join("bin")
                .join("agy.exe"),
        );
    }
    candidates
}

fn write_agy_prompt_file(agy_prompt: &str) -> Result<PathBuf, String> {
    let dir = env::temp_dir().join("agent-context-map-agy");
    fs::create_dir_all(&dir).map_err(|err| format!("创建 agy 临时目录失败：{}", err))?;
    let file_name = format!(
        "request-agent-patch-{}-{}.txt",
        std::process::id(),
        chrono_like_timestamp()
    );
    let path = dir.join(file_name);
    fs::write(&path, agy_prompt).map_err(|err| format!("写入 agy prompt 文件失败：{}", err))?;
    Ok(path)
}

fn chrono_like_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}-{}", now.as_secs(), now.subsec_millis())
}

fn short_agy_prompt(prompt_path: &Path) -> String {
    format!(
        "请读取 UTF-8 文本文件 `{}`，严格按文件中的要求执行。只输出一个 JSON 对象，不要 Markdown，不要解释。",
        prompt_path.display()
    )
}

fn run_agy_print(agy_prompt: &str) -> Result<String, String> {
    let prompt_path = write_agy_prompt_file(agy_prompt)?;
    let prompt_dir = prompt_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "无法获取 agy prompt 临时目录".to_string())?;
    let cli_prompt = short_agy_prompt(&prompt_path);
    let mut last_spawn_error = None;
    for candidate in agy_candidates() {
        let mut child = match Command::new(&candidate)
            .arg("--add-dir")
            .arg(&prompt_dir)
            .arg("--print")
            .arg(&cli_prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => child,
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                last_spawn_error = Some(format!("{}: {}", candidate.display(), err));
                continue;
            }
            Err(err) => return Err(format!("启动 agy 失败（{}）：{}", candidate.display(), err)),
        };

        let started = Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) if started.elapsed() >= Duration::from_secs(AGY_TIMEOUT_SECS) => {
                    let _ = child.kill();
                    let output = child
                        .wait_with_output()
                        .map_err(|err| format!("agy 超时后读取输出失败：{}", err))?;
                    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    return Err(if stderr.is_empty() {
                        format!("agy 调用超时（{} 秒）", AGY_TIMEOUT_SECS)
                    } else {
                        format!("agy 调用超时（{} 秒）：{}", AGY_TIMEOUT_SECS, stderr)
                    });
                }
                Ok(None) => thread::sleep(Duration::from_millis(120)),
                Err(err) => return Err(format!("等待 agy 进程失败：{}", err)),
            }
        }

        let output = child
            .wait_with_output()
            .map_err(|err| format!("读取 agy 输出失败：{}", err))?;
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if !output.status.success() {
            return Err(if stderr.is_empty() {
                format!("agy 退出失败：{}", output.status)
            } else {
                format!("agy 退出失败：{}；{}", output.status, stderr)
            });
        }
        if stdout.is_empty() {
            return Err(if stderr.is_empty() {
                "agy 没有返回 stdout".to_string()
            } else {
                format!("agy 没有返回 stdout：{}", stderr)
            });
        }
        let _ = fs::remove_file(&prompt_path);
        return Ok(stdout);
    }

    let _ = fs::remove_file(&prompt_path);
    Err(last_spawn_error.unwrap_or_else(|| "未找到 agy 可执行文件".to_string()))
}

fn request_agent_patch_blocking(payload: Value) -> Result<Value, String> {
    let agy_prompt = build_agy_prompt(&payload);
    let stdout = run_agy_print(&agy_prompt)?;
    match serde_json::from_str::<Value>(&stdout) {
        Ok(value) => Ok(value),
        Err(_) => Ok(Value::String(stdout)),
    }
}

#[tauri::command]
async fn request_agent_patch(payload: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || request_agent_patch_blocking(payload))
        .await
        .map_err(|err| format!("agy 任务 join 失败：{}", err))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![
            request_agent_patch,
            project_store::project_scan,
            project_store::project_scan_recovery,
            project_store::project_read_index,
            project_store::project_write_document,
            project_store::project_write_index,
            project_store::project_delete_document,
            legacy_sqlite::legacy_sqlite_preview,
            legacy_sqlite::legacy_sqlite_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
