# Docs Index

本目录是 `Agent Context Map` 的稳定文档地图。决定文档归属、权限或当前状态时先读本页。

## Authority Layers

| Layer | Path | Role | Authority |
| --- | --- | --- | --- |
| Stable project rules | `../AGENTS.md`, `../INSTRUCTIONS.md` | 启动规则、项目章程与不可协商边界 | 当前权威入口 |
| Current state | `../PROGRESS.md`, `../HANDOFF.md` | 当前生命周期与下一接手点 | 当前状态权威；不是运行时数据源 |
| Decisions | `decisions/` | 架构、范围和治理决策 | 仅明确标记 Accepted 的决策具有约束力 |
| Exec plans | `exec-plans/` | proposed、active、completed 与 reviews 生命周期 | 仅经评审、用户批准并位于 active 的计划授权 phase 工作 |
| Optimization intake | `optimization/` | 摩擦和改进想法记录 | 只记录，不授权实施 |
| Progress archive | `progress-archive/` | 从启动路径迁出的长期历史 | 证据检索；当前状态仍在根状态文件 |
| Runbooks | `runbooks/` | 经 active plan 授权的发布、试点、恢复与回滚操作手册 | 定义步骤与证据；不替代用户授权或 plan Gate |
| Frozen legacy records | `../doc/` | 被 `.gitignore` 排除的早期本地记录 | 仅可历史回查；不得新增、更新或作为当前权威 |

## Entry Points

- Exec-plan lifecycle: `exec-plans/roadmap.md`
- Proposed plans: `exec-plans/proposed/index.md`
- Active plans: `exec-plans/active/index.md`
- Completed plans: `exec-plans/completed/index.md`
- Reviews: `exec-plans/reviews/index.md`
- Decisions: `decisions/index.md`
- Optimization intake: `optimization/SOP.md`
- Progress archive: `progress-archive/index.md`
- Runbooks: `runbooks/index.md`

## Placement Rules

- 改进想法只在用户启用记录模式时进入 `optimization/`。
- 只有用户明确要求转化的范围才能起草到 `exec-plans/proposed/`。
- proposed 计划与 review 文件本身都不授权实施。
- 只有完成评审并获用户明确批准的计划才能移动到 `active/`。
- 完成、终止、拒绝或被取代的计划移动到 `completed/`；review 历史保留。
- 长历史进入 `progress-archive/` 并保留索引；不得让启动文档无限增长。
- 所有新的计划、评审、决策、优化记录、进度归档和 Agent 过程文档都必须落在 `docs/` 对应入口，不得写入 `doc/`。
- 发布、试点、恢复和回滚操作手册进入 `runbooks/`；runbook 本身不授予真实安装、外部发布或破坏性操作权限。
- `doc/` 保持原位并冻结：不批量迁移或删除历史内容，但不得新增、更新、同步或继续充当协议镜像。需要复用旧内容时，必须先按当前仓库证据复核，再在 `docs/` 创建新的受治理产物。
