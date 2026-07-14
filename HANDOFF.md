# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 0B 已完成并得到 `trusted_host_identity`；下一步执行 Phase 1 acm-core 协议等价抽取。

## Resume Point

- 权威仓库：`D:\Code\agent-context-map`，项目内普通 `.git/`，分支 `codex/acm-pluginization-plan`，origin `https://github.com/TUSKIJAY/agent-context-map.git`；该分支尚无 upstream。
- active plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`；review-002 = approve；用户于 2026-07-14 批准。
- Phase 0A/0B 已完成：
  - Phase 0A 固定决策与 baseline，提交 `8162e6e`；
  - Phase 0B 在 `spikes/codex-host-binding/` 建立最小 repo-local plugin、只读 stdio MCP、6 个自动化 tests 和脱敏 Gate report；
  - Codex Desktop new task、same-task follow-up、second task、cachebuster reload 与伪造 identity args 均验证；最终 Gate = `trusted_host_identity`；
  - 单一 host workspace 可绑定；多 workspace 候选只返回 `trusted_native_picker_required`，缺任一 task/root 证据均 `unavailable`。
- 当前仍没有创建产品插件、core/editor 重构、项目 store、数据迁移或 `.acm` 写路径；Phase 0B spike 与产品代码完全隔离。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 0B scoped commit；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 0B complete；Phase 1 next

## Phase 0B Verification

已运行并通过：

```powershell
npm run test:host-binding-spike
python "$env:USERPROFILE\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py" spikes\codex-host-binding\plugins\codex-host-binding-spike
npm run harness:check
npm run harness:budget
npm run test -- --run tests/baseline
npm run test:distribution
npm run build
git diff --check
```

真实宿主证据见 `spikes/codex-host-binding/evidence/gate-report.json`。同一任务 instance/task/root hash 稳定；第二任务产生独立 instance/task hash；cachebuster 重装后 root hash 不变；伪造 `projectPath/workspaceRoot/threadId/taskId` 全部被记录为 ignored，`modelArgumentsUsedForAuthorization=false`。临时证据不含仓库路径或伪造路径明文，不提交 raw NDJSON。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- pending proposal 仍不得进入项目、正式图谱、保存、导出或 Agent Diff；本机缓存也必须短 TTL、完整 binding 和重新预览。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前可证明范围；push 仍须用户在当前任务明确确认。

## Blockers And Risks

- DEC-005 的 Phase 0B evidence Gate 已满足，但公开文档仍未承诺这些 host-owned 字段；Phase 4 必须在产品 MCP 中复验，字段漂移即 fail closed 并重开 ADR。
- 多 root 真实 Desktop 选择器尚未作为自动授权路径开放；当前策略是多候选返回 `trusted_native_picker_required`。任何实现不得把附加可写目录或模型参数提升为 workspace root。
- Vite 5 audit advisory 需在后续获授权依赖升级范围内解决，不影响本地 production build，但影响 dev-server 安全基线。

## Next Gate

1. 从 `src/acm/data.js` 抽取纯 Node `acm-core`；React/layout/display helpers 留在 UI 层。
2. 建 JS/Python strict validator parity、确定性 round-trip、规范 camelCase operations/preconditions/changes projection 和 legacy input diagnostics。
3. 运行 Phase 1 全部自动化 Gate、Vite/Tauri 回归与 scoped commit；未过停止条件不得进入 Phase 2。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
