# HANDOFF

更新日期：2026-07-14

当前焦点：Phase 7 已由第七轮五 job 全绿和本机下载 artifact 独立复核完成；Phase 8 等待真实 canary、marketplace、tag/Release/stable 独立授权。

## Resume Point

- 权威仓库：`D:\Code\agent-context-map`，项目内普通 `.git/`，分支 `codex/acm-pluginization-plan`，origin `https://github.com/TUSKIJAY/agent-context-map.git`；upstream `origin/codex/acm-pluginization-plan`。
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
- upstream：`origin/codex/acm-pluginization-plan`
- HEAD：`28425f8`；Phase 7 closeout 文档与最终证据在当前工作区，接手时以 `git log -1 --oneline` 与 `git status --short --branch` 实测
- push：用户已在本任务明确授权 `codex/acm-pluginization-plan`
- 当前计划状态：Phase 7 Completed；Phase 8 Pending / explicit user approval gate

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

结果：Windows 与 Ubuntu WSL 均以固定 Node 24.12.0/npm 11.6.2 完成全仓 38 files / 105 tests，各按平台跳过 1 项异平台测试；Windows junction/locked file 和 Linux symlink/permission 原生 Gate 通过。两侧 clean-room 均从隔离副本完成 `npm ci`、同一全测、Vite 317 modules、固定包和两次可复现打包。首次 Linux replay 暴露的 `python3` 命令选择与 production JSX 绝对源码路径泄漏已修复。Release tree SHA-256 两侧一致为 `accbb6f7f89c687bd4d052025f7697284c0823e942893df62d7adfbd1bc1b775`，checksum set digest `c970cac77e0946d1f1d6693c891076451c2a78bb46225e161c85d1bb3c640135`。

首轮 GitHub Actions run `29324137580` 中 Ubuntu platform 与 Ubuntu clean-room 通过；Windows/macOS 缺少 PyYAML，Windows 另在 Vitest 直接导入 executable release script 时失败。当前修复固定 Python 3.13.5/PyYAML 6.0.3，并让 distribution fixture 通过真实 CLI 子进程生成候选包；本地再次通过 38 files / 105 tests、`test:release-candidate`、`test:clean-room`、Vite、harness 与 `git diff --check`。

第二轮 run `29324813249` 中 macOS、Ubuntu 与 clean-room 全绿；Windows 已越过上述问题并通过 junction/locked destination、release CLI 与 104 项测试，唯一失败是 20 路真实文件锁竞争在 Windows Server 2025 runner 用时 5.26 秒，超过 Vitest 默认 5 秒。断言和产品锁语义没有失败；当前只把两个磁盘并发测试预算提高到 20 秒，`DocumentLockManager` 的 2 秒产品 timeout 保持不变。

第三轮 run `29325189353` 中 macOS、Ubuntu 与 clean-room 再次全绿；Windows 的并发用例已通过，但 SQLite rollback fixture 随机用时 5.039 秒，仍只超默认 5 秒。连续两轮落在不同真实磁盘用例，说明应统一配置 hosted Windows CI 预算；当前撤销单用例 20 秒覆盖，改为 `process.platform === "win32" && CI` 时 Vitest `testTimeout=30000`，本地默认 5 秒和所有产品 timeout 不变。

第四轮 run `29325559181` 的 Windows、macOS、Ubuntu、clean-room 全绿；但真实下载 artifact 后只剩 11 个非隐藏文件，`.codex-plugin/plugin.json` 与 `.mcp.json` 被 upload action 的默认 hidden-file 规则排除，`SHA256SUMS` 无法闭合。当前 workflow 显式 `include-hidden-files: true`，并新增依赖 platform matrix 的 `Downloaded release artifact integrity` job：下载 immutable artifact 后独立校验必需文件、全量 SHA256SUMS、release manifest、版本和 tree hash。

第五轮 run `29326418297` 的 Windows、macOS、Ubuntu、clean-room 与 downloaded artifact integrity 五 job 全绿；下载资产 13 files / 12 checksum targets 完整，artifact id `8308154998`、archive digest `sha256:b6a055b181f2a2d1896ab4d54a77d0eb10c38f4b0e18d38025bd4421606569dc`，有效期至 2026-07-28。

下载后补充与本机 Windows build 逐文件比较，只发现 4 个复制的 skill 文本存在 CRLF/LF 差异，连带 `dist/manifest.json` 与 `SHA256SUMS` 改变。当前 `copySkill` 对 `.json/.md/.py/.txt/.yaml/.yml` 规范化为 LF；本地现复现 Ubuntu canonical：tree SHA-256 `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e`，checksum set digest `144a68a5b97b87c12177e32859f0715976b0d4bfcfea1853579d3f22089c7b13`，`SHA256SUMS` SHA-256 `5d8f0efd0d64f23182b018b37690786f0aeea9a1b2dc55d05219e24d1885b501`。workflow 每个平台和下载 audit 都强制该 tree hash。

第六轮 run `29327155930` 中 macOS、Ubuntu 与 clean-room 通过；Windows 的 38 files / 105 tests、Vite build 和候选构建均通过，但 fresh checkout 直接复制的 `.mcp.json`、README、CHANGELOG 仍为 CRLF，实际 tree `5fa654a5f9e13ee527f09c257aa1872e22059fd17adc1d14fbaffb826451e181`，因此下载审计按依赖关系跳过。当前 `copyPluginMetadata` 同样规范化 CRLF/CR 为 LF，并以 distribution test 覆盖全部直接复制文本；本地 `test:release-candidate` 再次命中 canonical tree。

第七轮 run `29327685652` 的 Windows、macOS、Ubuntu、clean-room、downloaded artifact integrity 五 job 全绿。artifact id `8308656602`、size `749113`、archive digest `sha256:2cc0e1889f8883ac168407b38541ddf8b875d09197aa295dfbb7fcd99f04a53c`、有效期至 2026-07-28；本机下载后 standalone verifier 再次确认 13 files / 12 checksum entries、tree `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e`、checksum set `144a68a5b97b87c12177e32859f0715976b0d4bfcfea1853579d3f22089c7b13` 与 `SHA256SUMS` hash `5d8f0efd0d64f23182b018b37690786f0aeea9a1b2dc55d05219e24d1885b501` 全部闭合。Phase 7 Completed。

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

- Phase 7 已完成；closeout 文档与最终证据尚待 scoped commit/push。
- push 已获当前任务明确授权，可用于本 branch 的 Phase 7 closeout。
- Phase 8 的真实 Codex 安装、private/repo-local marketplace、tag、GitHub Release 和 stable 发布都没有被 Phase 7 本地 fixture 授权或执行。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 形成并推送 Phase 7 closeout 的 scoped local commit。
2. 等待用户独立批准 Phase 8 真实 Codex Desktop canary 与 repo-local/private marketplace 范围。
3. 等待用户独立批准固定 tag/GitHub Release、canary 与 stable 发布动作。
4. 获批后完成真实多 task/多项目/冲突/升级回滚/卸载恢复验收、runbook 和 plan 生命周期收尾。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
