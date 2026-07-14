# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 3 已完成；下一步执行 Phase 4 插件壳、MCP control plane 与安全根绑定。

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

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 3 scoped commit；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 3 complete；Phase 4 next

## Phase 3 Verification

已运行并通过：

```powershell
npm test -- --run acm-editor
npm run test:import-boundaries
npm test
npm run build
npm run tauri -- build
npm run harness:check
git diff --check
```

结果：editor 命令 4 files / 7 tests；import-boundaries 1 file / 4 tests；全仓 19 files / 60 tests；Vite 317 modules；Tauri release executable、MSI 与 NSIS bundle 构建成功；harness 与 diff check 通过。桌面 smoke 绑定临时项目后完成新建、编辑、撤销/重做、校验、正式 Diff、保存，并从最近文档重开验证 `Phase 3 smoke 目标` 持久化。

关键实现：

- `packages/acm-editor/src/AcmEditorShell.jsx` 与 `document-controller.js`：platform-free UI 与文档会话控制。
- `packages/acm-editor/src/contracts.js`：可执行 mock platform，证明 editor 可脱离 Tauri 加载。
- `src/platform/index.js`：唯一平台选择点；Tauri/Browser adapters 在 composition root 注入。
- `tests/import-boundaries/acm-editor-boundary.test.js`：静态证明 editor closure、canonical operations、composition injection 与最小 capabilities。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- Phase 4 必须在产品 MCP 生命周期复验 DEC-005 host identity；字段漂移即 fail closed。
- legacy snake_case operations 已从产品调用方移除，只在显式 fixture/import diagnostics adapter 接受；Phase 6 必须按计划彻底拒绝 legacy 名称。
- Windows safe replace 已原生执行；portable tests 已建立，macOS/Linux 真实矩阵留在计划 Phase 7，不把它写成已运行证据。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 创建 `plugins/agent-context-map` 正式插件壳、manifest、bundled stdio MCP 与 UI resource。
2. 复用 Phase 0B host identity contract，把 project binding 完全建立在 host-owned evidence 上，拒绝 tool arguments 覆盖。
3. 实现 session/openAttempt、safe path、read-only tools 与写操作 confirmation/token/revision Gate。
4. 运行 plugin manifest、MCP lifecycle/security、构建、Tauri regression、harness 和 diff Gate。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
