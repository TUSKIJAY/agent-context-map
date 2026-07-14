# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 唯一权威工作目录：`D:\Code\agent-context-map`
- Git dir：项目内普通 `.git/`
- 当前分支：`codex/acm-pluginization-plan`；尚未设置 upstream
- 当前 HEAD：Phase 2 scoped commit；接手时以 `git log -1 --oneline` 实测；push 未获授权
- Harness profile：`governed`
- Active exec plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`
- 当前 Phase：Phase 2 complete；下一 Gate 为 Phase 3 editor 与 platform adapters 解耦

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

- Phase 3 待开始：抽取 `packages/acm-editor`、document controller 和 Tauri/Browser composition adapters，同时保持 Tauri 行为。
- Phase 3 必须迁移产品内部 legacy snake_case operations，并证明 editor 依赖闭包不含 Tauri/SQLite 或宿主全局自发现。

## Blocked

- 当前无已确认阻塞。Phase 2 在本机 Windows 完成 Node/Rust same-volume replace、故障注入和 Tauri release build；macOS/Linux 原生矩阵仍按 Phase 7 执行，已有可移植测试入口，不把未运行平台伪装为当前证据。
- `npm audit` 仍报告现有 Vite 5 / esbuild 的 1 high + 1 moderate dev-server advisory，修复要求 Vite major upgrade；本 Phase 未执行 `audit fix --force`。
- Node 24 的 `node:sqlite` 仅用于迁移 fixture 自动化并会发 experimental warning；发布产品使用 Rust `sqlx read_only(true)`，不依赖 Node SQLite runtime。

## Completed

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

1. 执行 Phase 3：抽取 editor shell/controller，并在 composition root 注入 Tauri/Browser adapters。
2. 给 FlowCanvas 注入 host/export capabilities，保持 pending proposal 与正式 Diff 分离。
3. 迁移产品内部 legacy snake_case operations；完成 mock editor、import boundary、Tauri regression Gate。
4. Phase 验收后 scoped local commit；每次 push 仍需用户明确确认。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | Phase 2 项目文件单真源与 SQLite 只读迁移完成 | project-store 23 tests；Rust 3；Vite 308；Tauri release；DEC-004/007 implemented |
| 2026-07-14 | Phase 1 acm-core 协议等价完成 | `packages/acm-core/`；core 16、全仓 31、parity 8；Tauri release build |
| 2026-07-14 | Phase 0B trusted host identity Gate 通过 | `spikes/codex-host-binding/evidence/gate-report.json`；6 spike tests |
| 2026-07-14 | Phase 0A baseline 与 ADR 完成 | DEC-004 至 DEC-007；Vitest 3.2.7；完整 Gate |

## Archive Policy

详细历史见 `docs/progress-archive/`；本页只保留当前状态、短日志和索引。
