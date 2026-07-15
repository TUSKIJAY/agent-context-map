# Runbooks

本目录保存经 active plan 授权、可重复执行的发布、试点、恢复与回滚步骤。runbook 只定义操作顺序和证据要求；涉及真实安装、外部发布或删除状态时，仍必须满足对应 plan Gate 与用户授权。

| Runbook | Status | Scope |
| --- | --- | --- |
| [Agent Context Map 插件 Phase 8 canary、发布与回滚](agent-context-map-plugin-release.md) | Windows A1 failed / stop no retry | 真实 Codex Desktop、repo marketplace、公开 New task/deep link、固定 Release、canary/stable、回滚与恢复 |
