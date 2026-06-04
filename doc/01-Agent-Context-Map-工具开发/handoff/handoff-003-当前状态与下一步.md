# Handoff 003 · 当前状态与下一步（功能完整绿色版 exe 已交付）

状态：核心闭环可用；P0-P4 全部落地并验证；改动尚未提交 Git
优先级：P1（承接整个工具当前状态，作为下一手的统一入口）
日期：2026-06-03
目标读者：接手的 Agent（按本文件独立执行，无需本次会话上下文）

> 本文件是"现在是什么 / 下一步做什么 / 接手怎么检查"的前瞻交接。
> 细节实现见同目录：[handoff-001 连线避让与路由]、[handoff-002 本地持久化与启动页]。

---

## 0. 现在这个工具是什么

Agent Context Map：本地运行的 **Vite + React + Tauri v2** 逻辑上下文图谱编辑器（ACM-MD v0.1），已是**可双击使用的 Windows 绿色版 exe**，不再是纯 Web 原型。

当前已具备的能力：

- 三栏图谱编辑：节点拖拽 / 增删改、连线（端口+扇出+圆弧避让，不压卡片）、缩放平移、邻居高亮、类型过滤、左右侧栏收展。
- 协议往返：导入 ACM-MD（`.md`/`.acm.md`）→ 编辑 → 导出（完整 ACM-MD / Agent Diff / JSON / Mermaid），协议字段不丢（含 `validation` 透传）。
- 本地持久化：SQLite（应用数据目录），编辑防抖自动保存，关掉重开**自动恢复上次工作现场**（含画布视口）。
- 启动体验：**开始页**（最近打开 / 新建模板 / 查看示例 / 导入），不再开局即演示。
- 文件 IO：导入文件、导出"保存到文件"（桌面原生另存）。
- 文档改名、领域模板（仅改显示名，不改协议）、Tweaks（卡片样式/网格/主色）。

## 1. 本会话做了什么

三块，按时间：

1. **接入 Tauri v2 桌面壳并产出绿色版 exe**（此前无桌面壳）。详见 handoff-001 §11 / handoff-002。
2. **本地持久化 + 开始页 + 会话恢复 + 自动保存**（P1-P3）。详见 handoff-002 §1。
3. **导入解析器 + 文件 IO + 文档改名 + 视口恢复**（P4）。详见 handoff-002 §3。

## 2. 如何运行与构建

```powershell
npm install
npm run dev          # 浏览器调试 (http://localhost:5173)，持久化走 localStorage 兜底
npm run build        # 纯前端构建校验
npm run tauri:dev    # 桌面壳里跑（真 SQLite）
npm run tauri:build -- --no-bundle   # 出绿色版 release exe（不打 MSI/NSIS/zip）
```

构建产物与交付：

```text
release 二进制: src-tauri/target/release/agent-context-map.exe
绿色版交付:     output/portable/Agent Context Map/Agent Context Map.exe  (+ version.txt)
本地数据库:     %APPDATA%\com.stargate.agent-context-map\acm.db
运行依赖:       Windows WebView2 Runtime（开发机已装 v148，Win11 自带）
```

工具链（开发机实测）：Rust 1.95 / Tauri CLI 2.11.2 / Node 24。首次 release 编译约 2-3 分钟，warm cache 约 1 分钟。

## 3. 验证现状

已自动验证通过（本会话）：

- 浏览器流程：冷启动→开始页→查看示例→落库→刷新自动恢复→开始页显示最近列表；改名落库；导出弹窗"保存到文件"在位；控制台无当前报错。
- ACM-MD 往返（Node）：`sampleDoc → toAcmMd → parseAcmMd` 节点 18/18、边 19/19、标题/doc_id/坐标/边类型全保真；坏输入正确报错。
- 桌面真 exe：冷启动建库（三表+两索引+迁移表齐全）；**种子→启动→关→查库**证明 app 在真 exe 里通过 SQLite 完成"读取上次文档→进编辑器→写回 body 与视口"的完整读写闭环。
- `tauri:build -- --no-bundle` exit 0（capabilities 合法性随构建校验通过）。

**尚需人工点一次确认**（无桌面 UI 自动化，没法替点 OS 对话框）：

- 双击 exe →「导入」选一个 `.acm.md` 文件 → 应进编辑器。
- 导出弹窗 →「保存到文件」→ 原生另存对话框 → 落盘成功。
  （前后链路已验：解析器、浏览器下载路径、dialog/fs 插件编译注册、capabilities 构建期校验。仅原生弹窗本身没自动点。）

## 4. 建议下一步（按优先级）

1. **人工补跑 §3 的两项原生弹窗冒烟**（导入/另存），确认 fs 写权限 scope 在目标机生效。若 `fs:allow-write-text-file` 的 `**` scope 在某些路径被拒，改用 `$HOME/**` 等具体基目录或排查 `src-tauri/capabilities/default.json`。
2. **快照历史 UI**：`snapshots` 表已在手动保存时写入，缺"查看/回滚历史快照"的界面（右栏加一个 Tab 或 Inspector 区块；读 `store.listSnapshots(docId)`）。
3. **窗口几何恢复**：窗口大小/位置未持久化（视口已恢复）。建议接 `tauri-plugin-window-state`（一行 `.plugin(...build())` 注册 + `window-state:default` 权限），近零成本。
4. **保存回源文件 / 源文件丢失兜底**（plan §5.2）：当前导入走 `<input>` 拿不到绝对路径，故只有"另存为"。如需"覆盖源文件"，把导入也改成 `dialog.open()+fs.readTextFile` 以获得 `source_path`，并在源文件失联时提示重绑。
5. **任务拆解大师集成（plan P4 端到端）**：用文档 02/03 的样例验证"上游 Agent 生成 ACM-MD → 本工具导入编辑 → 导出 diff 交回"闭环。
6. （可选）绿色版 exe 的 SOP 固化：覆盖前关旧进程、只覆盖 exe+version.txt、不默认打安装包（plan §5.3 已写规则）。

## 5. 暂缓 / 已知缺口

- 不做安装包（MSI/NSIS）、不刷 portable zip、不改安装版本号、不动 archive —— 除非用户明确"发版/打安装包"（plan §5.3）。
- 改名只写 `meta.title`，不计入 Agent Diff（diff 只比 nodes/edges），故纯改名不显示"未保存"点——这是设计取舍，非 bug。
- 浏览器 dev 模式持久化用 localStorage（5MB 上限），仅为开发便利；真交付是 exe 的 SQLite。

## 6. 接手检查清单

- [ ] **改动尚未提交 Git**。本会话改/增：`src-tauri/`、`src/storage/`(store.js+files.js)、`src/acm/Home.jsx`、`src/App.jsx`、`src/acm/data.js`、`.gitignore`、`package.json`/`package-lock.json`、`PROJECT_MAP.md`、handoff-001/002/003。先与用户确认再 `git add <明确文件>`（勿 `git add -A`，遵守 AGENTS.md）。
- [ ] Git 外置规则核对：`git rev-parse --git-dir` 应指向 `D:/git-stores/stargate/LLM_project_agent思维导图.git`。
- [ ] 构建产物已 gitignore：`src-tauri/target/`、`src-tauri/gen/`、`output/`、`dist/`、`node_modules/`。不要提交二进制。
- [ ] 改源码后至少 `npm run build`；动桌面壳/插件后 `npm run tauri:build -- --no-bundle`。
- [ ] 出 exe 后按 §3 人工冒烟两项原生弹窗。

## 7. 不要破坏（边界）

- 不改 ACM-MD v0.1 协议字段与导出语义；图谱正文在 SQLite 里按整份 JSON 存（`body`）即为保真，勿拆表。
- `store.saveBody`（自动保存）**绝不可覆盖 `base_snapshot`**，否则 diff 基线被冲掉；推进基线只走 `saveBaseline`（手动保存）。
- 保留连线路由（handoff-001）与全部既有交互、视觉规则、四视图导出。
- 纯本地：不引入后端/数据库服务/云依赖。SQLite/dialog/fs 均为本地嵌入式，合规。

## 8. 修改入口速查

完整文件职责见 `PROJECT_MAP.md`。关键入口：

| 改什么 | 看哪 |
| --- | --- |
| 表结构 / 迁移 / 插件注册 | `src-tauri/src/lib.rs` |
| 桌面窗口 / 打包配置 | `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` |
| 权限（sql/dialog/fs） | `src-tauri/capabilities/default.json` |
| 本地读写 / 自动保存 / 最近列表 / 视口 | `src/storage/store.js` |
| 文件打开 / 另存 | `src/storage/files.js` |
| ACM-MD 导入解析 / 导出 / 校验 / Diff / 受控词表 | `src/acm/data.js` |
| 开始页 | `src/acm/Home.jsx` |
| 启动恢复 / 视图切换 / 工具栏 / 导出弹窗 | `src/App.jsx` |
| 画布交互 / 连线路由 | `src/acm/Canvas.jsx` |
| 侧栏 / Inspector / Diff / 校验面板 | `src/acm/Panels.jsx` |
