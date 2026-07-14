# DEC-004 — Project ACM-MD Content Source

- Status: Accepted
- Date: 2026-07-14
- Scope: Codex 插件化 active plan 的业务内容真源、SQLite 迁移边界与 INSTRUCTIONS.md 更新时机
- Supersedes: Phase 2 Gate 成功并完成真源切换后，取代“SQLite JSON blob 是桌面业务内容真源”的既有架构决策；在此之前不取代当前事实

## Context

当前 Tauri 桌面端把图谱正文以整份 JSON 保存在 SQLite，浏览器开发模式使用 localStorage fallback。已通过 review-002 的 Codex 插件化计划要求 Tauri 与 Codex Widget 共享同一项目内容真源；若 SQLite、项目 ACM-MD 和 Widget session 同时可写，会形成三套冲突真源。

用户于 2026-07-14 明确批准将该计划迁入 active，并采用计划 §14.2 的推荐数据真源与迁移口径。

## Decision

1. 目标业务内容单真源是项目内 `.acm/documents/*.acm.md`；`.acm/index.json` 只是可重建导航投影。
2. SQLite 只作为一次性、只读、带备份和回滚的迁移来源，不做 SQLite 与 ACM-MD 长期双写或双向同步。
3. Agent proposal 和 Widget pending state 不是业务真源，不得进入项目正式图谱、保存、导出或 Agent Diff；其本机缓存边界仍受 active plan、AGENTS.md 和人工采纳 Gate 约束。
4. Phase 2 必须先完成迁移预览、严格校验、round-trip、expectedRevision、锁、原子替换、故障恢复、回滚和 Tauri project-store 验收，再允许实际切换业务真源。
5. 只有 Phase 2 Gate 全部通过且业务真源实际切换时，才在同一 Phase 更新 INSTRUCTIONS.md 的 Product And Stack 与 Stable Invariant 5；若 Phase 2 失败或未切换，INSTRUCTIONS.md 继续陈述当前 SQLite 事实。
6. `.acm` 的 Git 跟踪采用“默认建议跟踪、首次提示敏感风险、由项目用户选择”的策略；插件不得自动修改 `.gitignore` 或执行 git add/commit/push。

## Consequences

- Tauri 与插件未来围绕同一项目文件做 revision、锁和冲突控制，避免多真源漂移。
- 迁移成为显式用户操作并保留原 SQLite 数据，不允许以安装、启动或插件更新隐式触发。
- Phase 2 前的当前运行时行为不变；本决策不会提前把目标架构写成已实现事实。
- 若任一平台无法证明安全替换、迁移丢失语义或必须长期双写，Phase 2 必须停止。

## Alternatives Considered

- SQLite 继续作为唯一真源，由插件远程调用桌面数据库：拒绝，会把插件绑定到 Tauri/SQLite 生命周期并破坏项目可移植性。
- SQLite 与项目 ACM-MD 长期双写：拒绝，会形成难以恢复的冲突真源。
- Widget session 或 pending proposal 作为第三套真源：拒绝，违反 pending-only 与人工采纳边界。
- activation 时立即改写 INSTRUCTIONS.md：拒绝；目标尚未实现，提前改写会让稳定章程失真。

## Activation Boundary

本决策随 Codex 插件化 plan 的 activation 生效，约束后续 Phase 2 的设计和 Gate；它不启动 Phase 0，不迁移数据，不修改当前 SQLite、项目 `.acm`、INSTRUCTIONS.md 或产品源码。任何真实切换仍必须等待 active plan 的 Phase 2 验收闭环。
