# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 当前分支：`codex/agy_agent`
- 当前源码提交：`154bf75`（agy CLI 协作建议桥）
- 对应远端分支：`origin/codex/agy_agent` 停在 `077dbec`；本地尚有 1 个既有提交未推送
- Harness profile：`governed`
- Active exec plan：无
- 当前任务：harness retrofit 已完成，等待用户决定 commit / push 边界

## Navigation

| Need | Location |
| --- | --- |
| 入口规则 | `AGENTS.md` |
| 稳定项目事实 | `INSTRUCTIONS.md` |
| 最新恢复点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限与放置规则 | `docs/README.md` |
| 计划生命周期 | `docs/exec-plans/roadmap.md` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- 无产品功能或 active exec plan 正在执行。

## Blocked

- 无。

## Completed

- [x] 2026-07-14 — 安装并校准 governed harness 控制面。
- [x] 2026-07-14 — 将旧长篇 handoff 的稳定历史迁入带索引的 progress archive。
- [x] 2026-07-14 — `npm run harness:check` 通过；缺失文件 0，config error 0。
- [x] 2026-07-14 — `npm run harness:budget` 通过；4 个启动文档均未触发 archive/hard limit。
- [x] 2026-07-14 — skill `validate_harness.py` 最终 100/100，critical failures 0。
- [x] 2026-07-14 — `npm run build` 通过；295 modules transformed，保留既有大 chunk warning。
- [x] 2026-07-14 — `git diff --check` 通过。

## Next

- 验证通过后，由用户决定是否将本次 harness 改造与本地未推送的 `154bf75` 一并或分开提交/推送。
- 后续产品工作开始前，先确认是否属于直接窄范围任务，或需要进入 proposed → review → approval → active 生命周期。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | 完成 governed harness retrofit；安装缺失控制面文件并人工合并现有 `AGENTS.md` / `HANDOFF.md` | skill audit/apply/validate；原生 build；改造前 Git 工作区干净 |
| 2026-07-14 | agy CLI bridge 已存在于本地提交 `154bf75` | `git show --stat 154bf75` |
| 2026-07-14 | agy SDK/前端协作建议已存在于 `077dbec` | `git show --stat 077dbec` |
| 2026-06-09 | 复杂图谱可读性与分组能力已在 main 完成 | 历史详情见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md` |

## Archive Policy

本文件只保留当前状态与短日志。日志接近启动文档预算时，先将稳定历史迁到 `docs/progress-archive/`，更新索引后再压缩本页。
