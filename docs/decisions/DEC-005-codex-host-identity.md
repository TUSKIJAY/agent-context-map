# DEC-005 — Codex Host Identity And Project Root

- Status: Accepted, Phase 0B evidence gate satisfied
- Date: 2026-07-14
- Scope: Codex 插件 MCP 的 task/workspace identity、项目根授权与 Phase 0B Gate
- Reopen: Codex host metadata、MCP roots、原生目录选择器或插件进程生命周期的公开/实测契约发生变化

## Context

插件写路径必须绑定当前 Codex task 与 workspace root，且该身份不能由模型 tool arguments 伪造。2026-07-14 刷新的 Codex Manual 确认本地客户端支持 bundled stdio MCP、项目级 MCP 配置和 repo marketplace，但没有公开保证插件 server 会收到不可由模型覆盖的 task/thread/workspace identity。

## Decision

1. Phase 0B 只用隔离的只读 stdio MCP 采集初始化、roots、tool-call 与进程生命周期证据；不读取或写入项目 `.acm`。
2. 可用于授权的 root/task identity 必须来自宿主协议字段、MCP client roots 或用户原生可信 UI；模型传入的 `projectPath`、`workspaceRoot`、`threadId`、`taskId` 一律不构成授权。
3. 在 Phase 0B 证明 `trusted_host_identity` 前，产品插件的项目写入与 Phase 1 后续实施保持 fail closed。
4. 若只能证明可信 root 而不能证明 task 隔离，结论仍为 `unavailable`；不得用 server 启动目录、最近项目或环境猜测补足 task binding。
5. `trusted_native_picker_required` 只有在真实宿主证明原生 picker 能提供不可由模型覆盖的授权后，才可重新提交用户决定；本决策不预先批准该降级。

## Chosen And Rejected

- Chosen: 宿主/MCP 协议证据优先，缺证据即 fail closed。
- Rejected: 模型参数、任意绝对路径、最近项目、插件 cwd 或可被模型影响的文本作为授权根。
- Rejected: 用 mock、浏览器测试或静态文档替代真实 Codex Desktop 证据。

## Consequences

- Phase 0B 可能合法阻断整个插件化计划；这是安全 Gate，不是可绕过的测试缺口。
- spike 证据只记录字段名、类型、来源、稳定性、Codex 版本和脱敏 correlation ID，不记录图谱正文或凭证。

## Phase 0B Evidence Result

2026-07-14 的 repo-local read-only spike 在 Codex Desktop 宿主（embedded `codex-cli 0.144.2`）验证到 host-owned `threadId`、`x-codex-turn-metadata.session_id/thread_id/workspaces`。模型可见 `projectPath/workspaceRoot/threadId/taskId` 被忽略，不能覆盖 binding；同任务 identity 稳定、不同任务隔离、cachebuster reload 后项目 root fingerprint 稳定。Gate 结论为 `trusted_host_identity`，证据见 `spikes/codex-host-binding/evidence/gate-report.json`。

该结论只批准“恰好一个 host-owned workspace 候选”的 binding。多候选必须由可信原生 UI 选择，否则返回 `trusted_native_picker_required`；缺少 task 或 root 证据继续 `unavailable`。Phase 4 必须在产品 MCP 生命周期重放，字段来源或稳定性漂移时立即重开本 ADR。
