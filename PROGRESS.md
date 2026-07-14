# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 唯一权威工作目录：`D:\Code\agent-context-map`
- Git dir：项目内普通 `.git/`
- 当前分支：`codex/acm-pluginization-plan`；尚未设置 upstream
- 当前 HEAD：Phase 4 scoped commit；接手时以 `git log -1 --oneline` 实测；push 未获授权
- Harness profile：`governed`
- Active exec plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`
- 当前 Phase：Phase 4 complete；下一 Gate 为 Phase 5 原生 Widget、生命周期和 editor 复用

## Navigation

| Need | Location |
| --- | --- |
| 入口规则 | `AGENTS.md` |
| 稳定项目事实 | `INSTRUCTIONS.md` |
| 最新恢复点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限 | `docs/README.md` |
| 计划生命周期 | `docs/exec-plans/roadmap.md` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 5 待开始：把 Phase 3 `acm-editor` 接入 Phase 4 MCP Apps resource，建立 Widget bridge、hydrate、ready proof、rebind 和 supersede 生命周期。
- Phase 5 必须保持 CSP/资产全本地，Widget 不得自建业务真源、直接访问 localhost 或把 tool success 当成 ready。

## Blocked

- 当前无已确认阻塞。Phase 2 在本机 Windows 完成 Node/Rust same-volume replace、故障注入和 Tauri release build；macOS/Linux 原生矩阵仍按 Phase 7 执行，已有可移植测试入口，不把未运行平台伪装为当前证据。
- `npm audit` 仍报告现有 Vite 5 / esbuild 的 1 high + 1 moderate dev-server advisory，修复要求 Vite major upgrade；本 Phase 未执行 `audit fix --force`。
- Node 24 的 `node:sqlite` 仅用于迁移 fixture 自动化并会发 experimental warning；发布产品使用 Rust `sqlx read_only(true)`，不依赖 Node SQLite runtime。

## Completed

- [x] 2026-07-14 — Phase 4：以标准 `.codex-plugin/plugin.json`、`.mcp.json` 和自包含 `mcp/server.mjs` 建立正式 local-only 插件包；发布包包含构建复制的 `acm-md` skill 和 MCP Apps UI resource 占位。
- [x] 2026-07-14 — Phase 4 安全边界：只接受 host-owned task/workspace 元数据与 MCP roots 的单根交集；伪造 identity 参数、缺失/多 root、旧 task rebind、traversal、absolute path、symlink/junction 和 Windows 保留设备名全部 fail closed。
- [x] 2026-07-14 — Phase 4 真实宿主与拓扑 Gate：临时安装产品插件后用 3 个独立 Codex task、remove/reinstall reload 和额外 writable dir 重放；项目 fingerprint 稳定、session 隔离、`.acm` 未修改；DEC-005/006 确认为单 bundled stdio MCP，无 daemon/listener/token。
- [x] 2026-07-14 — Phase 4 Gate：MCP schema 3、runtime 2、binding 4、path security 10、distribution 3、全仓 24 files / 81 tests 通过；clean package 可独立启动，8 个 Release 文件两次构建 SHA-256 一致；plugin validator、Vite 317 modules、harness 与 diff check 通过。
- [x] 2026-07-14 — Phase 3：抽出 platform-free `packages/acm-editor`、document controller 和能力 contracts；Desktop composition root 注入 Tauri/Browser store、files、Agent、export 与 host capabilities。
- [x] 2026-07-14 — Phase 3 边界收敛：editor 依赖闭包不含 Tauri/SQLite/宿主全局发现；FlowCanvas 使用 export adapter；pending proposal 与正式 Diff 分栏；产品 Agent operations 全部改为 camelCase，legacy 仅保留显式 diagnostics adapter。
- [x] 2026-07-14 — Phase 3 Gate：editor 4 files / 7 tests、import-boundaries 4 tests、全仓 19 files / 60 tests、Vite 317 modules、Tauri release bundle、harness 与 diff check 全通过；桌面 smoke 覆盖项目绑定、新建/打开/编辑/撤销/重做/校验/Diff/保存/重开。
- [x] 2026-07-14 — Phase 2：新增 `packages/project-store`，实现项目 `.acm` 扫描、strict validation、canonical SHA-256 revision、expectedRevision、公平锁、跨进程 lock file、幂等 mutation、same-directory temp/safe replace、recovery evidence 和可重建 index。
- [x] 2026-07-14 — Phase 2 真源切换：Tauri 正式存储改为用户原生选择的 `.acm/documents/*.acm.md`；移除 SQL write backend、`tauri-plugin-sql` 依赖和全部 SQL capabilities；浏览器 localStorage 明示 isolated demo。
- [x] 2026-07-14 — Phase 2 迁移：legacy SQLite 使用只读 preview、JS/Python strict validation、round-trip、用户状态目录 backup、逐文档确认与 rollback；原库不删除、不双写。
- [x] 2026-07-14 — Phase 2 Gate：专项 23 tests、Rust 3 tests、Vite 308 modules、Tauri release `--no-bundle`、source-switch static Gate 与 `git diff --check` 全通过；同步实施 DEC-004/DEC-007 和 `INSTRUCTIONS.md`。
- [x] 2026-07-14 — Phase 1：新增 platform-free `packages/acm-core`，抽取 schema/model/strict parse/deterministic serialize/validator/diff/canonical operations/revision/context/pending；`src/acm/data.js` 收敛为 UI 兼容入口。
- [x] 2026-07-14 — Phase 1 Gate：core 16 tests、全仓 31 tests、JS/Python strict parity 8 fixtures、generated round-trip Python strict、Vite build、Tauri release `--no-bundle` 与静态 platform-import Gate 全通过。
- [x] 2026-07-14 — Phase 0B：隔离 repo-local plugin + dependency-free read-only stdio MCP；真实 Desktop 多 task/reload/伪造参数场景通过，Gate = `trusted_host_identity`。
- [x] 2026-07-14 — Phase 0A：DEC-004 至 DEC-007、固定 Vitest 3.2.7、ACM-MD / Agent boundary / SQLite v1 / distribution baseline 全部落位并通过 Gate。
- [x] 2026-07-14 — 用户批准 plugin plan v2 并迁入 active；review-002 = approve；权威仓库迁至 `D:\Code\agent-context-map`。
- [x] 2026-07-14 — governed harness、docs-only 治理和自动 scoped local commit 规则完成。
- [x] 2026-06-09 — agy SDK 前端适配与 Tauri/agy CLI bridge 已完成于本地提交 `077dbec`、`154bf75`。

## Next

1. 执行 Phase 5：构建原生 MCP Apps Widget，并把 `acm-editor` 作为 platform-free UI 注入。
2. 建立 openAttempt/widgetInstance 单调状态机、首帧 ready proof、reload/rebind/supersede 与旧实例隔离。
3. 验证 Widget bundle 无 Tauri/SQLite/绝对路径/远程资产、无 localStorage 业务真源，并保持 Tauri 回归。
4. Phase 验收后 scoped local commit；每次 push 仍需用户明确确认。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | Phase 4 plugin/MCP control plane 完成 | product plugin host replay；schema/runtime/binding/path/distribution；reproducible clean bundle |
| 2026-07-14 | Phase 3 editor/platform adapters 解耦完成 | editor 7、import-boundaries 4、全仓 60；Vite 317；Tauri release bundle；桌面 smoke |
| 2026-07-14 | Phase 2 项目文件单真源与 SQLite 只读迁移完成 | project-store 23 tests；Rust 3；Vite 308；Tauri release；DEC-004/007 implemented |
| 2026-07-14 | Phase 1 acm-core 协议等价完成 | `packages/acm-core/`；core 16、全仓 31、parity 8；Tauri release build |
| 2026-07-14 | Phase 0B trusted host identity Gate 通过 | `spikes/codex-host-binding/evidence/gate-report.json`；6 spike tests |
| 2026-07-14 | Phase 0A baseline 与 ADR 完成 | DEC-004 至 DEC-007；Vitest 3.2.7；完整 Gate |

## Archive Policy

详细历史见 `docs/progress-archive/`；本页只保留当前状态、短日志和索引。
