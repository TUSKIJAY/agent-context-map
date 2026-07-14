# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 6 已完成；下一步执行 Phase 7 CI、clean-room 与 release candidate。

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
- Phase 6：
  - 模型可见的 get/validate/write/import/export 只读取正式项目或创建内存 pending proposal；proposal 绑定 task/project/document/revision，15 分钟过期且不进入保存、导出或 Agent Diff；
  - app-only commit/manual edit/send 必须来自当前 ready Widget instance，先生成 preview，再消费一次性短 TTL gesture；commit 在文档锁内复核 expectedRevision，clientMutationId 保证幂等；
  - canonical operation policy 拒绝 legacy snake_case、patchMeta、confirmed 升级、未知字段、超 100 operations、超 512 KiB 和 instruction-like 内容；
  - selected/related/execution context 分别执行精确选择、单层有向 allowlist 扩展和 Task-only 冲突门禁；send payload/digest 由 server 重建，并拒绝 stale task/instance/revision 与 prompt injection；
  - Widget 使用标准 `ui/message` 发送，兼容 fallback 只在标准能力不可用时启用；底部 safe action bar 明示 preview、二次确认和发送结果。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 6 scoped commit 待本次 Gate 收尾创建；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 6 complete；Phase 7 next

## Phase 6 Verification

已运行并通过：

```powershell
npm run build:widget
npm run test:mcp-schema
npm run test:mcp-tools
npm run test:proposal-boundary
npm run test:revision-conflict
npm run test:context-selection
npm run test:send-semantics
npm run test:prompt-injection
npm run test:concurrency
npm run test:widget-bundle-policy
npm run test:distribution
npm run test:mcp-bundle-repro
npm test
npm run build
npm run harness:check
npm run harness:budget
git diff --check
```

结果：Phase 6 专项 16 tests、全仓 36 files / 101 tests；Vite 317 modules，Tauri release executable/MSI/NSIS 通过。Widget HTML 2,095,044 bytes，SHA-256 `abc2e2e4b55e19961748877e6e1ee9eb559e3da01636f0c3c9c044be8ab6f4e0`；MCP Release 两次构建 SHA-256 `4ddc0e0c6cb576d254bc1763c0c64b7432bf50e3f3963a38316cb3e3604e1f52`。distribution、bundle policy、plugin validator、harness、budget 与 diff check 通过。

真实宿主证据：Playwright Edge 通过标准 MCP Apps bridge 渲染 2 nodes/1 edge；首次点击“发送选中”只建立 preview，`ui/message` 与 `send_acm_context` 均为 0，二次点击“确认并发送”后两者各为 1 且消息与 server 授权 payload 一致；proposal 采纳显示确认并只调用一次 commit。localStorage 为空，仅有测试页 favicon 404；脱敏证据在 `plugins/agent-context-map/tests/evidence/phase6-pending-send-gate.json`。

关键实现：

- `plugins/agent-context-map/mcp/src/tools/definitions.js` 与 `registry.js`：14 个严格 schema 工具、模型/app 可见性边界与 server-side preflight。
- `plugins/agent-context-map/mcp/src/tools/operation-policy.js`：canonical operation、尺寸/数量、字段与 prompt-injection policy。
- `plugins/agent-context-map/mcp/src/state/`：revision-bound context、pending proposal、ProjectStore 和 send service。
- `packages/acm-core/src/context.js`：selected/related/execution context builder 与执行冲突门禁。
- `plugins/agent-context-map/widget/src/Phase6Controls.jsx`：proposal/manual preview、一次性 gesture、二次确认和标准消息发送。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- Windows safe replace 与 Phase 6 write concurrency 已原生执行；portable tests 已建立，macOS/Linux 真实矩阵留在计划 Phase 7，不把它写成已运行证据。
- Phase 7 必须在隔离 HOME/clean checkout 中验证 release candidate，不得把当前仓库的 node_modules、源码路径或已安装插件当成隐式依赖。
- 三平台 CI 未经远端 runner 实跑前不能宣称绿色；push 仍必须取得本任务中的明确授权。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 建立 Windows/macOS/Linux CI matrix，固定 Node/npm/lockfile，并覆盖 core/MCP/Widget/project-store 与平台文件系统语义。
2. 建立 clean-room 两次构建、source-free release 启动、checksum 与 SBOM/dependency manifest Gate。
3. 在隔离 HOME 中覆盖 fresh/update/downgrade/uninstall/reinstall，全程验证项目 `.acm` hash 不变。
4. 形成 scoped local commit；远端 matrix 需要获得明确 push 授权后才能实跑和完成 Phase 7 Gate。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
