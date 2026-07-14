# DEC-006 — Single Stdio MCP Before Loopback Daemon

- Status: Accepted, provisional default
- Date: 2026-07-14
- Scope: Codex 插件 control plane 的进程拓扑
- Reopen: Phase 4 证明单 stdio MCP 无法满足 reload、多 Widget 隔离、并发、生命周期或安全要求

## Context

路线 C 允许可选 loopback daemon，但新增本地常驻进程会扩大攻击面、安装面和升级/回滚复杂度。当前没有证据表明单个 bundled stdio MCP 无法承载 session service。

## Decision

1. Phase 0B 与 Phase 4 的默认实现是单 bundled stdio MCP；不提前引入 daemon。
2. server 内部可以保持清晰的 session-service 接口，使后续在证据充分时拆分进程，但不得让该抽象产生远程服务、云依赖或第二业务真源。
3. 只有 Phase 4 ADR Gate 用真实宿主重载、多 task、多实例和并发证据证明单进程不足时，才允许引入只监听 `127.0.0.1` 随机端口、256-bit 随机 token、父进程联动退出和短 TTL 的 daemon。
4. Widget 永不直接持有 daemon token，也不直接 fetch 任意 localhost URL；访问仍通过 app-only MCP proxy。

## Chosen And Rejected

- Chosen: 单 stdio MCP + 内部 session service 作为最小攻击面默认值。
- Rejected: 为未来可能的性能或生命周期问题预先拆 daemon。
- Rejected: 非 loopback 监听、固定端口、固定 token、LAN/远程 control plane。

## Consequences

- Phase 0B spike 保持无网络、只读、无项目业务依赖。
- 若 Phase 4 需要重开本决策，必须记录可重复失败证据和 daemon 的额外安全测试。
