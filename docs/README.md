# Docs Index

本目录是 `Agent Context Map` 的稳定文档地图。决定文档归属、权限或当前状态时先读本页。

## Authority Layers

| Layer | Path | Role | Authority |
| --- | --- | --- | --- |
| Stable project rules | `../AGENTS.md`, `../INSTRUCTIONS.md` | 启动规则、项目章程与不可协商边界 | 当前权威入口 |
| Current state | `../PROGRESS.md`, `../HANDOFF.md` | 项目状态板与会话书签（前者项目级、后者会话级） | 当前状态权威；不是运行时数据源 |
| Decisions | `decisions/` | 架构、范围和治理决策 | 仅明确标记 Accepted 的决策具有约束力 |
| Exec plans | `exec-plans/` | proposed、active、completed 与 reviews 生命周期 | 大型/敏感工作需位于 active 的已批准计划；小型工作按 `AGENTS.md` 任务分级直接执行，无需进入本目录 |
| Optimization intake | `optimization/` | 摩擦和改进想法记录 | 只记录，不授权实施 |
| Progress archive | `progress-archive/` | 从启动路径迁出的长期历史 | 证据检索；当前状态仍在根状态文件 |
| Frozen legacy records | `../doc/` | 被忽略的早期本地计划、评审和协议镜像 | 仅可历史回查；不得新增、更新或作为当前权威 |

## Entry Points

- Exec-plan lifecycle: `exec-plans/roadmap.md`
- Proposed plans: `exec-plans/proposed/index.md`
- Active plans: `exec-plans/active/index.md`
- Completed plans: `exec-plans/completed/index.md`
- Reviews: `exec-plans/reviews/index.md`
- Decisions: `decisions/index.md`
- Optimization intake: `optimization/SOP.md`
- Progress archive: `progress-archive/index.md`

## Placement Rules

- 小型、低风险、用户明确请求的工作按 `AGENTS.md` 任务分级直接执行，不产生计划或评审文件。
- 改进想法只在用户启用记录模式时进入 `optimization/`。
- 只有用户明确要求转化的范围才能起草到 `exec-plans/proposed/`。
- proposed 计划与 review 文件本身都不授权实施。
- 用户的一次明确批准可同时覆盖 review 确认与激活；获批后计划移动到 `active/` 并立即可执行，不追加确认轮次。
- 完成、终止、拒绝或被取代的计划移动到 `completed/`；review 历史保留。
- 长历史进入 `progress-archive/` 并保留索引；不得让启动文档无限增长。
- 所有新的计划、评审、决策、优化记录和进度归档都进入 `docs/` 对应入口。
- `doc/` 保持原位且冻结，不批量迁移或删除；复用旧内容前必须按当前仓库证据复核。
