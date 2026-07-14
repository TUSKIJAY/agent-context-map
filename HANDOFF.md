# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 4 已完成；下一步执行 Phase 5 原生 Widget、生命周期和 editor 复用。

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
  - `plugins/agent-context-map` 是正式 local-only Codex plugin 源；manifest、`.mcp.json`、bundled stdio MCP、UI resource 占位和构建复制 skill 已落位；未创建 public marketplace；
  - `host-binding.js` 只接受 host-owned task/workspace metadata 与 MCP roots 的单根交集，模型参数、cwd、最近项目和额外 writable dir 不构成授权；
  - `path-security.js` 把文件访问限制在 canonical project root 的 `.acm/documents/*.acm.md`，拒绝 traversal、absolute path、symlink/junction escape 和 Windows 保留设备名；
  - 单进程 `session-service` 已通过 task 隔离、same-task binding、reload 和 clean-package 验证；DEC-006 确认为 single bundled stdio MCP，不引入 daemon/listener/token；
  - 当前只提供 health 与 read-only strict validate；UI resource 仍是 Phase 4 占位，不包含 editor 或写工具。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 4 scoped commit；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 4 complete；Phase 5 next

## Phase 4 Verification

已运行并通过：

```powershell
npm run build:mcp
npm run test:mcp-schema
npm run test:mcp-runtime
npm run test:project-binding
npm run test:path-security
npm run test:distribution
npm run test:mcp-bundle-repro
npm test
npm run build
npm run harness:check
npm run harness:budget
git diff --check
```

结果：Release 8 files；schema 3、runtime 2、binding 4、path security 10、distribution 3、全仓 24 files / 81 tests；Vite 317 modules。bundle 两次构建 SHA-256 为 `25b79aec2b04a29b4222688b8b210b78868851b4b8096704f59bccd5971e3396`。clean package 仅用 Release 内容启动；plugin validator、harness、budget 与 diff check 通过。

真实宿主证据：Phase 0B 已完成 Codex Desktop Gate；Phase 4 将正式产品插件通过临时 local marketplace 安装到 `codex-cli 0.144.2`，3 个独立只读 task、remove/reinstall reload 和额外 writable dir 均保持同项目 fingerprint、不同 session；strict schema/服务端测试拒绝伪造 identity，多 root fail closed，项目 `.acm` 未修改。临时 plugin/marketplace 已移除；脱敏证据在 `plugins/agent-context-map/tests/evidence/phase4-host-gate.json`。

关键实现：

- `plugins/agent-context-map/mcp/src/tools/registry.js`：稳定 envelope、strict schema、truthful annotations 和只读工具。
- `plugins/agent-context-map/mcp/src/security/`：host binding、root canonicalization 和 path containment。
- `plugins/agent-context-map/mcp/src/session/session-service.js`：task/project session 隔离与 rebind 拒绝。
- `plugins/agent-context-map/scripts/build-mcp.mjs`：自包含 server、skill 复制、clean release 和确定性 manifest。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- Phase 5 必须确认真实 MCP Apps bridge 与 ready proof；若宿主 bridge 能力不足且无安全兼容方案，按计划停止。
- legacy snake_case operations 已从产品调用方移除，只在显式 fixture/import diagnostics adapter 接受；Phase 6 必须按计划彻底拒绝 legacy 名称。
- Windows safe replace 已原生执行；portable tests 已建立，macOS/Linux 真实矩阵留在计划 Phase 7，不把它写成已运行证据。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 创建 `plugins/agent-context-map/widget`、WidgetHostAdapter、app-only widget API 与独立 Vite Widget build。
2. 通过 MCP Apps bridge hydrate `acm-editor`，实现 openAttempt/widgetInstance/rebind/supersede 单调状态机和画布首帧 ready proof。
3. 验证 reload、新 task、多实例、旧 instance 权限隔离，以及 local-only CSP/asset/bundle policy。
4. 运行 `build:widget`、widget lifecycle/rebind/bundle-policy、distribution、Tauri regression、harness 和 diff Gate。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
