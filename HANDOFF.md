# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 5 已完成；下一步执行 Phase 6 完整 MCP 工具、pending 写入与发送语义。

## Resume Point

- 权威仓库：`D:\Code\agent-context-map`，项目内普通 `.git/`，分支 `codex/acm-pluginization-plan`，origin `https://github.com/TUSKIJAY/agent-context-map.git`；该分支尚无 upstream。
- active plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`；review-002 = approve；用户于 2026-07-14 批准。
- Phase 0A/0B：baseline/ADR 与真实 Codex Desktop host identity Gate 已完成；提交 `8162e6e`、`06c2502`。
- Phase 1：platform-free `packages/acm-core` 与 JS/Python validator parity 已完成；提交 `d386246`。
- Phase 2：
  - `packages/project-store` 是 Node/MCP 可复用项目存储，`packages/acm-core` 仍是唯一协议/operation/revision 语义核心；
  - Tauri 正式正文只写用户原生选择项目的 `.acm/documents/*.acm.md`，index 只作 cache；
  - SQLite write backend、SQL plugin 和 SQL capability 已移除，legacy 数据只由 `src-tauri/src/legacy_sqlite.rs` 以 read-only preview/backup 读取；
  - `INSTRUCTIONS.md`、DEC-004/DEC-007 已在 Gate 后同步为当前事实。
- Phase 3：
  - `packages/acm-editor` 承担 editor shell、document controller、能力 contracts、画布与面板；不依赖 Tauri、SQLite、Node fs、MCP SDK 或宿主全局自发现；
  - `src/App.jsx` 是 Desktop composition root，`src/platform/tauri` 与 `src/platform/browser` 提供可注入 adapters；
  - FlowCanvas export 由 adapter 注入；pending proposal 与正式 Diff 已分栏；产品 Agent 调用方只产出 canonical camelCase operations；
  - Tauri capability 已收敛到 dialog open/save 与 text write，文件 scope 只由原生对话框动态授予。
- Phase 4：
  - `plugins/agent-context-map` 是正式 local-only Codex plugin 源；manifest、`.mcp.json`、bundled stdio MCP 和构建复制 skill 已落位；未创建 public marketplace；
  - `host-binding.js` 只接受 host-owned task/workspace metadata 与 MCP roots 的单根交集，模型参数、cwd、最近项目和额外 writable dir 不构成授权；
  - `path-security.js` 把文件访问限制在 canonical project root 的 `.acm/documents/*.acm.md`，拒绝 traversal、absolute path、symlink/junction escape 和 Windows 保留设备名；
  - 单进程 `session-service` 已通过 task 隔离、same-task binding、reload 和 clean-package 验证；DEC-006 确认为 single bundled stdio MCP，不引入 daemon/listener/token；
  - Phase 4 的 control plane 已被 Phase 5 Widget resource 扩展；完整写工具仍留给 Phase 6。
- Phase 5：
  - `plugins/agent-context-map/widget` 构建 self-contained MCP Apps Widget，标准 `ui/*` bridge 为主、`window.openai` 仅作兼容 fallback；
  - `acm-editor` 在 Widget 内使用 ephemeral working copy，人工编辑不会绕过 proposal/commit 边界写项目文件，也不使用 localStorage 业务真源；
  - `mcp/src/widget/lifecycle-service.js` 以 attempt/task/project/instance 建立单调状态机，rebind 会 supersede 旧实例，旧实例不能 ready/commit/send；
  - ready 必须同时包含 React mounted、项目 snapshot hydrated 和 React Flow canvas first frame；open tool 返回和无 Widget 的 await 都不构成 ready；
  - UI resource 内嵌 production Widget HTML，CSP/资产 local-only；正式 app-only commit/send 仍为 Phase 6 reserved fail-closed stub。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 5 scoped commit 待本次 Gate 收尾创建；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 5 complete；Phase 6 next

## Phase 5 Verification

已运行并通过：

```powershell
npm run build:widget
npm run test:widget
npm run test:widget-lifecycle
npm run test:widget-rebind
npm run test:widget-bundle-policy
npm run test:distribution
npm run test:mcp-bundle-repro
npm test
npm run build
npm run harness:check
npm run harness:budget
git diff --check
```

结果：Widget 3、lifecycle 1、rebind 2、bundle policy 1、distribution 3、全仓 29 files / 88 tests；Vite 317 modules，Tauri release executable/MSI/NSIS 通过。Widget HTML 2,087,825 bytes，SHA-256 `ef20b5144c7edab1045d581403d70a9cb4ccc37a3a54fc37f3aa86929e55a527`；MCP Release 两次构建 SHA-256 `a0e0776bd80f19542f6b4dbeb4bd8b2b8f5d87a6fdf9dc6a8a19538f0e1fbbe4`。plugin validator、harness、budget 与 diff check 通过。

真实宿主证据：Playwright Chromium 通过标准 MCP Apps `ui/initialize`、tool-result、bootstrap、ready 序列真实渲染 `acm-editor` 的 2 nodes/1 edge，并观察到标题编辑；console error、localStorage、远程网络能力均为零。正式产品插件通过临时 canary 安装到 `codex-cli 0.144.2`：非 Git workspace fail closed，可信 Git workspace open 成功但 openReady/无挂载 Widget 的 await 均为 false，fixture `.acm` hash 不变。临时插件、marketplace 与测试项目已移除；脱敏证据在 `plugins/agent-context-map/tests/evidence/phase5-widget-gate.json`。

关键实现：

- `plugins/agent-context-map/widget/src/platform/WidgetHostAdapter.js`：标准 MCP Apps host bridge、兼容 fallback、result race 缓存与尺寸通知。
- `plugins/agent-context-map/widget/src/platform/widget-platform.js`：ephemeral editor adapters 和 Phase 5 capability 边界。
- `plugins/agent-context-map/mcp/src/widget/lifecycle-service.js`：attempt/task/project/instance 生命周期与真实 ready proof。
- `plugins/agent-context-map/scripts/build-widget.mjs`：self-contained production Widget 和 local CSP。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- Phase 6 必须让模型可见 write/import 只创建 pending proposal，只有 app-only、当前 instance 的明确用户动作才能 commit/send。
- legacy snake_case operations 已从产品调用方移除，只在显式 fixture/import diagnostics adapter 接受；Phase 6 必须按计划彻底拒绝 legacy 名称。
- Windows safe replace 已原生执行；portable tests 已建立，macOS/Linux 真实矩阵留在计划 Phase 7，不把它写成已运行证据。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 实现 get/validate/write/import/export；write/import 只返回 pending proposal，严格只接受 canonical camelCase operations。
2. 实现 proposal store 和 app-only commit，在文档锁内重读 expectedRevision 并拒绝 stale task/instance/proposal。
3. 实现 selected/related/execution context builder、server-side payload/digest 和 click-gated app-only send。
4. 运行 MCP schema/tools、proposal/revision/context/send/prompt-injection/concurrency、build、Tauri regression、harness 和 diff Gate。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
