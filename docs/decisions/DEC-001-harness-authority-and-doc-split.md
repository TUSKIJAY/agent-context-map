# DEC-001 — Harness Authority And Documentation Split

- Status: Accepted
- Date: 2026-08-11
- Scope: Agent 启动入口、状态职责、文档权威和 legacy `doc/` 边界

## Context

改造前，仓库只有 `AGENTS.md`、长篇 `HANDOFF.md` 和 `PROJECT_MAP.md` 参与接手；其中混有单机 Windows 路径、外置 Git 假设、已完成项目历史和当前操作规则。`doc/` 被 `.gitignore` 排除，却仍被描述为计划与协议入口，导致换机器或换 session 后无法仅靠被跟踪文件恢复统一事实。

## Decision

1. `AGENTS.md` 是唯一 Agent 规则入口，`CLAUDE.md` 只保留指针。
2. 启动链固定为 `AGENTS.md` → `INSTRUCTIONS.md` → `PROGRESS.md` → `HANDOFF.md` → `PROJECT_MAP.md`；需要治理材料时再进入 `docs/README.md`。
3. `INSTRUCTIONS.md` 保存稳定项目事实；`PROGRESS.md` 保存项目级当前状态；`HANDOFF.md` 保存会话级恢复点；`PROJECT_MAP.md` 只保存路径职责。
4. 新的计划、评审、决策、优化 intake 和进度归档统一进入被 Git 跟踪的 `docs/`。
5. 被忽略的 `doc/` 保持原位且冻结，只能历史回查，不再充当规范、当前状态、计划或执行权限来源。
6. ACM-MD v0.1 的唯一被跟踪规范为 `skills/acm-md/references/acm-md-v0.1.md`。
7. Git 路径和 `.git` 存储形态只通过当前 checkout 的 Git readback 获取，不硬编码机器路径。

## Consequences

- 新 Agent 可以只依靠被跟踪文件恢复项目边界、当前状态和下一步。
- 旧长篇 `HANDOFF.md` 的历史进入 `docs/progress-archive/`，启动上下文保持紧凑。
- 旧 `doc/` 内容不会被删除或迁移，但新增工作不得继续写入该目录。
- 小任务继续直接执行；governed profile 不强制所有任务创建正式计划。

## Alternatives Considered

- 继续只维护 `AGENTS.md` 与长篇 `HANDOFF.md`：拒绝，因为规则、状态和历史会再次混合并持续膨胀。
- 把 `doc/` 直接批量迁移到 `docs/`：拒绝，因为会扩大当前 harness 任务范围，并可能把未复核的历史材料误升为当前权威。
- 沿用固定 Windows 外置 Git 路径：拒绝，因为当前 checkout 的实际 Git 数据位于项目内 `.git/`，机器特定假设会阻断其他环境。

## Activation Boundary

本决策仅约束此后 Agent 的启动、文档放置、状态维护和 Git 事实读取。它不激活任何产品功能、插件化计划、依赖升级、协议变更、push、PR 或合并。
