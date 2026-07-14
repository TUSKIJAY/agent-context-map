# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 唯一权威工作目录：`D:\Code\agent-context-map`
- Git dir：项目内普通 `.git/`
- 当前分支：`codex/agy_agent`；upstream 为 `origin/codex/agy_agent`
- 当前 HEAD / ahead：以 `git log -1` 和 `git rev-list --count origin/codex/agy_agent..HEAD` 实测为准；push 未获授权
- Harness profile：`governed`
- Active exec plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`
- 当前 Phase：Phase 0A complete；下一 Gate 为 Phase 0B 真实 Codex Desktop host-binding spike

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

- Phase 0B 尚未开始：需要在 `spikes/codex-host-binding/` 建隔离的 repo-local plugin + 只读 stdio MCP，并在真实 Codex Desktop 验证 new task、reload、第二 task、多 workspace root 与伪造参数不可覆盖。
- 在 Gate 得出 `trusted_host_identity` 前，Phase 1 及任何项目 `.acm` 读写实现均禁止启动。

## Blocked

- 当前无已确认阻塞。P0 未决风险是 Codex host 是否实际提供不可由模型覆盖的 task/workspace identity；Phase 0B 将给出结论。
- `npm audit` 仍报告现有 Vite 5 / esbuild 的 1 high + 1 moderate 开发服务器 advisory，修复路径要求 Vite major upgrade；本 Phase 未扩大依赖升级范围，禁止 `audit fix --force`。Vitest 新增依赖已固定到不含已知 critical advisory 的 3.2.7。

## Completed

- [x] 2026-07-14 — Phase 0A：AGENTS loopback/pending 精确化落位；完成 DEC-004 至 DEC-007；固定 Vitest 3.2.7；建立 ACM-MD、Agent boundary、SQLite v1 与 distribution baseline。
- [x] 2026-07-14 — Phase 0A 验证：baseline 4 files / 8 tests、distribution 1 test、Python strict valid fixture、harness、budget、Vite build、diff check 全通过。
- [x] 2026-07-14 — 用户批准插件化 plan v2 并迁入 active；review-002 = approve；DEC-004 数据真源决策 Accepted。
- [x] 2026-07-14 — 权威仓库迁至 `D:\Code\agent-context-map` 普通项目内 `.git/`；原 D 盘快照留在 `archive/pre-migration-d-snapshot`。
- [x] 2026-07-14 — governed harness、docs-only 治理和自动 scoped local commit 规则完成。
- [x] 2026-06-09 — agy SDK 前端适配与 Tauri/agy CLI bridge 已完成于本地提交 `077dbec`、`154bf75`。

## Next

1. 构建并验证 Phase 0B 隔离 spike；不接业务 core、SQLite 或 `.acm`。
2. 真实宿主 Gate 只接受 `trusted_host_identity`；`trusted_native_picker_required` 或 `unavailable` 均须停止并更新 ADR/状态。
3. 每个 Phase 验收后 scoped local commit；每次 push 仍需用户明确确认。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | Phase 0A baseline 与 ADR 完成 | `tests/baseline/`、`tests/fixtures/`、DEC-005/006/007；Vitest 3.2.7；完整 Gate 通过 |
| 2026-07-14 | plugin plan v2 active | review-002 approve；用户批准；active plan §0.6/§14.2 |
| 2026-07-14 | 权威仓库迁至 D 盘 | DEC-003；top-level `D:/Code/agent-context-map`；git-dir `.git` |

## Archive Policy

详细历史见 `docs/progress-archive/`；本页只保留当前状态、短日志和索引。
