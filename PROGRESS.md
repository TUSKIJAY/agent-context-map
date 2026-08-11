# Progress

本文件是项目状态板，只保存最新项目级真相。Session 恢复点见 `HANDOFF.md`；长期历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-11。
- 当前分支：`codex/project-harness-governed`，基于 `main` commit `2d570d4`。
- Harness profile：`governed`。
- 当前状态：governed harness 已完成首个本地提交；针对合并前 review 的 5 项加固已实施并通过验证，follow-up 改动尚未 commit。
- 产品源码、依赖、锁文件、Tauri 配置和 ACM-MD v0.1 协议不在本次修改范围。

## Navigation

| Need | Location |
| --- | --- |
| 唯一 Agent 规则入口 | `AGENTS.md` |
| 稳定项目事实 | `INSTRUCTIONS.md` |
| 最新会话接手点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限与生命周期 | `docs/README.md` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- 无。

## Blocked

- 无。

## To Do

- 由用户决定是否为本轮加固创建 follow-up commit，以及后续是否 push、开 PR 或合并；当前任务未授权远端操作。

## Completed (Rolling Window)

- [x] 2026-08-11 — 从干净的 `main` 创建隔离分支 `codex/project-harness-governed`。
- [x] 2026-08-11 — `project-harness-engineer` installer 只创建缺失文件并跳过既有 `AGENTS.md`、`HANDOFF.md`；随后人工校准并重写 `AGENTS.md`、`HANDOFF.md` 与 `PROJECT_MAP.md`。
- [x] 2026-08-11 — 将旧 `HANDOFF.md` 的长期历史迁入 `docs/progress-archive/2026-06-pre-harness-history.md`。
- [x] 2026-08-11 — 建立启动链、任务分级、文档生命周期、Accepted 决策和动态 Git readback 规则。
- [x] 2026-08-11 — 通过结构评分、本地结构检查、启动文档预算、前端生产构建和 diff 检查。
- [x] 2026-08-11 — 加固 repo-local checker 的非空/契约检查，补齐 governed 模板覆盖和 8 项负向/正向单测。
- [x] 2026-08-11 — 将 `PROJECT_MAP.md` 纳入预算，并为 ACM-MD 校验器增加 PyYAML 声明和严格模式 fixture。
- [x] 2026-08-11 — 修正不存在的 `doc/` 与 installer/人工校准边界表述。

## Verification Baseline

| Check | Result |
| --- | --- |
| Skill structural validation | Pass — 100/100，0 critical failures |
| Local harness contract check | Pass — governed，0 missing/empty/content/config errors |
| Harness checker and budget tests | Pass — 8/8 |
| Startup document budget | Pass — 5 documents，no attention or hard-limit trigger |
| ACM-MD strict smoke fixture | Pass — clean temporary venv，PyYAML 6.0.3 |
| `npm run build` | Pass — 294 modules transformed |
| `git diff --check` | Pass |

非阻塞提示：Vite 继续报告既有 large-chunk warning；本次 harness-only 范围未调整 bundle 或依赖。

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
