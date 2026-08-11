# Progress

本文件是项目状态板，只保存最新项目级真相。Session 恢复点见 `HANDOFF.md`；长期历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-11。
- 当前分支：`codex/project-harness-governed`，HEAD `37ace47`（基于 `main` `2d570d4`）。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer** 计划已完成独立 review 与用户批准，现位于 `active/`；Phase 0 尚未开始，运行时代码未改。
- 实施基线固定为当前单体分支。`origin/codex/acm-pluginization-plan@4ed712c` 仅作远程点采证据，禁止整支 merge/批量 cherry-pick。

## Navigation

| Need | Location |
| --- | --- |
| 唯一 Agent 规则入口 | `AGENTS.md` |
| 稳定项目事实 | `INSTRUCTIONS.md` |
| 最新会话接手点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限与生命周期 | `docs/README.md` |
| Active 产品计划 | `docs/exec-plans/active/02-visual-spec-artifact-renderer.md` |
| 独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- 无运行时实施。activation 与用户资源约束修订已完成，Orca Goal 可直接从 Phase 0 开始。

## Blocked

- 无已知阻塞。

## To Do

- 在当前 Orca worktree 创建 Goal，从 Phase 0 最小 Artifact build spike 开始；普通实现、review 和验收方向由 active plan 内自治 loop 决定，不再逐项请求用户确认。
- 不 push、PR、merge、tag、Release。
- 本次 activation 文档尚未 commit；由后续获得明确授权的 scoped commit 处理，不混入 Phase 0 产品 diff。

## Completed (Rolling Window)

- [x] 2026-08-11 — 用户确认产品与执行决策；计划经 Grok、Claude、Kimi 多轮独立 review，最终冻结稿由 Grok 与 Claude `approve/high`，无 blocking finding。
- [x] 2026-08-11 — Visual Spec Artifact Renderer 从 `proposed/` 迁入 `active/`；review、索引、roadmap 与状态文档同步，Phase 0 未启动。
- [x] 2026-08-11 — 用户撤销 Codex 账户额度保留要求；active plan、Goal prompt 与状态入口删除全部额度预检/阈值/自动停止规则。
- [x] 2026-08-11 — 明确 P1 静态目录、P3 单文件，Viewer 默认/编辑器显式次路径，构建时 Spec 注入，Dependency 主/辅边，以及 remote plugin plan 生命周期 N/A。
- [x] 2026-08-11 — governed harness 首个本地提交与 review 加固（既有 commit `37ace47` / `c9cadf7`）。

## Verification Baseline

| Check | Result |
| --- | --- |
| Local harness contract check | Pass — governed，0 missing/empty/content/config errors |
| Harness checker and budget tests | Pass — 8/8 |
| Startup document budget | Pass — 5 documents，no attention or hard-limit trigger |
| `git diff --check` | Pass |
| 运行时代码 / `npm run build` | 本 session 未改 `src/**`，不要求产品重构建 |
| Windows Widget canary / 插件安装 | 按范围禁止，未运行 |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c`（本 checkout 未持有该 active 文件） |
