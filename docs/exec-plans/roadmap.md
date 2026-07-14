# Exec Plans Roadmap

本文件是 `Agent Context Map` 实施计划及评审的生命周期入口。

## Applicability

当用户要求先起草/评审计划，或任务属于多 phase、高风险、跨模块治理工作时，必须使用下述生命周期。用户直接授权的明确、窄范围维护任务可以直接实施，但授权只覆盖该请求本身；不得把冻结的 `doc/` 历史记录、优化记录或聊天推断当成额外范围。

## Lifecycle

1. 改进想法可在用户启用记录模式后进入 `docs/optimization/`。
2. 只有用户明确要求转化的范围才能成为 `proposed/` 计划。
3. proposed 计划必须接受独立 review；review 不自动等于 activation。
4. 只有 review 通过且用户明确批准后，计划才能移动到 `active/`。
5. active 计划按 phase 执行；每次 start、complete、block、reject 或 scope change 都先更新 `PROGRESS.md`。
6. 每个 phase 记录验证证据、刷新 `HANDOFF.md`，并按仓库规则自动形成 scoped local commit；push 仍需用户逐次明确确认。
7. 全部范围完成、验证和收尾后，计划移动到 `completed/`。

`proposed`、`active`、`completed` 与 `review` 是不同状态，不得仅靠措辞相互替代。

## Directory Rules

- `proposed/`：草案或 review-only 计划，无实施权限。
- `active/`：已评审、已获用户批准、当前可按 gate 执行的计划。
- `completed/`：已完成、终止、拒绝、被取代或归档的计划。
- `reviews/`：按计划 slug 保存独立评审和实施验收。
- `plan-template.md`：起草模板，不属于任何计划状态。
- `docs/exec-plans/` 是唯一计划生命周期位置；不得在 `doc/` 或其他目录创建并行计划真源。

## Execution Discipline

- 不得静默合并 phase。
- phase 未形成状态、证据、handoff 和必要提交闭环前，不得宣布完成。
- 修改任务和 active phase 验收结束后默认自动 commit，不再把“是否 commit”列为人工闸门；自动提交只能包含当前范围，push 始终保留为人工闸门。
- 发现无关脏改动时保护它们；无法形成干净范围时记录阻塞并暂停。
- 决策、优化记录、review 或聊天认可不能绕过 active 状态与用户批准。

## Active Plans

当前有 1 个 active 计划；Phase 3 editor 与 platform adapters 解耦已完成，下一 Gate 为 Phase 4 插件壳、MCP control plane 与安全根绑定。以 `active/index.md` 为当前索引。

## Proposed Plans

当前无 proposed 计划。以 `proposed/index.md` 为当前索引。

## Completed Plans

当前无通过本目录生命周期完成的计划。2026-07-14 的 harness retrofit 属于用户直接授权的窄范围维护，记录在 `PROGRESS.md`，不伪装成事后激活的计划。
