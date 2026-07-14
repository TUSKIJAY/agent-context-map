# DEC-003 — Authoritative Repository Relocation

- Status: Accepted
- Date: 2026-07-14
- Scope: Agent Context Map 的唯一权威工作目录、Git 历史、远端和旧副本地位
- Supersedes: 原 `C:\Users\LENOVO\Desktop\工作\星际之门\LLM\project\agent思维导图` 工作目录及其外置 Git store 的权威地位

## Context

项目同时存在两个本地目录。星际之门目录保存完整 Git 历史、当前 `codex/agy_agent` 分支和未提交治理改动；`D:\Code\agent-context-map` 则是远端 `main@2d570d4` 文件树的独立重新初始化快照，只有无共同历史的 root commit `7754f90`，且未配置远端。

用户于 2026-07-14 明确决定：以后以 `D:\Code\agent-context-map` 为准，并授权迁移。

## Decision

1. `D:\Code\agent-context-map` 成为唯一权威工作目录和所有后续开发、验证、状态更新及 Git 操作入口。
2. 将原星际之门仓库的完整历史、`main`、当前 `codex/agy_agent` 分支、未提交变更和冻结 `doc/` 历史迁入 D 盘目录。
3. D 盘原独立 root commit `7754f90` 通过 `archive/pre-migration-d-snapshot` 保留，避免历史丢失；不得继续作为开发基线。
4. D 盘仓库配置 `origin=https://github.com/TUSKIJAY/agent-context-map.git`。迁移本身不授权 commit 或 push，本地领先提交和工作区改动保持原状。
5. D 盘目录不位于 Google Drive 同步根内，因此使用普通项目内 `.git/`；原星际之门外置 Git store 只作为迁移来源保留，不在本次迁移中删除。
6. 原星际之门工作目录迁移后不再作为当前状态或实现依据；未来 session 必须从 D 盘启动并以其 Git、文件和验证结果为准。

## Consequences

- 本地只保留一个明确的开发真源，避免两个无共同历史的仓库继续分叉。
- GitHub `main` 和 `codex/agy_agent` 的跟踪关系在 D 盘恢复；尚未推送的本地提交仍保持本地领先状态。
- 原目录和外置 Git store 暂不删除，提供人工确认后的回退窗口；它们的存在不再代表权威。
- 启动规则、状态文档、项目地图和后续 session 指令必须使用 D 盘路径。

## Alternatives Considered

- 继续双目录并行：拒绝，会产生状态、历史和功能真源分叉。
- 保留 D 盘独立 initial commit 并手工复制文件：拒绝，会丢失原项目历史和远端关系。
- 直接删除 D 盘 `.git/` 或原星际之门目录：拒绝；迁移应先保留可回退证据，删除需另行明确授权。

## Activation Boundary

本决策立即授权本次仓库迁移和相关路径、状态文档同步；不授权插件化源码实施，不激活任何 proposed plan，也不授权 commit、push 或删除旧目录。
