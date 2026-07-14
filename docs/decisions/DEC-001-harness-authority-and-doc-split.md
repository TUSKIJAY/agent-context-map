# DEC-001 — Harness Authority And Document Split

- Status: Accepted
- Date: 2026-07-14
- Scope: 项目级 Agent 启动、状态、计划权限与文档放置

## Context

项目已有完整 `AGENTS.md`、`PROJECT_MAP.md` 和大量本地 `doc/` 记录，但缺少稳定章程、当前 progress 面、机器配置与可执行结构检查。原 `HANDOFF.md` 同时承担当前状态、历史日志和操作手册，已经出现顶部状态落后于实际提交的问题。

`doc/` 被 `.gitignore` 排除，包含早期产品计划、评审、协议镜像和过程 handoff；直接迁移会改变既有本地工作流并混淆历史记录与当前执行权限。

## Decision

1. `AGENTS.md` 是唯一 Agent 规则入口；`CLAUDE.md` 只保留指针。
2. `INSTRUCTIONS.md` 保存稳定项目事实，`PROGRESS.md` 保存当前生命周期真相，`HANDOFF.md` 只保存最新恢复点。
3. 新增被 Git 跟踪的 `docs/` 作为 harness 治理层。
4. 保留 `doc/` 原位，视为本地历史/产品过程资料；其中任何旧计划都不自动成为 active。
5. 采用 governed profile 和显式 proposed → review → approval → active → completed 生命周期。

## Consequences

- 新 session 可用固定顺序恢复，不依赖聊天。
- 当前状态与历史证据分离，启动文档可受预算门禁约束。
- 仓库同时存在 `doc/` 与 `docs/`，必须通过入口地图明确区分。
- 需要正式执行旧产品计划时，必须从当前证据重新建立被跟踪的 proposed plan。

## Evidence

- 用户于 2026-07-14 明确要求使用 harness engineering skill 改造项目。
- skill 只读审计判定 governed profile 缺失 19 个 artifacts，改造前 Git 工作区干净。
- 既有 `.gitignore` 明确忽略 `doc/`，既有 `AGENTS.md` 明确要求保留项目边界与 Git 外置规则。

## Activation Boundary

本决策只激活 harness 控制面和文档职责，不授权任何产品功能、协议或 Agent 自动采纳行为变更。
