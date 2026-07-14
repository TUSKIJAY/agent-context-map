# Decision Index

Only decisions explicitly marked `Accepted` are binding. Proposed decisions are review-only and cannot activate plans or implementation.

| Decision | Status | Scope | Supersedes |
| --- | --- | --- | --- |
| [DEC-001 Harness authority and doc split](DEC-001-harness-authority-and-doc-split.md) | Accepted；文档分工部分已被取代 | Agent 启动入口、状态职责、原 `doc/` 与 `docs/` 分工 | 早期仅靠 `AGENTS.md` + 长篇 `HANDOFF.md` 的隐式模型 |
| [DEC-002 Docs-only governance](DEC-002-docs-only-governance.md) | Accepted | 所有新过程文档统一进入 `docs/`；`doc/` 冻结 | DEC-001 的双目录文档分工 |
| [DEC-003 Authoritative repository relocation](DEC-003-authoritative-repository-relocation.md) | Accepted | 将唯一权威工作目录迁至 `D:\Code\agent-context-map`，保留完整历史与原快照归档 | 原星际之门工作目录及外置 Git store 的权威地位 |
| [DEC-004 Project ACM-MD content source](DEC-004-project-acm-md-content-source.md) | Accepted / Implemented in Phase 2 | 插件化计划的项目 ACM-MD 单真源、SQLite 只读迁移和 INSTRUCTIONS.md 同步时机 | 已取代 SQLite JSON blob 的业务真源地位 |
| [DEC-005 Codex host identity and project root](DEC-005-codex-host-identity.md) | Accepted / Phase 0B + Phase 4 evidenced | task/workspace identity、可信项目根与 fail-closed Gate | 模型参数、最近项目和插件 cwd 作为授权来源 |
| [DEC-006 Single stdio MCP before loopback daemon](DEC-006-single-stdio-mcp-default.md) | Accepted / Confirmed in Phase 4 | control plane 进程拓扑；当前采用单 bundled stdio MCP + in-process session service | 预先拆分 loopback daemon |
| [DEC-007 SQLite read-only migration](DEC-007-sqlite-read-only-migration.md) | Accepted / Implemented in Phase 2 | SQLite v1 只读迁移、备份、切换与回滚顺序 | 自动迁移、长期双写和静默修补 |
