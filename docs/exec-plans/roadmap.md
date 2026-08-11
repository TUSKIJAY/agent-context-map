# Exec Plans Roadmap

本文件是 `Agent Context Map` 实施计划及评审的生命周期入口。

## Task Triage First

不是所有工作都需要正式计划。先按 `AGENTS.md` 的任务分级判断：

- 直接执行与轻量计划级别的任务不进入本目录；用户的明确请求即是该范围的批准，直接实现并验证。
- 只有跨会话的大型改造、不可逆或安全敏感操作、影响范围无法预估、或用户明确要求正式计划的工作才使用下述生命周期。
- 把小任务错误升级进本生命周期与把大任务绕过本生命周期同样是违规。

## Lifecycle

1. 改进想法可在用户启用记录模式后进入 `docs/optimization/`。
2. 用户明确要求转化的范围起草为 `proposed/` 计划。
3. proposed 计划需要 review；review 确认与 activation 可在用户的同一次答复中一并授予——用户说「批准并执行」即同时完成两者，不得为流程追加额外确认轮次。
4. 经用户批准后，计划移动到 `active/` 并可立即开始实施，无需再次请示。
5. active 计划按 phase 执行；小计划可在计划内注明后合并 phase。
6. 在 phase 边界和会话结束前记录验证证据、同步 `PROGRESS.md` 与 `HANDOFF.md`，并按仓库规则形成 scoped commit。
7. 全部范围完成、验证和收尾后，计划移动到 `completed/`。

`proposed`、`active`、`completed` 与 `review` 是不同状态；状态转换需要用户认可，但用户的一次明确认可可以同时覆盖多个转换。

## Directory Rules

- `proposed/`：草案计划，等待用户批准。
- `active/`：已获用户批准、当前可执行的计划。
- `completed/`：已完成、终止、拒绝、被取代或归档的计划。
- `reviews/`：按计划 slug 保存评审和实施验收；仅在需要独立评审时创建。
- `plan-template.md`：起草模板，不属于任何计划状态。

## Execution Discipline

- phase 完成与否以验证证据为准；进入下一 phase 前先把结果写入 `PROGRESS.md`，不在每个微小步骤间反复改写状态文件。
- 计划标注了闸门的 phase 边界必须守闸门；不得静默合并 phase，合并必须在计划中注明。
- 发现无关脏改动时保护它们并继续本范围工作，只提交预期路径；仅当预期文件本身冲突或操作不可逆时才记录阻塞并请求方向。
- 遇到范围歧义时选择保守、可回滚的解释继续执行并记录假设；不要默认暂停等待。
- 优化记录本身不授权实施；转化仍需用户明确请求。

## Active Plans

当前 active：

- `active/02-visual-spec-artifact-renderer.md` — Visual Spec Artifact Renderer（2026-08-11 激活；2026-08-12 Phase 0–1 已验收；Phase 2 ready）

以 `active/index.md` 为当前索引。

## Proposed Plans

当前无 proposed 计划。

以 `proposed/index.md` 为当前索引。

## Completed Plans

当前无 completed 计划。以 `completed/index.md` 为历史索引。
