# HANDOFF

更新日期：2026-07-14

当前焦点：Phase 7 本地 Release Candidate 已就绪；在获得明确 push 授权后运行远端 Windows/macOS/Linux matrix，全部绿色前 Phase 7 不完成。

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
- Phase 7 本地候选：
  - 插件版本固定为 `0.3.0-rc.1`；`.nvmrc` 和 CI 固定 Node 24.12.0/npm 11.6.2，`package-lock.json` 是唯一安装输入；
  - release 包含 `SHA256SUMS`、deterministic manifest、依赖清单、CycloneDX SBOM 和 CHANGELOG，13 个文件可脱离源码树启动；
  - `check-clean-room.mjs` 从不含 `.git`、`node_modules`、dist 与源码生成物的隔离副本执行 `npm ci`、全测、Vite build、固定包和两次可复现构建；
  - Windows 原生 Gate 覆盖 junction escape、独占 locked destination 和解锁后 replace；POSIX runner 覆盖 symlink 与 permission-denied；
  - 安装 fixture 只使用临时 `CODEX_HOME`/`HOME`/`USERPROFILE`，fresh/update/downgrade/uninstall/reinstall 均复核 release checksums、独立 MCP 启动、用户状态和项目 `.acm` hash。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 6 已提交 `ae1050d`；Phase 7 local RC scoped commit 待本次 Gate 收尾创建，接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 7 in progress；local RC ready，remote matrix pending push authorization

## Phase 7 Local Candidate Verification

已运行并通过：

```powershell
npm ci --no-audit --no-fund
npm run test:all
npm run build
npm run build:plugin
npm run test:platform-filesystem
npm run test:distribution
npm run test:mcp-bundle-repro
npm run test:install-upgrade-rollback
npm run test:uninstall-reinstall
npm run test:clean-room
python C:\Users\LENOVO\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py plugins/agent-context-map
npm run harness:check
npm run harness:budget
git diff --check
```

结果：本机 Windows 全仓 38 files / 105 tests，1 项 POSIX-only permission test 按平台跳过；distribution 6、Windows native filesystem 1、安装生命周期 2 全通过。clean-room 从隔离副本完成 `npm ci`、同一全测、Vite 317 modules、固定包和两次可复现打包。Release tree SHA-256 `accbb6f7f89c687bd4d052025f7697284c0823e942893df62d7adfbd1bc1b775`，checksum set digest `c970cac77e0946d1f1d6693c891076451c2a78bb46225e161c85d1bb3c640135`，`SHA256SUMS` 文件 SHA-256 `108d25d65ce217f32c5a16068fe86d1239d699491819d4fc145acd2b4fb8c1f1`。plugin validator 通过。

生命周期证据：临时安装旧 `0.2.0` fixture、升级到 `0.3.0-rc.1`、降级回滚、卸载并重装；每一步从安装目录启动 bundled MCP、验证 checksums，真实用户全局目录未触及，测试项目 `.acm` hash 和隔离用户状态保持不变。脱敏证据在 `plugins/agent-context-map/tests/evidence/phase7-release-candidate.json`。

关键实现：

- `.github/workflows/plugin-release-candidate.yml`：Windows/macOS/Linux 固定 toolchain matrix 与 Ubuntu clean-room。
- `plugins/agent-context-map/scripts/build-mcp.mjs`：固定版本 release、checksums、manifest、依赖清单与 SBOM。
- `plugins/agent-context-map/scripts/check-clean-room.mjs`：无现成依赖/生成物的隔离安装与两次构建。
- `tests/distribution/install-lifecycle.test.js`：隔离 HOME 的安装、升级、回滚、卸载、重装与 `.acm` hash guard。
- `tests/project-store/platform-filesystem.test.js`：Windows 与 POSIX 原生文件系统差异 Gate。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- 本地 Windows/clean-room Gate 不替代 GitHub macOS/Linux 原生 runner；远端 matrix 未运行，Phase 7 仍为 in progress。
- workflow 只有在分支推送后才能产生三平台证据；push 仍必须取得当前任务明确授权。
- Phase 8 的真实 Codex 安装、private/repo-local marketplace、tag、GitHub Release 和 stable 发布都没有被 Phase 7 本地 fixture 授权或执行。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 形成 Phase 7 local RC scoped local commit，不 push。
2. 获得明确 push 授权后推送 `codex/acm-pluginization-plan`，观察 `Plugin Release Candidate` workflow。
3. Windows/macOS/Linux 与 clean-room jobs 全绿后记录 run URL、产物 checksum，并标记 Phase 7 complete；任一差异按停止条件修复重跑。
4. Phase 7 complete 后再进入 Phase 8；真实 canary、marketplace、tag/Release/stable 仍分别受计划 Gate 和用户授权约束。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
