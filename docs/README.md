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
| Local product records | `../doc/` | 早期产品计划、评审和过程 handoff；被 `.gitignore` 排除 | 仅历史证据；不自动获得执行权限 |

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

- 改进想法只在用户启用记录模式时进入 `optimization/`。
- 只有用户明确要求转化的范围才能起草到 `exec-plans/proposed/`。
- proposed 计划与 review 文件本身都不授权实施。
- 只有完成评审并获用户明确批准的计划才能移动到 `active/`。
- 完成、终止、拒绝或被取代的计划移动到 `completed/`；review 历史保留。
- 长历史进入 `progress-archive/` 并保留索引；不得让启动文档无限增长。
- `doc/` 现存资料不迁移、不删除；需要进入正式执行生命周期时，必须基于当前仓库证据在 `exec-plans/proposed/` 新建计划。
