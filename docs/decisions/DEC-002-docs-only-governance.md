# DEC-002 — Docs-Only Governance

- Status: Accepted
- Date: 2026-07-14
- Scope: 项目计划、评审、决策、优化记录、进度归档、Agent 过程文档与协议规范放置
- Supersedes: DEC-001 中关于 `doc/` 继续承担本地产品过程资料职责的部分

## Context

governed harness 已在 `docs/` 建立 proposed、review、active、completed、decision、optimization 和 progress archive 生命周期，但仓库入口仍允许 `doc/` 作为并行的本地产品过程资料和协议镜像。这会继续产生被 Git 忽略的计划、无法索引的评审和双份协议维护。

用户于 2026-07-14 明确要求：以后所有新文档流程都走 `docs/` 现有治理体系，原 `doc/` 文件夹不再承担任何新作用。

## Decision

1. `docs/` 是唯一文档治理层。所有新的计划、评审、决策、优化 intake、进度归档和 Agent 过程文档必须按 `docs/README.md` 放置并维护对应索引。
2. `doc/` 保持被 `.gitignore` 排除并冻结。不得在其中新增、更新、同步或生成任何文件；它只能在必要时作为 legacy 历史证据只读回查。
3. `doc/` 中任何旧计划、评审、handoff 或协议镜像都不是当前权威。若需要复用，必须先按当前仓库和 Git 证据复核，再在 `docs/` 创建新的受治理产物。
4. ACM-MD v0.1 的唯一可追踪规范是 `skills/acm-md/references/acm-md-v0.1.md`。协议变更只维护该规范、校验器、样例和 skill 验证，不再同步 `doc/` 历史镜像。
5. 当前 `Agent Context Map Codex 插件化改造 Plan` 迁入 `docs/exec-plans/proposed/`，状态保持 Proposed；迁移和用户决定不等于独立 review、approval 或 activation。
6. 计划生命周期索引、`PROGRESS.md` 和 `HANDOFF.md` 必须与实际文件位置同步。

## Consequences

- 新 session 只需从 `docs/README.md` 路由，不再判断新材料应进入 `doc/` 还是 `docs/`。
- proposed、review、approval、active 和 completed 状态可由 Git 与索引复核。
- `doc/` 的历史内容继续保留，但不再形成双真源或维护负担。
- 未来若要清理、归档或删除 `doc/` 历史内容，必须另行明确授权；本决策不授权批量迁移或删除。

## Alternatives Considered

- 继续保留 `doc/` 作为本地过程资料：拒绝，会延续不可追踪的并行流程。
- 立即批量迁移或删除整个 `doc/`：拒绝，超出本次范围且可能破坏历史证据。
- 只迁移当前 Plan、不改入口规则：拒绝，后续仍会再次写入旧目录。

## Activation Boundary

本决策立即约束后续文档放置和本次治理文件同步；不授权实施任何产品功能，也不激活当前 proposed 插件化计划。
