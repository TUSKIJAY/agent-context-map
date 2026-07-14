# DEC-007 — SQLite Read-only Migration And Rollback

- Status: Accepted
- Date: 2026-07-14
- Scope: 现有 Tauri SQLite v1 数据到项目 ACM-MD 单真源的一次性迁移
- Reopen: Phase 2 发现语义无法无损表达、跨平台安全替换无法证明或迁移必须长期双写

## Context

Phase 2 前，桌面端的 `documents.body` 与 `base_snapshot` 是 JSON blob；`snapshots` 和 `app_state` 也位于 SQLite。DEC-004 已选定项目 `.acm/documents/*.acm.md` 为业务单真源，但迁移不能修改原库、丢字段或在失败时留下半切换状态。

## Decision

1. migration reader 只读打开 legacy SQLite；安装、启动或插件更新不得自动迁移。
2. 迁移顺序固定为 list/dry-run → 用户映射 → core normalize → JS/Python strict validation → round-trip → 用户状态目录备份 → 同目录临时文件与安全替换 → index 重建 → 用户确认切换。
3. 默认 all-or-report；任何非法文档只报告，不自动修补、清空、丢弃字段或改写原库。
4. SQLite 与项目 ACM-MD 不双写、不反向同步；切换后 SQLite 仅保留只读回退入口，且不自动删除。
5. rollback 只回退 adapter/binding 和未完成的新文件事务，不覆盖或删除原 SQLite 数据；无法确认恢复状态时进入只读 `recovery_required`。

## Chosen And Rejected

- Chosen: 显式、只读、带备份和可回滚的一次性迁移。
- Rejected: 启动时自动迁移、长期双写、逐项静默修补、迁移失败后以 sample/空图覆盖。
- Rejected: 把 SQLite 数据库备份放进项目或 Git 跟踪范围。

## Consequences

- Phase 2 已通过迁移、expectedRevision、锁、安全替换、故障恢复和 Tauri project-store Gate；`INSTRUCTIONS.md` 与业务真源已同步切换。Node fixture migration 使用 read-only SQLite 并做 JS/Python strict parity、原库 hash、备份和 rollback 验证；产品 UI 使用 `sqlx read_only(true)`，每次只预览并确认一份文档。
- 原库保持可审计；失败文档不会阻断其他文档的报告，但不会被悄悄部分提交。
