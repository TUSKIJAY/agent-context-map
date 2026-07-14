# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 唯一权威工作目录：`D:\Code\agent-context-map`
- Git dir：项目内普通 `.git/`
- 当前分支：`codex/acm-pluginization-plan`；尚未设置 upstream
- 当前 HEAD：Phase 1 scoped commit；接手时以 `git log -1 --oneline` 实测；push 未获授权
- Harness profile：`governed`
- Active exec plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`
- 当前 Phase：Phase 1 complete；下一 Gate 为 Phase 2 项目文件真源与 SQLite 迁移兼容

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

- Phase 2 待开始：实现 `.acm` project store、content revision、expectedRevision、lock/temp/safe replace/recovery 与 SQLite 只读迁移预览。
- 真源切换前必须保持当前 SQLite 事实；只有 Phase 2 Gate 全过并实际切换时才同步 `INSTRUCTIONS.md`。

## Blocked

- 当前无已确认阻塞。Phase 2 需验证 Windows/macOS/Linux safe replace 差异；不能把 Node rename 当作无条件跨平台原子替换。
- `npm audit` 仍报告现有 Vite 5 / esbuild 的 1 high + 1 moderate 开发服务器 advisory，修复路径要求 Vite major upgrade；本 Phase 未扩大依赖升级范围，禁止 `audit fix --force`。Vitest 新增依赖已固定到不含已知 critical advisory 的 3.2.7。

## Completed

- [x] 2026-07-14 — Phase 1：新增 platform-free `packages/acm-core`，抽取 schema/model/strict parse/deterministic serialize/validator/diff/canonical operations/revision/context/pending；`src/acm/data.js` 收敛为 UI 兼容入口。
- [x] 2026-07-14 — Phase 1 Gate：core 16 tests、全仓 31 tests、JS/Python strict parity 8 fixtures、generated round-trip Python strict、Vite build、Tauri release `--no-bundle` 与静态 platform-import Gate 全通过。
- [x] 2026-07-14 — Phase 0B：隔离 repo-local plugin + dependency-free read-only stdio MCP；真实 Desktop new task、same-task follow-up、second task、cachebuster reload 与伪造参数场景通过，Gate = `trusted_host_identity`。
- [x] 2026-07-14 — Phase 0B 安全边界：宿主 task/session 在任务内稳定、任务间隔离，workspace hash 跨任务/重装稳定；附加可写目录不获 workspace 授权；多 root 自动化只允许 `trusted_native_picker_required`。
- [x] 2026-07-14 — Phase 0A：AGENTS loopback/pending 精确化落位；完成 DEC-004 至 DEC-007；固定 Vitest 3.2.7；建立 ACM-MD、Agent boundary、SQLite v1 与 distribution baseline。
- [x] 2026-07-14 — Phase 0A 验证：baseline 4 files / 8 tests、distribution 1 test、Python strict valid fixture、harness、budget、Vite build、diff check 全通过。
- [x] 2026-07-14 — 用户批准插件化 plan v2 并迁入 active；review-002 = approve；DEC-004 数据真源决策 Accepted。
- [x] 2026-07-14 — 权威仓库迁至 `D:\Code\agent-context-map` 普通项目内 `.git/`；原 D 盘快照留在 `archive/pre-migration-d-snapshot`。
- [x] 2026-07-14 — governed harness、docs-only 治理和自动 scoped local commit 规则完成。
- [x] 2026-06-09 — agy SDK 前端适配与 Tauri/agy CLI bridge 已完成于本地提交 `077dbec`、`154bf75`。

## Next

1. 执行 Phase 2：建立项目 `.acm` store 与 revision/lock/safe replace/recovery。
2. 实现 SQLite read-only dry-run/export/validate/apply/rollback，禁止双写；Gate 全过后才切换真源并更新稳定章程。
3. 每个 Phase 验收后 scoped local commit；每次 push 仍需用户明确确认。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | Phase 1 acm-core 协议等价完成 | `packages/acm-core/`；core 16、全仓 31、parity 8；Tauri release build |
| 2026-07-14 | Phase 0B trusted host identity Gate 通过 | `spikes/codex-host-binding/evidence/gate-report.json`；真实 Desktop correlations；6 个 spike tests |
| 2026-07-14 | Phase 0A baseline 与 ADR 完成 | `tests/baseline/`、`tests/fixtures/`、DEC-005/006/007；Vitest 3.2.7；完整 Gate 通过 |
| 2026-07-14 | plugin plan v2 active | review-002 approve；用户批准；active plan §0.6/§14.2 |
| 2026-07-14 | 权威仓库迁至 D 盘 | DEC-003；top-level `D:/Code/agent-context-map`；git-dir `.git` |

## Archive Policy

详细历史见 `docs/progress-archive/`；本页只保留当前状态、短日志和索引。
