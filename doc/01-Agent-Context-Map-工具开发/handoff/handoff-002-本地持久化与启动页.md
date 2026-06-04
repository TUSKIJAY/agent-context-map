# Handoff 002 · 本地持久化（SQLite）与启动页

状态：P1 存储地基 / P2 启动页+会话恢复 / P3 自动保存 已实现并验证；P4 待办
优先级：P0（产品从"演示原型"补成"可长期使用工具"的核心能力）
日期：2026-06-03
目标读者：接手实现的 Agent（按本文件独立执行，无需本次会话上下文）

---

## 0. 背景

此前应用是纯内存 React state：`App.jsx` 启动即 `useState(()=>sampleDoc())` 直接进演示图谱；「保存」只重置内存 diff 基线、「打开」只重载示例；关闭即全丢。用户提出两个硬要求：

1. 必须有记录保存 → 用真正的数据库。
2. 正经软件不应一打开就是演示文档。

经确认（用户拍板三选项）：用 **SQLite 嵌入式数据库**；启动做 **开始页 + 自动恢复上次**；演示图谱 **降级为「查看示例」入口**。与 plan §5.2 / §6.4 / §8.1 一致。

## 1. 本次已完成

### 存储地基（P1）

- `src-tauri/Cargo.toml`：新增 `tauri-plugin-sql = { version = "2", features = ["sqlite"] }`。
- `src-tauri/src/lib.rs`：注册 `tauri_plugin_sql` 并挂迁移，建三张表：
  - `documents(doc_id PK, title, domain_profile, body, base_snapshot, source_path, dirty, created_at, updated_at)` + `idx_documents_updated_at`
  - `snapshots(id PK, doc_id, label, body, created_at)` + `idx_snapshots_doc`
  - `app_state(key PK, value)`
  - 图谱正文（含运行时 x/y）按整份 JSON 存 `body`，**保证 ACM-MD 往返不丢字段**。
- `src-tauri/capabilities/default.json`：新增 `sql:default` / `sql:allow-load|execute|select|close`。
- `src/storage/store.js`：文档级抽象层，两套后端：
  - 桌面：`@tauri-apps/plugin-sql`，DB 名 `sqlite:acm.db`（落在 `%APPDATA%\com.stargate.agent-context-map\acm.db`）。
  - 浏览器 dev：localStorage 兜底（`npm run dev` 仍可用）。
  - 后端选择靠 `window.__TAURI_INTERNALS__` 检测。
  - API：`listDocuments / getDocument / upsertDocument / saveBody / saveBaseline / deleteDocument / getAppState / setAppState / addSnapshot / listSnapshots`，导出 `persistenceMode`。
  - 关键：`saveBody`（自动保存）只写 body/title/dirty，**不动 base_snapshot**；`saveBaseline`（手动保存）才推进 diff 基线。

### 启动页 + 会话恢复（P2）

- `src/acm/Home.jsx`：开始页。最近打开列表（标题 / 模板名 / 相对时间 / dirty 点 / 删除）、新建（选模板）、查看示例、导入（占位）、空白快速开始。
- `src/App.jsx`：
  - 新增 `view`（loading|home|editor）、`docId`、`recent` 状态；`doc/base` 初值改为 `BLANK_DOC`（不再是 sampleDoc）。
  - 启动 effect：先 `listDocuments` 填最近；读 `app_state.last_opened_doc_id`，能取到就 `loadRecord` 直接进编辑器，否则进开始页。
  - `loadRecord / persistAndOpen / openRecent / deleteRecent / viewSample / goHome / createFromTemplate` 全部走 store。
  - 工具栏「打开」改为「开始页」(`goHome`)，并显示当前文档标题 + 未保存提示。

### 自动保存 + 手动保存（P3）

- 防抖自动保存：编辑后 800ms 写 `saveBody`（带 dirty），不动基线。
- `onSave`（⌘S）：`saveBody`(dirty=false) + `saveBaseline` + `addSnapshot("手动保存")`，并 toast。

## 2. 验证记录

浏览器 dev（localStorage 后端）冒烟通过：
- 清空缓存冷启动 → 开始页空状态；
- 查看示例 → 进编辑器且落库（`acm:index` 1 条、`last_opened_doc_id` 已写）；
- 刷新 → 自动恢复进编辑器（18 节点），未回开始页；
- 开始页 → 最近列表显示「Agent Context Map 工具自描述图谱 · 软件开发 · 刚刚」；
- 控制台无当前报错（早期报错均为编辑中 HMR 中间态）。

桌面 exe（真 SQLite 后端）冒烟通过：
- `npm run tauri:build -- --no-bundle` 编译通过（warm cache 约 47s），exe 约 12.7MB；
- 冷启动建库：`%APPDATA%\com.stargate.agent-context-map\acm.db` 自动创建；
- 用 Node 24 `node:sqlite` 核验：三表 + 两索引 + `_sqlx_migrations` 齐全；写入读回中文标题文档与 `app_state` 成功，清理后 0 残留。
- exe 交付：`output/portable/Agent Context Map/Agent Context Map.exe`（+ version.txt），构建时间 2026-06-03 16:19。

## 3. P4 已完成（2026-06-03 同日续做）

1. **ACM-MD 导入解析器**：`data.js` 新增 `parseAcmMd(text)`（依赖 `yaml` 包）。提取 ```acm 代码块 → `yaml.parse` → 把 `layout.nodes[id]` 合并回节点 x/y → 透传 `validation`/`changes`。Node 往返测试通过：`sampleDoc → toAcmMd → parseAcmMd` 节点 18/18、边 19/19、标题/doc_id/坐标/边类型全保真。
2. **真·文件 IO**：接 `tauri-plugin-dialog` + `tauri-plugin-fs`。新增 `src/storage/files.js`：
   - 打开/导入：用 `<input type=file>`（浏览器与 WebView2 都支持，免 fs 读权限），读 `.text()` → `parseAcmMd` → 入库打开。
   - 另存/导出到磁盘：桌面用 `dialog.save()` + `fs.writeTextFile`（带 `source_path`），浏览器用 `<a download>` 兜底。
   - 入口：工具栏新增「导入」按钮、开始页「导入 ACM-MD」；导出弹窗每个标签页新增「保存到文件」。
3. **文档改名**：工具栏标题改为可编辑输入框，`renameDoc` 经 commit 写 `meta.title`，自动保存落库。
4. **视口恢复**：画布 `vp` 防抖写 `app_state` 的 `vp:<docId>`，下次打开该文档时恢复（无保存视口则回退自动 fit）。
5. **capabilities**：新增 `dialog:default` / `fs:default` / `fs:allow-write-text-file` / `fs:allow-read-text-file`（scope 含 `**` 与 `$HOME/$DESKTOP/$DOCUMENT/$DOWNLOAD`）。

## 4. 仍待办（次要 / 进阶）

1. **快照历史 UI**：`snapshots` 表已在写入（手动保存时记一条），但还没有"查看/回滚历史快照"的界面。
2. **窗口几何恢复**：窗口大小/位置未持久化（视口已恢复）。建议接 `tauri-plugin-window-state`（一行注册即可），本轮为控制风险未引入。
3. **源文件丢失兜底**（plan §5.2）：`source_path` 字段已写入，但失联提示与重绑路径未做（且当前导入走 `<input>` 拿不到绝对路径，source_path 多为空）。
4. **保存回源文件**：因导入用 `<input>` 无绝对路径，暂只支持「导出弹窗→保存到文件（另存为）」，没有"直接覆盖源文件"。如需要可改导入也走 `dialog.open()+fs.readTextFile` 以拿到路径。

## 5. 不要破坏

- 不改 ACM-MD v0.1 协议字段与导出语义；`body` 存整份 JSON 即为保真。
- 保留连线路由（handoff-001）、节点编辑、Diff、校验、导出四视图、Tweaks。
- `saveBody` 绝不可覆盖 `base_snapshot`（否则 diff 基线被冲掉）。
- 纯本地，不引入后端/云依赖；SQLite 属本地嵌入式，合规。

## 6. 修改入口速查

| 改什么 | 看哪 |
| --- | --- |
| 表结构 / 迁移 | `src-tauri/src/lib.rs` |
| 读写 / 自动保存 / 最近列表 | `src/storage/store.js` |
| 开始页 | `src/acm/Home.jsx` |
| 启动恢复 / 视图切换 / 工具栏 | `src/App.jsx` |
| SQL 权限 | `src-tauri/capabilities/default.json` |
