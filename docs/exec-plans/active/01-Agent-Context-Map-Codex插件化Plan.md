# Agent Context Map Codex 插件化改造 Plan

> 状态：Active / Phase 8 Stopped / rc.4 live host resource discovery failed / OpenAI host feedback pending
> 版本：v2（已按 review-001 修订，并同步 review-002 的非语义澄清）
> Review 状态：review-001 = revise；review-002 = approve；已 activation
> Activation 边界：本次只完成生命周期迁移和决策落位，不启动 Phase 0A/0B，不实施源码
> 调查日期：2026-07-14
> 适用仓库：Agent Context Map
> 协议基线：ACM-MD v0.1，不在本计划中变更
> 推荐路线：C 的本地优先变体——保留 Tauri，抽出共享核心，新增 Skill + 本地 MCP server + 原生 Widget 插件壳
> 计划 Phase 数：9（Phase 0 至 Phase 8）

## 0. 执行边界与结论摘要

### 0.1 本计划本身的权限

本文件已经通过独立 review-002，并由用户于 2026-07-14 明确批准进入 active 生命周期。它只授权后续 session 严格按本文 Phase、Gate、修改范围和停止条件实施；activation 本身不代表 Phase 0 已开始，也不授权跳过 Phase 0A/0B、扩大范围或直接进入产品实现。

本计划的调查、v2 修订与 activation 维护严格限于：

- 阅读项目文档、源码、当前 Git 状态和外部公开技术资料；
- 判断技术路线；
- 新增/修订本计划及对应的 proposed/review 状态索引；
- 运行现有只读检查或现有构建命令验证基线。

本计划的 docs-only 起草、评审与状态维护不实施源码，不安装依赖或插件，不修改 Codex 配置，不创建 marketplace，也不实际修改本计划拟议中的 AGENTS.md、INSTRUCTIONS.md、package.json 或任何源码。仓库修改按当前 AGENTS.md 在验证后形成 scoped local commit；如规则生效前的遗留改动导致无法安全隔离，则必须记录提交阻塞。`git push` 始终需要用户在当前任务明确确认。本轮生命周期迁移已经构成 plan activation，但不构成任何 Phase 的 start 或 complete，也不构成产品功能实施。

### 0.2 最终推荐

选择路线 C，但不是把当前 Tauri 页面直接塞入 iframe，也不是复制一套编辑器。推荐的目标是：

1. 把 ACM-MD v0.1 的解析、规范化生成、严格校验、Diff、增量图操作、上下文选择和 revision 计算抽为无平台依赖的共享 core。
2. 把 React Flow 画布、Inspector、Pending Proposal 预览和编辑状态抽为可复用 editor。
3. 通过 platform adapters 分别接入：
   - Tauri 桌面端：项目文件存储 + 现有 SQLite 迁移兼容 + 原生文件对话框；
   - Browser：localStorage 仅保留为开发/演示 fallback，不是插件业务真源；
   - Codex Widget：通过 MCP Apps host bridge 调用插件本地 MCP，不直接访问 SQLite、Tauri 或任意本地路径。
4. 插件由 repo-local Skill、bundled stdio MCP server、MCP UI resource/Widget、构建资产组成。MCP server 管理项目绑定、revision、锁和原子写；如引入 loopback daemon，它只监听 127.0.0.1 的随机端口，并使用随机 token。Widget 不直接 fetch localhost，而通过 app-only MCP tool proxy 访问本地会话服务。
5. 保留 Tauri 产品面；插件版和 Tauri 版最终读取同一项目内 ACM-MD 文件。现有 SQLite 只作为迁移来源和有限期兼容备份，不能长期双写。

这条路线满足“原生 Codex Widget + local-first + 复用现有编辑器 + 保留 Tauri”的组合约束；代价是必须先完成 core/editor/platform 解耦和数据真源迁移，不能用一个打包动作替代架构改造。

### 0.3 最高风险

最高风险不是 React 复用，而是“Codex Desktop 当前任务、workspace root、MCP server 和实际挂载 Widget instance 的可信绑定”。公开 MCP Apps 标准定义了 Widget host bridge，但 Codex Desktop 是否稳定提供足够的 task/thread/workspace 身份证据，必须在真实宿主中验证。若无法取得不可由模型伪造的当前任务和项目根证据，写工具必须 fail closed，不能退化为让模型传入任意 projectPath。

第二级风险是 SQLite 到项目 ACM-MD 的一次性迁移与跨平台原子替换。任何迁移或写入在严格校验、round-trip、revision 冲突与崩溃恢复未通过前，不得切换业务真源。

### 0.4 review-001 处理记录

本节是 v2 对 review-001 的逐项 disposition；“修订引入”表示已进入本计划文本，不表示实现、批准或 activation。

| ID | Review 问题 | 处理 | v2 落点 |
| --- | --- | --- | --- |
| S1 | INSTRUCTIONS.md 与目标数据真源冲突且无修订授权 | 修订引入 | §10.6、Phase 2、§14.2：激活时记录 Accepted 数据真源决策；Phase 2 真源切换 Gate 成功时同步修订章程 |
| M1 | Phase 0 测试命令与新增依赖规则矛盾 | 修订引入 | Phase 0、§14.2：显式审批 Vitest、审核 lockfile、运行真实 baseline suites，禁止 no-op 脚本 |
| M2 | 可信 task/workspace 证据到 Phase 4 才获取 | 修订引入 | Phase 0B：前置最小只读 stdio MCP 真实宿主 spike，Gate 未过不得进入 Phase 1 |
| M3 | pending proposal 本机落盘与 pending view state 边界不清 | 修订引入 | §4.3、§10.6、§14.2：定义为 pending view state 的本机持久化延伸，并要求 AGENTS.md 精确化获批 |
| M4 | 三套 operation 词表缺少规范映射 | 修订引入 | §5.1、§7.2、Phase 1/6：operations.js 为唯一规范模型，legacy adapter 限期退役，changes 仅作导出投影 |
| L1 | base_snapshot 被误写为 SQLite 独立表 | 修订引入 | §1.4 改为 documents（含 base_snapshot 列）、snapshots、app_state |
| L2 | Git/状态对账观察已过时 | 修订引入 | §1.1 刷新为 D 盘权威仓库、项目内 .git、HEAD 6152a27 与当前脏工作区事实 |
| L3 | layout-only revision 冲突体验未声明 | 修订引入 | §4.4、Phase 8、§12：保留全文 revision，增加冲突分类和用户复核后重放 |
| L4 | 单文件计划体量过大 | 遗留未修（可选） | v2 为保持 review traceability 暂不拆分；若 review-002 通过，activation 时可把 §7/§8 原文迁为附属 spec 并保留单一引用，不改变语义 |

### 0.5 review-002 结论与后续澄清

review-002 对 v2 的裁决为 `approve`（置信度 medium），确认 review-001 的 9 项 disposition 均已正确处理；approve 只表示计划通过独立评审，不构成用户批准或 activation。review-002 另列 2 个不阻塞裁决的轻微项，本次按原评审建议作非语义澄清：

| ID | review-002 轻微项 | 处理 | 落点 |
| --- | --- | --- | --- |
| R2-L1 | §1.1 快照会随新提交腐化，且含跨文档一致性断言 | 修订引入 | §1.1 明确为历史采集快照，删除“与真实 HEAD 一致”断言，当前状态一律以 Git 实测与状态文档为准 |
| R2-L2 | 后续 Phase 新增 npm scripts 时 package.json 未普遍进入修改范围 | 修订引入 | §11 总则授权各 Phase 仅为其验收命令修改 package.json scripts；依赖和 lockfile 仍受单独审批 |

### 0.6 Activation 记录

- 用户批准：2026-07-14，明确指令“将 plan 迁移到 active”。
- 独立评审：review-002 = approve；无严重或中等问题。
- 生命周期：由 `docs/exec-plans/proposed/` 迁入 `docs/exec-plans/active/`。
- activation 当时的 Phase：Phase 0 未开始；该次 lifecycle move 未创建 spike、安装 Vitest、修改 AGENTS.md/INSTRUCTIONS.md 或执行数据迁移。后续执行状态见 §0.7。
- 决策口径：采用 §14.2 的推荐值；条件项 9 保持 fail closed，只有 Phase 0B 产生真实宿主证据后才能重新提交用户决定。
- 数据真源决策：Accepted `DEC-004`；Phase 2 Gate 已通过并实施，项目 ACM-MD 现为业务内容单真源，SQLite 只保留显式只读迁移入口。
- 用户范围澄清：“解耦”只指 `acm-core`、`acm-editor` 与 platform adapters 的模块边界；不是拆远程后端、微服务化或推倒重写。必须保持 local-first、保留 Tauri、不引入远程后端或云数据库，并在每个 Phase 以现有 Tauri 构建和核心功能不回退为 Gate。

### 0.7 执行记录

- 2026-07-14，Phase 0A 完成：AGENTS.md 两条已批准精确化已原文落位；DEC-004 至 DEC-007 覆盖数据真源、可信 host identity、single stdio MCP 默认值和 SQLite 只读迁移；固定 `vitest@3.2.7`，建立 ACM-MD 合法/非法、round-trip、confirmed inference、SQLite v1 和 distribution baseline。
- Phase 0A 验证通过：baseline 4 files / 8 tests，distribution 1 test，Python strict valid fixture，harness、budget、Vite build 和 `git diff --check`；Vitest 3.2.4 因 critical advisory 被拒绝，固定到同系列已修复的 3.2.7。
- 2026-07-14，Phase 0B 完成：隔离的 repo-local plugin + read-only stdio MCP 在真实 Codex Desktop 验证 new task、same-task follow-up、second task、cachebuster reload 与伪造 identity arguments；Gate = `trusted_host_identity`。单一 host-owned workspace 可绑定，多候选只返回 `trusted_native_picker_required`，附加可写目录不进入授权 workspace。
- Phase 0B 脱敏证据与复现边界见 `spikes/codex-host-binding/evidence/gate-report.json`；该 Gate 已满足并由后续 Phase 继续复用。
- 2026-07-14，Phase 1 完成：`packages/acm-core` 抽取 schema/model/strict parse/deterministic serialize/validator/diff/canonical operations/revision/context/pending；`src/acm/data.js` 成为 UI/布局兼容入口。legacy snake_case 只在显式 adapter 接受并诊断，core 与新调用方只产出 camelCase `op`。
- Phase 1 验证通过：core 16 tests、全仓 31 tests、JS/Python strict parity 8 fixtures、generated round-trip Python strict、Vite build、Tauri release `--no-bundle`、platform import static Gate 和 `git diff --check`。
- 2026-07-14，Phase 2 完成：新增 `packages/project-store`；Tauri 正式 store 切到用户选择项目的 `.acm/documents/*.acm.md`，移除 SQLite write backend / plugin / capabilities；legacy SQLite 只读 preview、backup、逐文档确认与 rollback 落位；DEC-004、DEC-007 和 `INSTRUCTIONS.md` 同步为当前事实。
- Phase 2 验证通过：专项 23 tests、Rust 3 tests、20 路 stale revision 竞争、crash-point/recovery/index rebuild、SQLite 原库 hash/Python strict/rollback、Vite 308 modules、Tauri release `--no-bundle` 和 `git diff --check`；当前 Gate：进入 Phase 3。
- 2026-07-14，Phase 3 完成：抽出 platform-free `packages/acm-editor`、document controller 与能力 contracts；Desktop composition root 注入 Tauri/Browser adapters；FlowCanvas export capability、pending proposal/正式 Diff 分离和 canonical camelCase 产品调用方落位。
- Phase 3 验证通过：editor 4 files / 7 tests、import-boundaries 4 tests、全仓 19 files / 60 tests、Vite 317 modules、Tauri release executable/MSI/NSIS、harness 和 `git diff --check`；桌面 smoke 覆盖项目绑定、新建/打开/编辑/撤销/重做/校验/Diff/保存/重开。当前 Gate：进入 Phase 4。
- 2026-07-14，Phase 4 完成：正式 local-only Codex plugin、bundled stdio MCP、UI resource 占位、host-owned project binding、canonical path containment、single-process session service 与 clean reproducible distribution 落位；未创建 public marketplace 或 daemon。
- Phase 4 验证通过：schema 3、runtime 2、binding 4、path security 10、distribution 3、全仓 24 files / 81 tests；clean Release 8 files 可独立启动且两次构建 SHA-256 一致；Vite 317 modules、plugin validator、harness、budget 和 diff check 通过。正式插件经临时 local marketplace 在 3 个独立 Codex task、remove/reinstall reload 和额外 writable dir 场景复验，`.acm` 未修改。DEC-005/006 已确认；当前 Gate：进入 Phase 5。
- 2026-07-14，Phase 5 完成：构建 self-contained MCP Apps Widget，复用 `acm-editor`，以标准 `ui/*` bridge 为主、`window.openai` 为兼容 fallback；Widget 使用 ephemeral working copy，不建立 localStorage 或项目文件真源；openAttempt/widgetInstance/rebind/supersede 单调生命周期与 React/项目/画布首帧 ready proof 已落位。
- Phase 5 验证通过：Widget 3、lifecycle 1、rebind 2、bundle policy 1、distribution 3、全仓 29 files / 88 tests；Widget HTML 2,087,825 bytes，SHA-256 `ef20b5144c7edab1045d581403d70a9cb4ccc37a3a54fc37f3aa86929e55a527`，MCP Release 两次构建 SHA-256 `a0e0776bd80f19542f6b4dbeb4bd8b2b8f5d87a6fdf9dc6a8a19538f0e1fbbe4`。Playwright 标准宿主真实渲染 2 nodes/1 edge 并完成编辑；产品 Codex 临时 canary 证明 open tool success 不等于 ready；Vite、Tauri executable/MSI/NSIS、plugin validator、harness、budget 和 diff check 通过。当前 Gate：进入 Phase 6。
- 2026-07-14，Phase 6 完成：模型可见 get/validate/write/import/export、内存 pending proposal、app-only proposal/manual commit、selected/related/execution context、server-side payload digest 与 `ui/message` click gate 落位；bootstrap/app session proof 只经 Widget `_meta` 传递，不进入模型 content/structuredContent。
- Phase 6 验证通过：专项 16 tests、全仓 36 files / 101 tests；proposal 前和无 gesture 时项目 hash 不变，锁内 stale revision 保留较新文件，并发同 revision 仅 1 次 commit；legacy snake_case、`patchMeta`、confirmed escalation、oversize 和 prompt injection 全部拒绝。标准 MCP Apps 浏览器宿主证明 preview 阶段 message/send 均为 0、最终二次确认后均为 1，proposal commit 经过确认对话框；Widget SHA-256 `abc2e2e4b55e19961748877e6e1ee9eb559e3da01636f0c3c9c044be8ab6f4e0`，MCP Release 可复现 SHA-256 `4ddc0e0c6cb576d254bc1763c0c64b7432bf50e3f3963a38316cb3e3604e1f52`；Vite、Tauri executable/MSI/NSIS、distribution、harness 和 diff check 通过。当前 Gate：进入 Phase 7。
- 2026-07-14，Phase 7 本地 Release Candidate 就绪：插件版本固定为 `0.3.0-rc.1`，新增 Node 24.12.0/npm 11.6.2 三平台 workflow、clean-room `npm ci` replay、Windows junction/locked-file 与 POSIX symlink/permission 测试、隔离 HOME 安装生命周期、SHA-256 checksums、依赖清单和 CycloneDX SBOM。
- Phase 7 本地 Gate 通过：Windows 与 Ubuntu WSL 均以 Node 24.12.0/npm 11.6.2 在各自原生文件系统完成 38 files / 105 tests（各有 1 项异平台测试按条件跳过），Windows 覆盖 junction/locked file，Linux 覆盖 symlink/permission；两侧 clean-room 均从无 `node_modules`/生成物副本完成 `npm ci`、全测、Vite build、固定包和两次可复现构建。首次 Linux replay 暴露并已修复 `python3` 命令兼容与 production JSX 绝对源码路径泄漏。
- Phase 7 远端执行：run `29325559181` 的 Windows、macOS、Ubuntu 与 clean-room 全绿；真实下载上传资产时发现默认排除 `.codex-plugin/` 与 `.mcp.json`，因此平台 matrix green 尚不能构成可安装 Release Gate。当前新增 hidden-file 显式上传、standalone release verifier 和下载后独立 audit job；第五轮 audit 全绿前 Phase 7 保持 in progress，证据见 `plugins/agent-context-map/tests/evidence/phase7-release-candidate.json`。
- Phase 7 第五轮：run `29326418297` 的三平台、clean-room 与 downloaded artifact audit 全绿，下载资产完整可校验；补充逐文件比较发现 Windows checkout 的 4 个 skill 文本因 CRLF/LF 与 Ubuntu canonical tree hash 不同。当前发布 copy 规范化文本为 LF，并要求三平台和下载资产都命中固定 tree `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e`；第六轮通过前仍不标记 Phase 7 Completed。
- Phase 7 第六轮：run `29327155930` 的 macOS、Ubuntu、clean-room 通过；Windows 全测、Vite 和候选构建通过，但 fresh checkout 的 `.mcp.json`、README、CHANGELOG 仍以 CRLF 原样复制，tree `5fa654a5f9e13ee527f09c257aa1872e22059fd17adc1d14fbaffb826451e181` 被固定 hash Gate 拒绝，download audit 按依赖跳过。当前全部直接复制发布文本统一 LF，并新增分发断言；第七轮完整通过前仍不标记 Phase 7 Completed。
- Phase 7 第七轮 Completed：run `29327685652` 的 Windows、macOS、Ubuntu、clean-room 与 downloaded artifact integrity 五 job 全绿；artifact `8308656602` 由本机再次下载并独立验证 13 files / 12 checksum entries、版本与固定 tree `2664e1b6e03b80e25ca4f485106ff46ee6b880e94b43bf51677373c3887c8e9e` 全部闭合。Phase 8 的真实 canary、marketplace、tag/Release/stable 尚未获独立授权。
- 2026-07-15 Phase 8 重启后验证发现 `0.3.0-rc.1` manifest 对应的 MCP health 仍上报 `0.2.0`。`rc.1` 的 Phase 7 历史证据保留但不再作为可发布候选；版本真相修复进入不可变新候选 `0.3.0-rc.2`，本地 105 tests、Vite、release candidate、安装生命周期、复现与 clean-room 通过，tree `828de7e21b11786263de9bda30b4b6d21236f5a09c541b3dd8312d5805912441`。rc.2 必须重新完成 Phase 7 跨平台/下载资产 Gate 后，且用户重新授权真实宿主 retry，才可回到 Phase 8。
- 2026-07-15 rc.3 新 task A1：完全重启后的 runtime health 精确为 `0.3.0-rc.3`；open/get/validate 绑定同一 project/session/revision，读取 2 nodes / 1 edge且 strict valid、无 diagnostics。唯一新 openAttempt 的 await-ready 仍返回 `ready=false`，无 widget instance/state/transitions，故 React mounted、project hydrated、canvas first frame 均未获证。只调用五个只读工具，fixture hash 前后一致并已删除；按本次授权停止，不重试、不推进写工具或发布。
- 2026-07-15 rc.3 host lifecycle 调查：原始 rollout 的 open tool event 已识别 `ui://agent-context-map/widget.html`，但 Desktop 日志没有 `resources/list`、`resources/read`、resource rejection、iframe、CSP、bootstrap 或 ready 证据；installed rc.3 的 descriptor/list/read 经独立 stdio probe 符合 envelope 与精确 MIME。官方当前契约把 resource URI 作为缓存键，并要求 Widget HTML/JS/CSS 的破坏性变更使用新 URI；rc.2→rc.3 修改 bridge 却复用同一 URI，因此确认仓库存在 cache-key invalidation 缺陷，但旧日志无法证明 Desktop 当时是否实际复用了 rc.2 bundle。
- 2026-07-15 immutable rc.4：UI resource 改为 `ui://agent-context-map/widget-0.3.0-rc.4.html`，self-contained CSP 的外部 resource allowlist 归零；MCP 仅在进程内保留最多 64 条无项目路径/正文的 descriptor/resource/open/bootstrap/ready 事件，并由 read-only health 返回。版本化 URI 回归测试在修复前 2 fail / 3 pass，修复后专项 4 files / 10 tests 通过；完整本地 Phase 7 Gate 为 39 files / 113 pass / 1 platform skip、Vite、fixed release、distribution、reproducibility、隔离安装生命周期与 clean-room 全绿，tree `93ae0d2e7f789e908fa99d9822eac5cfc3bb24ebab2fe1b7f49731ece762038e`。随后已安装、完全重启并执行一次 fresh A1。
- 2026-07-15 rc.4 live host Gate：Desktop `26.707.9981.0` 在全新 task 中枚举 descriptor 并成功完成 open/get/validate，但同一 server lifecycle 的 `ui_resources_list` 与 `ui_resource_read` 从初始至最终均为 0，bootstrap/ready 也为 0。版本化 URI 对应 packaged resource 的 list/read/MIME/HTML/CSP control 已通过，故 Phase 8 在 Codex Desktop resource discovery/read 层停止并形成 host limitation/bug candidate；fixture hash 不变且已删除。

## 1. 调查基线与当前架构事实

### 1.1 当前 Git 与仓库事实

以下仅是 v2 修订时（2026-07-14、review-002 之前）的历史采集快照，不是当前仓库状态声明：

| 检查 | 结果 |
| --- | --- |
| git rev-parse --show-toplevel | D:/Code/agent-context-map |
| git rev-parse --git-dir | .git |
| git status --short --branch | codex/agy_agent...origin/codex/agy_agent，ahead 2；存在尚未提交的治理、迁移、plan/review 工作区改动 |
| git log -1 --oneline | 6152a27 chore(harness): 建立 governed 项目工作流 |
| git remote get-url origin | https://github.com/TUSKIJAY/agent-context-map.git |

采集时权威目录已按 Accepted `DEC-003` 迁至 `D:\Code\agent-context-map` 并使用项目内 `.git/`；当时 HEAD 为 `6152a27`、ahead 2。此后任何 HEAD、ahead、工作区或跨文档一致性判断都必须重新运行 Git 命令并读取当前 PROGRESS.md/HANDOFF.md，不得从本表推断。本计划仍为 Proposed / review-only，不因路径迁移、文本修订、commit 或 review 通过而获得实施权限。

### 1.2 技术栈和运行面

当前应用是 React 18 + Vite 5 + React Flow 12 + Tauri 2 的 local-first 桌面应用：

- src/main.jsx 启动单一 React 应用；
- src/App.jsx 负责文档、baseline/diff、undo/redo、选中项、pending Agent 建议、布局、文件与导出以及主要 UI 编排；
- src/acm/FlowCanvas.jsx 使用 React Flow、DOM、window、document 和 html-to-image；
- src/acm/Panels.jsx 承载 Inspector、Agent、建议变更与校验面板；
- src/storage/store.js 在 Tauri SQLite 与浏览器 localStorage 间选择；
- src/storage/files.js 在 Tauri 文件对话框/文件系统与浏览器文件输入之间选择；
- src-tauri/src/lib.rs 注册 SQLite migration、文件/对话框插件和 agy CLI 桥接；
- vite.config.js 只配置当前单入口应用，没有独立 Widget 构建、相对静态资源策略或插件发布构建；
- package.json 当前没有测试框架或插件/MCP 构建脚本，现有核心回归门主要是 harness 和 build。

### 1.3 当前数据与协议实现

src/acm/data.js 同时包含多类职责：

- ACM 节点/边受控词表与示例；
- ID 生成；
- Agent pending patch 纯函数；
- graph validation；
- Diff；
- ACM-MD、YAML、Mermaid 导出；
- ACM-MD 解析；
- dagre/ELK 布局；
- 分组、折叠和显示标签。

这说明它不是可直接发布的“纯 core”：它同时依赖 yaml、dagre，并混入布局和展示语义。拆分时必须把协议/图操作与 editor/layout 分开。

项目正式协议唯一由 skills/acm-md/references/acm-md-v0.1.md 约束；`doc/` 中历史镜像已冻结，不再同步或承担规范作用。v0.1 的关键硬边界保持不变：

- 正式文档只有一个 acm fenced block；
- ID 稳定且唯一；
- 节点、边和状态只能使用受控词表；
- Agent 推断默认 suggested，需要人工判断时 needs_validation，不能直接 confirmed；
- Agent 建议在人工采纳前只能存在于 pending view state，不能进入正式 doc、保存、导出或 Agent Diff。

现有 JavaScript 解析器对原始 YAML/多个 fence 有一定容错，严格度不应被误认为与 Python 严格校验器完全等价。共享 core 必须建立 JS 与 skills/acm-md/scripts/validate_acm_md.py 的 golden parity，不能只把现有函数移动目录。

### 1.4 当前持久化模型

Tauri 侧 SQLite 当前持有 documents（含 base_snapshot 列）、snapshots 和 app_state 三张表；图数据主要以 JSON blob 存储。浏览器 fallback 使用 localStorage。二者使“应用数据库”成为当前桌面版事实上的业务真源，项目目录没有规范的 .acm 文件布局。

插件化若继续让 SQLite、项目 ACM-MD 和 Widget session 各自可写，将形成三套冲突真源。因此目标架构必须先确立项目内 ACM-MD 为唯一业务内容真源，SQLite 退为迁移源，Widget/user state 只保存非业务运行状态。

### 1.5 当前 Agent/平台耦合

src/acm/agentClient.js 已经是有价值的适配缝：它按 window agy、Tauri invoke、全局 MCP 和 HTTP sidecar 尝试 fallback，并会把不可信 confirmed 推断降级。但它基于现有宿主假设，不等于 MCP Apps Widget host bridge。

src/storage/store.js 在模块加载时检查 window.__TAURI_INTERNALS__ 且静态引入 Tauri SQL；src/storage/files.js 和 FlowCanvas 直接使用 DOM/Tauri 能力。Widget 构建如果直接复用这些入口，会把不应出现的 Tauri/SQLite/本地文件访问打入 iframe bundle。

### 1.6 Canvasight 参考结论

只读调查基于 Canvasight main commit 469a5a777392ba54b826046332c1af654c4d0704。可借鉴：

- .codex-plugin/plugin.json + .mcp.json + bundled mcp/server.mjs 的 repo-local 插件结构；
- stdio MCP 管理本地项目会话，并将 Widget 作为 MCP UI resource 注册；
- project/session/openAttempt/widgetInstance/thread 的单调生命周期与防串线校验；
- revision、expectedRevision、写锁、临时文件和原子替换；
- 127.0.0.1 随机端口、随机 token、app-only Widget proxy；
- clean bundle、并发、Widget runtime、更新和分发测试；
- 固定 Release 与可回滚更新。

不能照搬：

- Canvasight 的“Run 节点及下游”产品语义；
- 接受模型输入任意 projectPath 的宽松路径模型；
- 面向提示词/画布产品的附件和执行流；
- 对当前内部 Codex app-server 行为的未经验证依赖。

ACM 是需求、约束、决策、证据、任务和关系上下文图。所有发送/执行语义必须受 ACM-MD 类型、状态、边白名单、人工预览和当前任务绑定共同约束。

## 2. 技术路线比较与最终选择

| 路线 | 能否原生 Widget | 复用现有 UI | 保留 Tauri | ACM 可读写 | 主要问题 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| A. 只打包 acm-md Skill | 否 | 否 | 是 | 只能通过文本/命令间接处理 | 没有交互画布、项目绑定、并发和写入服务 | 不满足目标，可作为插件的一部分 |
| B. 插件只启动 Tauri EXE | 否，最多外部窗口 | 是 | 是 | 可由桌面端处理 | Codex 无原生 Widget；跨平台安装、EXE 发现、任务回传和生命周期差 | 不推荐 |
| C. 共享 core + Skill + 本地 MCP + Widget，保留 Tauri | 是 | 是，需先解耦 | 是 | 可做强契约增量读写 | 前期重构和双宿主测试成本最高，但边界清晰 | 推荐 |
| D. 整体改成插件并放弃 Tauri | 是 | 表面可复用 | 否 | 可 | 违背明确目标；丢失独立桌面能力；宿主耦合加深 | 排除 |
| E1. WebView 嵌套现有 Tauri 页面 | 不是真正原生 MCP Widget | 部分 | 是 | 脆弱 | iframe/Tauri API 不可用、安全与打包不成立 | 排除 |
| E2. 只用单个 stdio MCP，不设 loopback daemon | 是 | 是 | 是 | 可 | 更简单；但需验证进程寿命、重载恢复和多 Widget 隔离是否足够 | 作为 Phase 4 ADR 比较项 |
| E3. 远程 MCP/云服务 | 是 | 是 | 是 | 可 | 违背 local-first、无远程业务服务和无遥测约束 | 排除 |

最终采用 C。具体实现应先用“单 bundled stdio MCP + 内部 session service”做最小原型，再由真实宿主 Gate 决定 session service 是否需要拆成独立 loopback daemon。若使用 daemon，Widget 仍只能通过 MCP Apps bridge/app-only proxy 访问，不能把 token 暴露给模型或 URL。

路线 C 的不可妥协边界：

- Tauri 不退役；
- core 不依赖平台；
- ACM-MD v0.1 不变；
- 项目文件是业务真源；
- Agent 写入先 pending、人工点击后才 commit；
- 没有可信 task/project binding 就禁止写；
- 不引入远程服务、云数据库或遥测。

## 3. 目标架构与依赖方向

### 3.1 逻辑架构图

    Codex Desktop current task
              |
              | stdio MCP: tools + ui:// resource
              v
    plugin MCP control plane --------------------+
      | task/project/session binding             |
      | schemas, auth, locks, revision            |
      | app-only widget proxy                     |
      v                                           |
    loopback session service (optional ADR)       |
      127.0.0.1:random + random token             |
              |                                   |
              v                                   |
    project store adapter                         |
      .acm/index.json                             |
      .acm/documents/<doc_id>.acm.md              |
                                                  |
    Native Widget iframe <--- MCP Apps ui/* ------+
      shared editor + WidgetHostAdapter
              |
              v
          shared acm-core

    Tauri Desktop
      shared editor + TauriHostAdapter
      project store adapter
      legacy SQLite migration reader
              |
              v
          shared acm-core

    Browser development/demo
      shared editor + BrowserHostAdapter
      localStorage demo store only
              |
              v
          shared acm-core

### 3.2 依赖规则

依赖只能自上而下：

- acm-core 不得导入 React、React Flow、dagre、elk、Tauri、SQLite、window、document、localStorage、Node fs/path/net 或 MCP SDK。
- acm-editor 可以依赖 acm-core、React、React Flow 和 layout 包，但不得直接依赖 Tauri、SQLite、Node fs、MCP SDK 或全局宿主对象。
- platform adapters 可以依赖 acm-core 定义的接口和各自平台 SDK；Widget adapter 只能通过 host bridge；Tauri adapter 才能调用 Tauri API。
- apps/desktop 和 plugin/widget 是 composition root，负责选择 adapter，不把平台判断藏进 core/editor。
- plugin/mcp 可以依赖 acm-core 的 Node 构建产物，但不得依赖 React editor。

防线：

1. package exports 只暴露明确入口；
2. ESLint no-restricted-imports 或等价 import boundary 测试；
3. acm-core 的 Node 和 browser 双环境 import smoke；
4. Widget bundle analyzer/字符串扫描，禁止出现 @tauri-apps/plugin-sql、__TAURI_INTERNALS__、sqlite、任意绝对项目路径；
5. core 单元测试在没有 window/document 的 Node 环境运行；
6. Widget 单测在没有 Tauri API 的环境运行。

## 4. 数据归属、revision 与状态模型

### 4.1 项目数据布局

推荐项目目录：

    .acm/
      index.json
      documents/
        <doc_id>.acm.md

.acm/documents/<doc_id>.acm.md 是唯一业务内容真源，内容必须是 ACM-MD v0.1。一个文档一个稳定 doc_id；文件名只允许经过规范化的安全 ID，不接受路径片段。

.acm/index.json 是可重建的项目清单和导航投影，不承载节点/边业务内容。建议字段：

    schemaVersion
    projectId
    defaultDocumentId
    documents[]:
      id
      relativePath
      titleCache
      contentRevisionCache
      updatedAtCache

title/revision/updatedAt 的 Cache 后缀表示它们可从文档扫描重建，不能在冲突时覆盖文档。projectId 是随机稳定标识，不包含机器路径。

### 4.2 Git 跟踪建议

推荐默认跟踪：

- .acm/index.json；
- .acm/documents/*.acm.md。

推荐不跟踪且不写入项目：

- daemon token、端口、PID；
- Widget instance/session/openAttempt/thread binding；
- 最近项目；
- pending Agent proposal；
- viewport、缩放、当前选中项、面板开关等临时 UI state；
- 生命周期日志、崩溃日志；
- SQLite 迁移备份。

ACM-MD 可能包含商业秘密、人员信息或安全约束。启用 Git 跟踪前必须向用户提示仓库可见性和历史不可逆性；敏感项目可以由用户选择本地忽略，但插件不得擅自修改 .gitignore 或自动 git add。

### 4.3 本机用户状态

使用平台用户状态目录，不使用项目目录：

- Windows：LOCALAPPDATA/AgentContextMap；
- macOS：Library/Application Support/AgentContextMap；
- Linux：XDG_STATE_HOME/agent-context-map，缺省回退到用户 state 目录。

按 canonical project root hash + projectId 分区保存：

- daemon.json：仅当前进程需要的端口、PID、启动时间；token 优先只保存在进程内存，若必须落盘则权限仅当前用户且短 TTL；
- bindings/<task-key>.json：可信宿主 task/thread、projectId、canonical root fingerprint、active doc、session/openAttempt/widgetInstance；
- pending/<session>.json：proposalId、baseRevision、operations、来源、过期时间；不得被常规 export 或 Agent Diff 读取；
- ui-state/<project>/<doc>.json：selection、viewport、collapse 等非业务状态；
- recent-projects.json；
- logs/lifecycle.ndjson：只记录 correlation ID、状态和错误码，默认不记录节点正文、prompt、token 或绝对敏感路径。

这里的 `pending/<session>.json` 是 pending view state 的本机持久化延伸，不是正式图谱、保存结果或 Agent Diff：它必须位于用户状态目录、带短 TTL、绑定 task/project/doc/baseRevision/instance，且只允许 Widget 在重新预览后恢复。任何常规保存、导出、Diff、项目扫描、Git 跟踪或模型读取路径都必须忽略它。该解释只有在 §14.2 对应 AGENTS.md 精确化获批后才能实施；未获批时 pending 只能留在进程内存，跨重启丢弃。

退出、超时、task 变更或 project fingerprint 变化时，绑定和 pending proposal 必须失效。

### 4.4 revision 模型

documentRevision 定义为对“经 core 规范化后的完整 ACM-MD UTF-8 bytes”计算的不可伪造内容 revision，例如 r-sha256-<hex>。它是 opaque string，不依赖 SQLite 自增值，也不以 index cache 为真源。

所有读取返回：

- documentId；
- documentRevision；
- protocolVersion；
- projectId；
- validatedAt；
- validationSummary。

所有写入/commit 必须提供 expectedRevision。服务在文档锁内重新读取并重新计算当前 revision：

- 相等：应用 operations、规范化、严格校验、写临时文件、flush/fsync、同卷原子替换，再返回新 revision；
- 不相等：不修改任何文件，返回 revision_conflict、expectedRevision、currentRevision、可选最小 diff 摘要；
- 文件非法或不可解析：返回 invalid_current_document，保留原文件，禁止生成空图覆盖；
- 文件不存在：只有显式 create operation 且 index 中无同 ID 时才能创建。

index.json 的 revisionCache 不参与并发判定。文档替换成功但 index 更新失败时，返回 document_committed_index_stale，后续只允许从文档重建 index；不得回滚成旧文档或覆盖新内容。

revision 覆盖规范化后的完整 ACM-MD bytes，包含协议顶层 `layout`；这是有意选择，因为 layout 是 ACM-MD v0.1 的正式字段。纯读取不得自动刷新 `meta.updated_at` 等字段，否则会制造无业务编辑的 revision。Tauri 与 Widget 并行编辑发生 `revision_conflict` 时，server 额外返回 `conflictClass=layout_only|content|mixed` 和受影响 ID：

- 只有对端 layout 变化且当前待提交 operations 不触及同一 layout entry 时，Widget 可以提供“基于 currentRevision 重新预览并重放”的人工操作；用户再次确认前不得写入；
- 同一节点 layout 冲突、任何内容/meta 变化或无法分类时，必须进入完整 conflict 流程；
- 不允许后台自动 rebase，也不允许仅因 layout 被定义为展示信息就跳过 expectedRevision。

### 4.5 锁、原子写和失败恢复

- 锁粒度：canonical projectId + documentId；
- 同进程使用公平 async mutex；若 daemon/MCP 可能多进程并存，增加 OS lock file，内含 PID、启动 nonce 和 TTL；
- 超时不抢锁，返回 document_busy；
- 临时文件必须与目标文件同目录，名称不可由用户输入；
- 权限尽量继承原文件；
- Windows/macOS/Linux 分别验证 replace 行为。不能把 Node rename 在所有平台都视为无条件原子；若平台不支持安全覆盖，应使用经过测试的 same-volume replace/backup 策略；
- commit 前保留内存中的旧 bytes/hash，必要时将短期恢复副本放用户状态目录，不放项目业务目录；
- 启动扫描遗留 temp/lock，只按 nonce、PID、TTL 和目标 revision 判断；无法确认时报告 recovery_required，不自动清空；
- clientMutationId 在 session TTL 内幂等，同一 ID + 相同 payload 返回首次结果；同一 ID + 不同 payload 返回 idempotency_key_reused。

### 4.6 SQLite 兼容策略

推荐一次性、显式、可回滚迁移，不做长期双写：

1. 迁移器以只读模式列出当前 SQLite documents；
2. 用户选择目标项目和文档映射；
3. 对每份 JSON graph 经 acm-core 规范化生成 ACM-MD；
4. 运行 JS validator 和现有 Python strict validator；
5. 做 parse → serialize → parse 等价测试；
6. 将 SQLite 数据库备份到用户状态目录；
7. 以临时文件 + 原子替换写入 .acm/documents，并生成可重建 index；
8. Tauri 切到 project store adapter；
9. 在用户确认前保留 legacy DB 只读入口；确认后也不自动删除。

任何一份文档失败则该份不切换；批量迁移默认 all-or-report，不自动修补或丢弃非法字段。SQLite 与 ACM-MD 不得双向同步。

## 5. 文件级改造清单

下列是后续获批后建议的目标文件，不是本次实际修改。

### 5.1 新共享 core

推荐建立 packages/acm-core（若项目不接受 workspace，也可先位于 src/acm/core，但公共 package 边界更可验证）：

| 目标文件 | 从现有位置迁入/新增的职责 |
| --- | --- |
| packages/acm-core/src/schema.js | ACM-MD v0.1 受控词表、类型、状态和字段约束 |
| packages/acm-core/src/model.js | document/node/edge 的无平台数据模型、稳定 ID 检查 |
| packages/acm-core/src/parse.js | 单一 acm fence 严格解析；容错导入另设 preview API |
| packages/acm-core/src/serialize.js | 确定性 ACM-MD 生成和规范化 |
| packages/acm-core/src/validate.js | 结构、引用、枚举和语义校验；与 Python strict validator golden parity |
| packages/acm-core/src/diff.js | 正式文档间 Diff；不得读取 pending store |
| packages/acm-core/src/operations.js | 增量 operations、precondition、幂等应用 |
| packages/acm-core/src/revision.js | canonical bytes 与 SHA-256 revision |
| packages/acm-core/src/context.js | selection/subgraph/execution prompt 的安全裁剪 |
| packages/acm-core/src/index.js | 受控公共导出 |

`packages/acm-core/src/operations.js` 是 v1 增量修改与 Agent proposal 的唯一规范 operation 模型。MCP schema、editor intent 和 project store 只使用下列 camelCase 名称；ACM-MD `changes` 是应用后生成的 Agent Diff 导出投影，不是第二套可执行 patch 语言：

| 规范 operation | ACM-MD v0.1 `changes` 投影 | legacy pendingAgentPatch 兼容 | 收敛规则 |
| --- | --- | --- | --- |
| addNode | added_nodes | add_node → addNode | Phase 1 仅在边界适配并告警；Phase 3 迁完调用方；Phase 6 拒绝 legacy 名称 |
| updateNodeFields | modified_nodes；每个 field 生成 before/after 记录 | update_node → updateNodeFields | 只允许受控字段，不接受任意 JSON Patch path |
| removeNode | removed_nodes；关联边必须以 removeEdge 显式列出 | 无 | noDanglingEdges precondition 只做校验，不隐式吞掉边 |
| addEdge | added_edges | add_edge → addEdge | from/to/type/status 先按 schema 校验 |
| updateEdgeFields | modified_edges；每个 field 生成 before/after 记录 | 无 | 只允许受控字段 |
| removeEdge | removed_edges | 无 | reason 进入 Agent Diff 投影 |
| setNodeLayout | layout_changes | 无 | 仍改变 documentRevision；冲突按 §4.4 处理 |

`patchMeta` 不进入 v1 模型可见白名单：ACM-MD v0.1 `changes` 没有可无损表达 meta field mutation 的结构化 bucket。本计划不借插件化暗改协议；人工 meta 编辑继续通过正式文档 Diff 呈现，若未来要求模型增量改 meta，必须另提协议变更并同步规范、校验器、样例和 skill。整文档 import/replace-preview 也是独立的显式预览流程，不伪装成 operation。

从 src/acm/data.js 移走 parse/export/validate/diff/pending patch 的纯函数；layoutGraph、dagre/ELK、typeLabel、collapse/group visual state 留在 editor。现有 sample 可移至 fixtures。

ACM-MD Skill 仍以项目根 skills/acm-md 为唯一源码。插件包中的 skills/acm-md 由发布构建复制并校验 hash，不手工维护第二份协议。协议或样例改变时必须同步唯一规范、校验器、样例与 skill 验证，不再更新 `doc/` 历史镜像；本计划明确不改变 v0.1。

### 5.2 可复用 editor

推荐建立 packages/acm-editor：

| 现有文件 | 目标变化 |
| --- | --- |
| src/App.jsx | 拆为 DesktopApp composition root、AcmEditorShell、document controller/hooks、toolbar；不再直接选择存储平台 |
| src/acm/FlowCanvas.jsx | 迁入 editor；DOM 图像导出改为注入 ExportAdapter；不引用 Tauri/MCP |
| src/acm/Panels.jsx | 迁入 editor；接收 document service、pending proposal、validation model 和 host capabilities |
| src/acm/data.js 中布局/展示部分 | 迁入 editor/layout 和 editor/presentation |
| 新增 packages/acm-editor/src/contracts.js | StoreAdapter、HostAdapter、FileDialogAdapter、MessageSender 能力接口 |
| 新增 packages/acm-editor/src/PendingProposalPanel.jsx | 明确区分 proposal preview 与正式 Agent Diff |

editor 只发出用户意图，如 requestCommit、requestImportPreview、requestSendPreview，不直接写文件或给 Codex 发消息。

### 5.3 platform adapters

| 目标 | 文件建议 | 职责 |
| --- | --- | --- |
| Tauri | src/platform/tauri/* | 项目文件 store、原生对话框、导出、legacy SQLite migration reader、agy adapter |
| Browser | src/platform/browser/* | localStorage demo store、浏览器导入下载；必须显示“非项目真源/开发模式” |
| Widget | plugins/agent-context-map/widget/src/platform/* | MCP Apps bridge、tool result hydration、app-only tool calls、ui/message |
| Node project store | plugins/agent-context-map/mcp/src/project-store/* | root 绑定、safe path、读写锁、revision、atomic replace、recovery |

src/storage/store.js 退化为桌面 composition shim 后删除；src/storage/files.js 的 DOM/Tauri 分支迁入各 adapter。src/acm/agentClient.js 拆成 TauriAgentAdapter 和 WidgetHostAdapter，不能继续用全局 MCP/HTTP 猜测作为生产协议。

### 5.4 Tauri 侧

- src-tauri/src/lib.rs 保留 Tauri 入口和现有命令；新增迁移命令时只能只读打开 legacy SQLite，正式写由项目 store adapter 负责。
- src-tauri/capabilities/default.json 当前文件读写能力较宽。后续应按用户选定项目根最小化 allowlist；在完成跨平台原生对话框和 root scope 验证前不得扩大权限。
- src-tauri/tauri.conf.json、Cargo.toml 只在对应 Phase 明确需要时改。
- Tauri 必须在每个 editor/core 重构 Phase 后通过现有 build；不能等插件完成后才回归。

### 5.5 Vite 和构建入口

建议从单一 vite.config.js 演进为：

- vite.desktop.config.js：当前 Tauri/浏览器应用；
- plugins/agent-context-map/widget/vite.config.js：Widget；
- Widget 使用独立 index.html/entry，base 为相对路径；
- 生产 Widget 生成 self-contained 或可由 MCP UI resource 安全解析的资产清单；
- 禁止运行时依赖 Vite dev server；
- UI resource 使用 text/html;profile=mcp-app，并通过 _meta.ui.resourceUri 绑定；
- CSP 默认 connectDomains/resourceDomains 为空或最小，若 Widget 不直连 loopback 则无需开放 localhost fetch；
- mcp/server.mjs 是构建产物；mcp/server.source.* 是源码。发布前对 bundle 做 deterministic hash 和 clean-room smoke。

## 6. 插件目录设计

建议未来结构：

    plugins/agent-context-map/
      .codex-plugin/
        plugin.json
      .mcp.json
      README.md
      CHANGELOG.md
      mcp/
        src/
          server.*
          tools/
          session/
          project-store/
          security/
        server.mjs
      skills/
        acm-md/
      widget/
        index.html
        src/
          main.*
          App.*
          platform/
          lifecycle/
        vite.config.*
      dist/
        widget/
        manifest.json
      assets/
        icon-*.png
      tests/
        distribution/
        mcp/
        widget/
        concurrency/

    .agents/
      plugins/
        marketplace.json

归属规则：

- 直接复用源码：packages/acm-core、packages/acm-editor；插件通过 package import 使用，不复制实现。
- 构建生成：mcp/server.mjs、dist/widget、dist/manifest.json、插件内 skills/acm-md 的发布副本和 checksums。
- 独立维护：plugin.json、.mcp.json、Widget composition、MCP tool/server、安全/session/project store、插件 README/CHANGELOG。
- marketplace.json 是未来分发入口，不在实现早期创建，更不在本次创建。先 repo-local path install/开发模式验收，再决定是否建立 marketplace。
- 源仓库可继续忽略 dist；正式 Release 包必须包含 dist 和 bundled server。若需要跟踪 dist，必须另行评审 .gitignore 例外，不能顺手改变。

plugin.json 至少声明稳定 id、displayName、version、skills 与 mcpServers；.codex-plugin 下只放 plugin.json。.mcp.json 使用相对 plugin root 的 node + ./mcp/server.mjs，cwd 固定插件根，不能把用户项目路径写死在配置。

## 7. MCP 工具契约

### 7.1 通用约定

所有工具：

- 使用 JSON Schema/Zod 双侧校验，拒绝额外字段；
- outputSchema 与 structuredContent 一致；
- 错误用稳定 error.code + retryable + correlationId，不把堆栈和 token返回模型；
- projectId、task binding、sessionId 来自可信 server session，不接受模型自报的绝对 projectPath/threadId 作为授权证据；
- docId 使用安全 ID，任何 relativePath 都经 canonical root + realpath containment 校验；
- 写类工具记录不含正文的 audit event；
- readOnlyHint、destructiveHint、openWorldHint、idempotentHint 必须与真实副作用一致，但 server 仍自行强制权限。

公共响应包：

    ok
    projectId
    documentId
    documentRevision
    sessionId
    correlationId
    data | error

### 7.2 第一版模型可见工具

#### open_agent_context_map

职责：为当前可信 Codex task/workspace 打开 Widget，建立 provisional openAttempt。

输入：

- documentId，可选；
- focusNodeIds，可选、上限；
- mode：view 或 edit，默认 view。

禁止输入 projectPath、threadId、token。项目根只能由宿主 workspace roots/task metadata 或用户可信 UI 选择产生。

输出：

- openAttemptId；
- sessionId；
- projectId/documentId/revision；
- lifecycleState=starting；
- Widget 的 structuredContent 和 UI resource metadata。

副作用仅限用户状态 session，不改项目；readOnlyHint=true。它不能仅因 MCP tool 返回成功就宣称 Widget ready。

#### await_agent_context_map_ready

职责：等待指定 openAttempt 的真实 Widget 就绪证据。

输入：openAttemptId、最大受限 timeout。

输出：

- state=ready 或 failed/timeout；
- widgetInstanceId；
- readyProof：React mounted、host bridge connected、session matched、project hydrated、document validated、canvas first render completed；
- 当前 revision。

ready 证据必须同时匹配 taskKey、projectId、sessionId、openAttemptId、widgetInstanceId；旧 instance 的迟到消息无效。

#### get_acm_graph_context

职责：返回模型可读、最小化的当前图谱上下文。

输入：

- documentId；
- selector：all、nodeIds、query 或 related；
- relationPolicy：预定义策略名，不能传任意代码；
- maxNodes，server 上限不超过 100；
- expectedRevision，可选。

输出：

- nodes/edges 的结构化摘要；
- documentRevision；
- truncation 和 omitted counts；
- validation warnings；
- contextId，绑定 session + revision + selector，短 TTL。

all 仍受输出大小上限；敏感字段按项目策略裁剪。readOnlyHint=true。

#### validate_acm_graph

职责：调用共享 core 严格校验，不写项目。

输入二选一：

- documentId + expectedRevision；或
- acmMdText，用于导入预检，大小受限。

输出：

- valid；
- diagnostics：code、severity、JSON path/line、message；
- normalizedPreviewRevision，仅在可规范化时返回；
- Python strict validator parity status（发布构建中可由等价 golden 保证；运行时不强制依赖 Python）。

非法输入不生成空文档。readOnlyHint=true。

#### write_acm_graph

职责：模型可见的增量写工具只创建 pending proposal，不直接写正式 ACM-MD。

输入：

- documentId；
- expectedRevision；
- clientMutationId；
- operations[]；
- rationale；
- sourceContextId，可选且必须匹配同 revision。

第一版 operations 白名单：

- addNode；
- updateNodeFields；
- removeNode（必须带 noDanglingEdges 或显式 edge removals）；
- addEdge；
- updateEdgeFields；
- removeEdge；
- setNodeLayout（只修改 layout）。

禁止 replaceWholeDocument、任意 JSON Patch path、任意文件路径和 confirmed 推断。server 应把不合法 inferred confirmed 拒绝或按明确规则降级为 suggested，并返回 warning，绝不能静默提高确信度。

输出：

- proposalId；
- baseRevision；
- normalizedOperations；
- previewDiff；
- diagnostics；
- expiresAt；
- requiresHumanAcceptance=true。

proposal 只写用户 session state，不进入正式 doc、保存、导出或正式 Agent Diff。相同 clientMutationId 幂等。expectedRevision 不一致返回 revision_conflict，不自动 rebase。

#### import_acm_md

职责：解析外部文本并创建 import preview/pending proposal；模型可见路径不能读取任意本地文件。

输入：

- acmMdText（大小限制）；或
- projectRelativePath，仅允许 .acm/documents 下且已绑定当前项目；
- targetDocumentId；
- expectedRevision，覆盖现有文档时必填；
- mode=create 或 replace-preview。

输出：importProposalId、parsed summary、diagnostics、preview revision、requiresHumanAcceptance=true。

正式替换只能由 Widget 用户点击后调用 app-only commit。非法文档不得落盘。第一版不支持任意本地附件。

#### export_acm_md

职责：返回当前正式文档的规范化 ACM-MD 内容或下载 payload；不允许模型指定任意落盘路径。

输入：documentId、expectedRevision、includeLayout。

输出：fileName、mimeType、acmMdText、documentRevision、sha256。

插件版“导出”是读取；外部 Save As 仅在有可信宿主文件能力且用户点击时实现。项目真源本身仍是 .acm/documents 文件。readOnlyHint=true。

### 7.3 app-only、用户点击门控工具

#### commit_acm_proposal

只对 Widget 可见，_meta.ui.visibility=["app"]。输入 proposalId、expectedRevision、widgetInstanceId、userGestureNonce。server 验证 proposal/session/task/project/instance 全匹配，在文档锁内重新读取和校验，原子写正式文件。

返回 newRevision、committedOperationIds、indexUpdateStatus。若冲突，只返回新 revision 和重新预览要求，不自动 rebase。destructiveHint 取决于 operations 是否含删除/覆盖；无论提示元数据如何，server 必须验证用户点击 nonce。

#### commit_manual_edit

Widget 人工编辑的增量 commit。输入同样要求 expectedRevision、clientMutationId、widgetInstanceId、userGestureNonce。它不属于 Agent proposal，因此可直接保存，但仍需预览删除/覆盖型操作。

#### send_acm_context

只对 Widget 可见，不允许模型自行触发。输入：

- mode：selected_context、related_subgraph、execution_prompt；
- documentId/revision；
- selectedNodeIds；
- previewDigest；
- userGestureNonce；
- widgetInstanceId；
- 可选用户附言。

server 重建最终 payload 并核对 digest，不能相信 Widget 传入的任意消息正文。通过 MCP Apps 标准 ui/message 发送到当前宿主；若宿主仅提供 window.openai.sendFollowUpMessage，可能力探测后作为兼容 fallback。发送前 Widget 必须显示最终文本、节点/边数量、裁剪和警告，由用户点击确认。

#### agent_context_map_widget_api

app-only multiplexed session API，用于 hydrate、selection、proposal preview、heartbeat、ready evidence 和受控 commit。它不是模型业务工具，不接受任意 URL/path/token，不向模型返回 daemon token。

### 7.4 冲突和失败返回

稳定错误码至少包含：

- no_trusted_workspace；
- task_binding_mismatch；
- project_binding_mismatch；
- stale_widget_instance；
- open_attempt_superseded；
- document_not_found；
- revision_conflict；
- document_busy；
- invalid_current_document；
- invalid_operation；
- validation_failed；
- proposal_expired；
- proposal_binding_mismatch；
- atomic_replace_failed；
- recovery_required；
- send_not_user_initiated；
- payload_digest_mismatch。

任何错误都不得把正式文件清空、回退为 sample 或覆盖为 Widget 内缓存。Widget 应进入可诊断 failed/conflict 状态并保留用户未提交编辑。

## 8. Widget 生命周期与防串线

### 8.1 单调状态机

建议生命周期：

    idle
      -> starting
      -> connecting_host_bridge
      -> binding_task
      -> binding_project
      -> hydrating_document
      -> mounting_editor
      -> rendering_canvas
      -> ready

任一步只能前进到下一步、failed 或 superseded，不能从 failed 自动伪装 ready。ready 必须由 Widget 发送：

- React root mounted；
- MCP Apps bridge initialize 完成；
- tool result/session payload schema 通过；
- task/project/session/openAttempt/widgetInstance 全匹配；
- document 从 MCP project store 读取并严格校验；
- editor hydrate 完成；
- React Flow onInit 和首帧绘制完成。

服务端 await 工具收到完全匹配的 ready evidence 后才返回 ready。

### 8.2 instance 与重载

每次 open 生成 openAttemptId；每次 iframe mount 生成 widgetInstanceId。server 维护：

- taskKey → 当前 project binding；
- sessionId → 当前 openAttempt；
- openAttemptId → 唯一有效 widgetInstance；
- widgetInstance → documentId + baseRevision。

同容器 rebind 时，新 instance 原子替代旧 instance；旧 heartbeat、commit、send 和 ready 全部返回 stale_widget_instance。Codex 重载或新 task：

1. host bridge 重新初始化；
2. server 从可信 task/workspace metadata 重建 binding；
3. 只在 projectId + canonical root fingerprint 同时匹配时恢复 active doc；
4. pending proposal 必须同时匹配 task、project、doc、base revision 且未过期，否则只允许丢弃/手工导出，不自动应用；
5. 无可信 workspace 时进入只读 failed 状态，不采用最近项目作为写目标。

### 8.3 React/Vite 复用

- Widget composition 复用 acm-editor，不复用 DesktopApp；
- 注入 WidgetStoreAdapter、WidgetHostBridge、NoExternalFileAdapter；
- 去除 Tauri menu/dialog、SQLite/localStorage 自发现；
- 图像导出若需要，使用浏览器内存下载且用户点击；第一版可在真实宿主兼容性未验证前禁用；
- Widget 静态资源由 MCP UI resource 提供，生产包不依赖 dev server；
- 对 structuredContent、tool input/result 一律按不可信输入重新 schema validate；
- MCP Apps 标准 _meta.ui.resourceUri、ui/*、tools/call、ui/message 为主；window.openai 仅能力探测兼容。

### 8.4 loopback daemon

若 Phase 4 ADR 证明需要 daemon：

- 只监听 127.0.0.1，不监听 0.0.0.0、:: 或 LAN 地址；
- OS 分配随机端口；
- 每次进程启动生成 256-bit 随机 token；
- token 只存在 MCP control plane 与 daemon 间，Widget/模型不可见；
- 每次请求校验 bearer token、session nonce、task/project binding 和方法白名单；
- 无 CORS 公网开放，无静态目录任意遍历；
- idle TTL、父进程消失和插件卸载时退出；
- 插件更新先启动新版本并健康检查，再切 session；不得在启动脚本中改项目文件。

若单 stdio MCP 已能满足真实宿主重载、并发和生命周期测试，优先不拆 daemon，以减少攻击面；但安全测试仍按“存在本地服务”的最严边界执行。

## 9. “发送给 Codex”的语义

三种行为必须在 UI、工具名、预览文案和输出 schema 中分开。

### 9.1 发送选中上下文

- 只包含用户显式选中的节点；
- 只包含选中节点之间已经存在的边，不做图遍历；
- 所有边仅作关系说明，不产生执行指令；
- 输出含文档 ID/revision、节点 ID/type/status、必要正文、边；
- 无选中节点时禁止发送；
- 默认上限 20 节点，超限要求用户缩小或明确确认裁剪。

适合“请基于这些已选事实回答/讨论”。

### 9.2 发送相关子图

从显式选中节点出发做有界遍历。第一版默认自动遍历白名单：

- depends_on：从当前节点纳入其依赖；
- requires：纳入必需前置条件；
- constrains：纳入直接约束当前节点的节点；
- references：纳入直接证据/资料节点，但标记为 evidence；
- needs_validation：纳入待验证项，但标记为 unresolved。

contains 默认不遍历；用户可勾选“包含直接子项”后只展开一层。impacts、conflicts_with、replaces、answers 不作为自动扩展边；如果它们恰好连接已纳入节点，可在“旁路关系”区显示，但不继续遍历。

默认最大深度 2、最大 40 节点、最大 80 边；截断必须在预览和发送正文显示。任何需要扩大上限的行为由用户显式确认。

适合“请理解这部分上下文及其约束/依赖”，不等于执行。

### 9.3 生成执行提示

第一版只允许用户显式选中的 Task 节点成为执行项。自动发现的 Task 不会自动变成执行项：

- Task 的 depends_on/requires 指向的 Task 可作为 prerequisite 列出，但必须由用户在预览中勾选后才进入“待执行任务”；否则只作为前置条件；
- constrains 只进入约束段；
- references 只进入证据段；
- needs_validation 进入阻塞/待核验段，默认阻止“一键发送为可执行”；
- contains 不自动把所有子 Task 纳入；
- impacts、conflicts_with、replaces、answers 不生成执行顺序。若已选 Task 之间存在 conflicts_with，必须硬阻塞并要求先解决或明确排除；
- 非 Task 节点不能成为执行动作，只能作为目标、背景、决策、约束、风险或证据。

执行提示必须包含：

- 目标和选中 Task ID；
- 被允许的依赖和约束；
- unresolved/needs_validation；
- 明确非目标；
- 要求 Codex 先复核当前仓库状态和权限；
- “仅执行预览中列出的 Task，不自动沿图扩展”的硬句；
- 来源 docId + documentRevision。

用户看到最终文本后点击发送。插件不直接调用工具执行图谱，不自动发送整图，不把 Agent suggested 当 confirmed。

## 10. 安全模型

### 10.1 信任边界

可信度从高到低：

1. server 自身生成的 nonce/token/revision；
2. Codex host/MCP protocol 提供且经真实宿主验证的 task/workspace/session metadata；
3. Widget 经 host bridge、绑定 instance 和 user gesture 发来的受控调用；
4. 项目 ACM-MD（可能含恶意文本，必须视为不可信数据）；
5. 模型提供的 tool arguments（永不作为 project/task 授权证据）。

### 10.2 项目根与路径

- 只接受当前 Codex task 暴露的 workspace roots；多 root 必须由用户在 Widget 选择；
- 对 root 做 realpath/canonicalize，记录 volume/device + path fingerprint；
- 所有文件操作从 server 预定义 .acm 路径拼接，拒绝绝对路径、..、空字节、保留设备名、symlink/junction 逃逸和大小写绕过；
- 打开文件后再次核验最终 realpath 位于 canonical root；
- docId 只允许安全字符和长度；
- Widget/MCP 模型工具不得读取项目外文件；
- 第一版不支持任意附件、任意导入路径或任意 Save As。

若 Codex 当前版本不能提供可信 workspace/task 元数据，写工具必须禁用。可研究“用户通过原生目录选择器一次性授予 root”的降级，但这属于需要用户批准的安全 ADR，且仍不能让模型传路径。

### 10.3 网络、token 和日志

- 不访问业务外网，不含遥测；
- daemon 仅 loopback + 随机端口 + 随机 token；
- Widget 不直接持有 token，不向 structuredContent/content 写 token；
- CSP connect/resource/frame/redirect allowlist 最小化；
- 不加载远程字体、脚本、图片；
- 日志默认不含图谱正文、prompt、token、用户姓名、绝对路径；诊断导出需用户明确操作并先预览；
- 工具输入限制总字节、节点数、operations 数、嵌套深度和执行时间，防止资源耗尽。

### 10.4 写入与发送

- 模型 write_acm_graph 只写 pending user state；
- 只有 app-only commit + 匹配的 userGestureNonce 才写正式项目文件；
- 删除/覆盖显示显著 diff 和 destructive 提示；
- revision 冲突绝不自动覆盖；
- send_acm_context 只能用户点击，server 重建 payload 并比对 digest；
- 插件不能自动 git add/commit/push；
- 插件更新、启动、卸载不得修改 .acm 内容。

### 10.5 卸载和数据

- 卸载默认保留项目 .acm 数据和现有 Tauri 数据；
- 用户状态目录可通过显式“清理本机插件状态”删除 token/session/log/cache，但不得顺带删项目图谱；
- 重装后从项目 .acm 重建 index/cache，旧 session 和 pending 不自动恢复为可写；
- 更新前后比较项目目录 hash，任何安装/更新导致业务文件变化都视为发布阻断。

### 10.6 项目章程修订授权

用户已在本计划 activation 的 §14.2 决策 2 中批准把 AGENTS.md 当前“不得引入后端”的表述精确化为；实际文件修改仍只在 Phase 0A 按修改范围执行：

> 不引入远程业务服务、云数据库或遥测；允许 Codex 插件包含仅监听 loopback 的本地 MCP 桥接进程。该进程只能访问当前可信 Codex 任务绑定项目内的 .acm 范围，并必须遵守随机 token、最小权限、人工写入门控和卸载数据保留规则。

并对 pending view state 增加精确化：

> pending 建议可以只在本机用户状态目录持久化，作为 pending view state 的恢复缓存；它不得进入项目目录、正式图谱、常规保存、导出、Agent Diff 或 Git 跟踪，且恢复时必须重新核对 task/project/doc/baseRevision/instance 与 TTL 并由用户重新预览。未批准本机持久化时，pending 只能存在于进程内存。

INSTRUCTIONS.md 还存在必须显式授权、但不能提前写成既成事实的数据真源变更：

- 激活时在 `docs/decisions/` 新建 Accepted 数据真源决策，记录“项目 `.acm/documents/*.acm.md` 将成为业务内容单真源、SQLite 退为只读迁移源、不双写”，并与本计划和 Phase 2 Gate 互链；
- 只有 Phase 2 的迁移、原子写、回滚和 Tauri project store Gate 全部通过、业务真源实际切换时，才同步把 INSTRUCTIONS.md 的 Product And Stack 与 Stable Invariant 5 改为当前事实；
- 若 Phase 2 失败或未切换，INSTRUCTIONS.md 保持 SQLite 当前事实，不得为了匹配目标架构而提前失真。

本次 activation 已记录 loopback、pending 持久化和数据真源授权，但没有实际修改 AGENTS.md 或 INSTRUCTIONS.md。Phase 0A 必须把两条已批准 AGENTS.md 精确化文本原样同步并验证；Phase 2 只有在 `DEC-004` 约束的 Gate 全过、真源实际切换时才更新 INSTRUCTIONS.md。

## 11. 分阶段实施方案

所有 Phase 都是未来激活后执行。每个 Phase 独立验收；前一 Gate 未通过不得进入下一 Phase。命令以仓库根 PowerShell 为上下文；不得自动安装新依赖，依赖变更必须在对应 Phase 先获批准并由 lockfile 审核。各 Phase 为其明确列出的测试/构建命令新增或调整 npm scripts 时，`package.json` 的 `scripts` 区段视为该 Phase 修改范围的一部分；该授权不覆盖 dependencies/devDependencies、其他 package 元数据或 lockfile，依赖变更仍须按本节规则单独审批。Phase 0 只有在用户明确批准 §14.2 的测试运行器选择后，才可安装与当前 Vite/Node 基线兼容的固定 Vitest devDependency；禁止用 no-op `test` script 伪造 Gate。

### Phase 0：决策冻结、可执行测试基线与可信宿主 spike

输入：

- 本计划 v2、review-001 与 review-002 approve 证据；
- 用户对第 14.2 节决策的明确答复；
- 用户明确批准并激活本计划，数据真源 Accepted 决策已在 activation 变更中落位；
- 当前 AGENTS/INSTRUCTIONS/PROGRESS/HANDOFF/Git 对账；
- ACM-MD v0.1 唯一规范、校验器与样例基线。

修改范围：

- 经批准的 docs/exec-plans 生命周期文件和状态索引；
- 经批准的 package.json、lockfile、Vitest 配置与真实 baseline tests；
- tests/fixtures 中的 v0.1 golden corpus；
- AGENTS.md 仅修改已批准的 loopback 与 pending 持久化精确化句；
- `spikes/codex-host-binding/` 下的最小 repo-local plugin、只读 stdio MCP、证据记录与专属测试；不得引用 acm-core/project store，不得读取或写入 `.acm`。

实施项：

Phase 0A — 决策与测试基线：

1. 记录 4 个 ADR：数据真源、project/task root 发现、single MCP vs daemon、SQLite 迁移；
2. 按用户批准引入固定 Vitest devDependency，逐项审核 package.json 与 lockfile，建立可执行的 baseline suite；
3. 固化当前合法/非法 ACM-MD、现有 SQLite sample、序列化输出和 Tauri UI smoke；
4. 建立 test、roundtrip、schema、distribution 的真实最小测试；未有实现的命令应明确 fail/skip with reason，不得以永远成功的占位脚本过 Gate；
5. 对 Canvasight 参考 commit 和官方文档日期做 pin，不把参考实现当依赖。

Phase 0B — 独立可信宿主 spike：

1. 在 `spikes/codex-host-binding/` 建最小 repo-local plugin + bundled stdio MCP，只暴露 health 和只读 identity-evidence 工具，不接业务 core、editor、SQLite 或 `.acm`；
2. 在真实 Codex Desktop 新 task、reload、第二 task 和多 workspace root 场景记录宿主实际提供的初始化、tool-call、UI/session metadata 字段、来源和生命周期；证据只保存字段名、类型、稳定性和脱敏 correlation ID；
3. 证明授权用 root/task identity 由宿主或用户原生可信 UI 提供，模型 tool arguments 无法覆盖；主动传伪造 projectPath/threadId/root，确认 server 不采纳；
4. 写出 Gate 结论：trusted_host_identity、trusted_native_picker_required 或 unavailable。后两者均不得静默进入 Phase 1；若选择 native picker，必须先回到 §14.2 获得用户批准并更新安全 ADR。

验收命令：

    npm run harness:check
    npm run harness:budget
    npm run build
    npm run test -- --run tests/baseline
    npm run test:host-binding-spike
    python skills/acm-md/scripts/validate_acm_md.py <valid-fixture>
    git diff --check

真实验收：

- 用 repo-local 临时安装在 Codex Desktop 执行 Phase 0B 场景，记录 Codex 版本、安装路径、task/reload 边界和脱敏 evidence；
- spike 包不包含项目业务代码，运行前后测试项目 `.acm` hash 不变；
- 自动化 mock 只能补充 schema 测试，不能替代真实宿主 identity 证据。

预期结果：

- 现有构建和 golden baseline 通过；
- Vitest 真实执行至少一个通过和一个预期失败/拒绝 fixture，lockfile diff 已审；
- 至少包含合法、非法枚举、悬空边、重复 ID、多 fence、confirmed inference 等 fixtures；
- ADR 有明确 chosen/rejected 和 reopen 条件；
- Phase 0B 产出不可由模型覆盖的可信 root/task 证据和可重复步骤；
- 除隔离 spike 外无插件产品实现或数据迁移，项目 `.acm` 未被读取或修改。

停止条件：

- 已批准的 AGENTS loopback 句未在 Phase 0A 按原文同步或验证；
- 已批准的 AGENTS pending 持久化句未在 Phase 0A 同步，但实现仍试图提供跨重启恢复；
- Vitest/lockfile 变更未获批准或 baseline suite 只是 no-op；
- Phase 0B 无法确认可信 workspace/task 身份来源，或 identity 可被模型参数覆盖；
- 当前 Tauri 基线构建失败且原因未记录；
- v0.1 规范、校验器与样例基线不一致。

### Phase 1：抽取 acm-core 并建立协议等价

输入：

- Phase 0 golden corpus；
- src/acm/data.js；
- Python strict validator。

修改范围：

- packages/acm-core 或获批的 src/acm/core；
- src/acm/data.js 的兼容 re-export；
- core tests/fixtures；
- package exports/build/test 配置。

实施项：

1. 先迁 schema/model/parse/serialize/validate，再迁 diff/operations/revision/context；
2. 把布局、React 和展示函数留在现有 UI；
3. 对所有合法 fixture 做 parse → serialize → parse 结构等价；
4. 对所有非法 fixture要求 JS/Python 在同一严重级别拒绝；
5. 按 §5.1 建立唯一规范 operation schema、apply/precondition 与 `changes` 投影；对 add/update/remove node/edge 和 layout 做双向 fixture；
6. 为 add_node/update_node/add_edge 建仅限 Phase 1 的 legacy input adapter 和 deprecation 诊断，core 内部与新调用方一律只产出 camelCase；
7. 建立禁止平台 import 的静态测试。

验收命令：

    npm test -- --run acm-core
    npm run test:acm-roundtrip
    npm run test:acm-validator-parity
    npm run build
    python skills/acm-md/scripts/validate_acm_md.py <roundtrip-output>
    git diff --check

预期结果：

- core 在纯 Node 环境 import，无 window/document/Tauri/SQLite/fs；
- 现有桌面行为通过兼容入口保持；
- 规范化输出确定，相同输入 hash 相同；
- operation schema 与 ACM-MD `changes` 投影逐项有 golden；`patchMeta` 等无 v0.1 无损投影的操作不进入模型可见 schema；
- ACM-MD v0.1 未变。

停止条件：

- 合法文档 round-trip 丢字段/ID/边；
- JS 与 Python strict validator 存在未解释分歧；
- core bundle 出现平台依赖；
- 任一模型可见 operation 无法映射为 §5.1 规定的正式 Diff 投影，或 core 同时保留两套规范命名；
- Tauri build 回归。

### Phase 2：项目文件真源与 SQLite 迁移兼容

执行状态：Completed（2026-07-14）。本 Phase 已实际切换桌面业务真源并同步稳定章程；证据见本节验收命令、`PROGRESS.md`、`HANDOFF.md`、DEC-004 与 DEC-007。

输入：

- acm-core；
- 当前 SQLite schema/migrations；
- 用户确认的 Git 跟踪与迁移策略。

修改范围：

- project store 接口；
- Tauri project-file adapter；
- legacy SQLite read-only migration；
- .acm fixture projects；
- 原子写、锁、recovery 测试；
- INSTRUCTIONS.md 与对应 Accepted decision/index，仅限 Phase 2 Gate 全部通过并实际切换业务真源时同步更新。

实施项：

1. 实现 .acm 扫描、可重建 index、content-hash revision；
2. 实现 expectedRevision、document lock、temp + safe replace、幂等 mutation；
3. 实现 crash point 测试；
4. 实现 SQLite dry-run/export/validate/apply/rollback，不双写；
5. 迁移 UI 只生成预览，用户确认后切换单文档；
6. Gate 通过并完成业务真源切换后，同一 Phase 内把 INSTRUCTIONS.md 的桌面持久化事实与 Stable Invariant 5 更新为“项目 ACM-MD 单真源、SQLite 只读迁移源、不双写”，并回链 activation 时的 Accepted 数据真源决策；失败或未切换时不得修改章程。

验收命令：

    npm run test:project-store
    npm run test:concurrency
    npm run test:atomic-recovery
    npm run test:sqlite-migration
    npm run test:acm-roundtrip
    npm run build
    git diff --check

预期结果：

- 并发 stale revision 100% 返回 conflict 且原文件不变；
- 故障注入后原文件或新文件至少一份完整有效，不出现空/半写；
- index 丢失可从 documents 重建；
- SQLite 原库未改，迁移失败可回滚；
- Tauri 可从项目 ACM-MD 打开/保存；
- INSTRUCTIONS.md 与实际已切换状态一致，Accepted 决策、PROGRESS.md、HANDOFF.md 和 Phase 2 证据互相可追踪。

停止条件：

- 任一平台无法可靠验证 safe replace；
- 迁移存在丢字段或无法保留的语义；
- index 与文档不一致时会覆盖文档；
- 需要长期 SQLite/ACM-MD 双写；
- 真源已切换但 INSTRUCTIONS.md 或 Accepted 决策未同步，或章程在切换前被提前改写。

### Phase 3：editor 与 platform adapters 解耦，保持 Tauri

输入：

- acm-core 和 project store；
- App/FlowCanvas/Panels/store/files/agentClient 当前行为；
- Phase 0 UI smoke。

修改范围：

- packages/acm-editor；
- src/App.jsx、src/main.jsx；
- src/platform/tauri、src/platform/browser；
- src/storage 兼容层；
- 必要的 Tauri capabilities 最小化。

实施项：

1. 抽 AcmEditorShell 和 document controller；
2. FlowCanvas 注入 export/host capabilities；
3. Panels 区分 pending proposal 与正式 diff；
4. Tauri/Browser adapter 在 composition root 注入；
5. Tauri 正式 store 改用项目文件，SQLite 只留 migration reader；
6. 浏览器 localStorage 明示 demo，不与项目文件同步；
7. 将所有内部 add_node/update_node/add_edge 调用方迁到 §5.1 camelCase 规范操作；legacy adapter 只保留给旧 fixture/导入诊断，不再由产品代码调用。

验收命令：

    npm test -- --run acm-editor
    npm run test:import-boundaries
    npm run build
    npm run tauri -- build
    npm run harness:check
    git diff --check

预期结果：

- Tauri 能创建、打开、编辑、undo/redo、校验、导入/导出、保存 .acm 文档；
- editor 在 mock adapter 下运行；
- Widget 候选 bundle 的依赖闭包无 Tauri SQL；
- 现有 Agent suggestions 仍只能 pending。
- 产品代码不再产出 legacy snake_case operation。

停止条件：

- Tauri 核心功能回退；
- editor 必须访问 window.__TAURI_INTERNALS__ 或 SQLite；
- 任何 Agent proposal 可绕过人工采纳进入正式文件。

### Phase 4：插件壳、MCP control plane 与安全根绑定

输入：

- 用户批准的插件 id/version/分发范围；
- 官方 Codex plugin/MCP Apps 文档；
- Phase 0 project/task binding ADR 与真实宿主 spike evidence；
- acm-core/project store。

修改范围：

- plugins/agent-context-map/.codex-plugin/plugin.json；
- .mcp.json；
- mcp/src、bundle script、distribution tests；
- 由构建复制的 skills/acm-md；
- 暂不创建 public marketplace。

实施项：

1. 建最小 bundled stdio MCP 和 health/read-only validate tool；
2. 在产品插件壳中重放 Phase 0B identity 场景，证明宿主版本与完整 MCP 生命周期下的 task/workspace root 仍不可由模型伪造；若字段、来源或生命周期漂移则重新打开 ADR，不得沿用旧证据；
3. 实现 root canonicalization/path containment；
4. 比较单进程 session service 与独立 loopback daemon，按 ADR Gate 选择；
5. 如使用 daemon，完成 loopback/token/TTL/parent death；
6. 注册 UI resource 占位，不接 editor。

验收命令：

    npm run build:mcp
    npm run test:mcp-schema
    npm run test:mcp-runtime
    npm run test:project-binding
    npm run test:path-security
    npm run test:distribution
    npm run test:mcp-bundle-repro

真实验收：

- 以 repo-local plugin 开发/临时安装方式在 Codex Desktop 新 task 中启动；
- 多 workspace root、symlink/junction、旧 task、伪造 projectPath 均不能越权；
- 清洁环境只用 Release 包可启动 bundled server。

预期结果：

- MCP 不依赖用户 Codex 全局 command 配置；
- 无可信 workspace 时只读失败；
- Phase 0B evidence 在当前支持的最低 Codex 版本上可重复，且产品 server 不接受 tool arguments 覆盖 binding；
- bundle 两次构建 hash 一致或所有非确定字段有书面白名单；
- 插件启动不改项目 .acm。

停止条件：

- 只能靠模型传 projectPath/threadId；
- server 需要监听非 loopback；
- clean package 缺少运行时文件；
- 官方宿主能力不足且无用户批准的安全降级。

### Phase 5：原生 Widget、生命周期和复用 editor

执行状态：Completed（2026-07-14）。实现、真实宿主证据和 Gate 摘要见 §0.7、`PROGRESS.md`、`HANDOFF.md` 与 `plugins/agent-context-map/tests/evidence/phase5-widget-gate.json`。

输入：

- Phase 3 acm-editor；
- Phase 4 MCP/UI resource；
- ready proof 规范。

修改范围：

- plugin/widget；
- WidgetHostAdapter；
- app-only widget API；
- Vite Widget 构建；
- lifecycle/widget runtime tests。

实施项：

1. 通过 MCP Apps bridge 初始化和 hydrate；
2. 接入 acm-editor 的 view/edit；
3. 建立单调状态机、openAttempt/widgetInstance/rebind；
4. 以画布首帧作为 ready 最后条件；
5. 处理 Codex reload、新 task、多实例和 supersede；
6. CSP/资产全部 local，禁止 raw localhost fetch。

验收命令：

    npm run build:widget
    npm run test:widget
    npm run test:widget-lifecycle
    npm run test:widget-rebind
    npm run test:widget-bundle-policy
    npm run test:distribution

真实验收：

- open tool 返回后 await tool 只在 React/项目/画布真实 ready 后成功；
- reload 后绑定正确项目；
- 旧 task/旧 instance 不能 commit/send/ready；
- Widget bundle 无 Tauri/SQLite/绝对路径/远程资产。

预期结果：

- 原生 Widget 可查看和人工编辑当前项目图谱；
- Tauri 同时保持可运行；
- Widget 没有 localStorage 业务真源。

停止条件：

- tool success 被误当 ready；
- instance 串线；
- Widget 必须直接拿 daemon token；
- 宿主不支持所需 MCP Apps bridge 且无安全兼容方案。

### Phase 6：完整 MCP 工具、pending 写入与发送语义

执行状态：Completed（2026-07-14）。实现、hash 守卫、标准宿主交互证据与 Gate 摘要见 §0.7、`PROGRESS.md`、`HANDOFF.md` 与 `plugins/agent-context-map/tests/evidence/phase6-pending-send-gate.json`。

输入：

- 第 7 节工具契约；
- 第 9 节发送白名单；
- Widget user gesture/preview 机制。

修改范围：

- mcp/tools；
- operations/proposal store；
- Widget proposal/send preview；
- schema、contract、conflict、security tests。

实施项：

1. 实现 open/await/get/validate/write/import/export；
2. write/import 只生成 pending proposal，模型可见 operations 仅接受 §5.1 camelCase 规范集合，拒绝 legacy snake_case 和 `patchMeta`；
3. app-only commit 在锁内重新校验 expectedRevision；
4. 实现 selected/related/execution 三种 context builder；
5. server 重建 send payload + digest；
6. 对 prompt injection、confirmed escalation、stale proposal、oversize 操作做拒绝测试。

验收命令：

    npm run test:mcp-schema
    npm run test:mcp-tools
    npm run test:proposal-boundary
    npm run test:revision-conflict
    npm run test:context-selection
    npm run test:send-semantics
    npm run test:prompt-injection
    npm run test:concurrency
    npm run build

真实验收：

- 模型提出变更后项目文件 hash 不变；
- Widget 显示 proposal，用户接受后仅预览 operations 被写入；
- 不点击不能发送；
- execution prompt 只包含明确选中 Task 和允许关系；
- stale revision/instance/task 均失败且无项目写入。

预期结果：

- Codex 可读取、生成建议、校验、增量修改和接收用户选中上下文；
- 现有人工采纳边界完整保留；
- 内部 proposal、MCP schema 与正式 Agent Diff 使用 §5.1 的单一映射，无契约漂移；
- 不自动执行整图。

停止条件：

- 任一模型可见工具直接覆盖正式文档；
- send 可被模型或旧 Widget 触发；
- 发送 builder 遍历未列入白名单的边；
- 非法文档会被空图替换。

### Phase 7：跨平台、干净包与发布候选验证

执行状态：Completed — run `29327685652` 的 Windows/macOS/Linux、clean-room 与 downloaded artifact audit 全绿；下载 artifact `8308656602` 经本机 standalone verifier 再验证通过。

输入：

- 功能完整插件候选；
- Windows/macOS/Linux CI runners；
- 固定 Node/npm 和锁文件。

修改范围：

- CI workflow；
- clean-room/distribution/repro scripts；
- 插件版本、CHANGELOG、checksums；
- 安装测试夹具，不触及用户全局环境。

实施项：

1. 三平台 core/MCP/Widget/project-store 测试；
2. Windows junction/rename/locked file，macOS/Linux symlink/permission 测试；
3. clean checkout → npm ci → build → package 两次可复现性；
4. 只解压发布包启动，不回读源码树；
5. 新安装、覆盖更新、版本降级、卸载重装；
6. 项目 .acm 前后 hash 守卫。

验收命令：

    npm ci
    npm run test:all
    npm run build
    npm run build:plugin
    npm run test:distribution
    npm run test:mcp-bundle-repro
    npm run test:install-upgrade-rollback
    npm run test:uninstall-reinstall

预期结果：

- Windows/macOS/Linux CI 全绿；
- clean package 不依赖源码、dev server 或全局 node_modules；
- 两次 bundle checksum 可解释且稳定；
- 安装/更新/回滚/卸载不修改 .acm；
- 固定 Release 资产、SHA-256 checksums 和 SBOM/依赖清单齐全。

停止条件：

- 任一支持平台有数据安全差异；
- 发布包启动依赖本机开发路径；
- bundle 不可复现且无明确原因；
- 更新触碰项目图谱或丢失本机状态无告警。

### Phase 8：真实 Codex Desktop 试点、稳定发布与交接

执行状态：Stopped / rc.4 live host resource discovery failed — rc.2→rc.3 破坏性 Widget 变更复用 resource URI 的仓库缺陷已由 immutable rc.4 版本化 URI关闭并通过完整本地 Phase 7 Gate。用户随后授权安装、完全重启和一次全新只读 A1；Desktop 确认 descriptor/open/read data plane，但同一 rc.4 MCP process 从初始化至最终 health 均未收到 `resources/list` 或 `resources/read`，因此 resource response、acceptance、iframe、JS/bootstrap 与 React ready 均未进入可归因于 repo 的 live 链路。当前根因归类为 Codex Desktop host limitation/bug candidate；不再构造无证据的仓库修复或 live retry。

Windows 停止规则：用户于 2026-07-14 指定 Windows 再失败一次即停止尝试。自该指令起 `windowsFailureBudget=1`；下一次 Windows canary 或必要 release Gate 失败后，不再自动修复或重跑，只采集现有证据、安全清理并等待用户决定。docs-only push 使用 `[skip ci]`。

2026-07-15 scope change：用户明确要求查因并修复，恢复一次修复后 A1 创建 Gate。修复后的顺序固定为“安装 → 完全重启 Desktop → installed/enabled 复核 → New task UI/公开 deep link 创建 A1”；禁止继续使用内部 `codex_app.create_thread`。通过 A1 只恢复后续 canary 判断，不自动恢复 tag、GitHub Release 或 stable 发布权限。

2026-07-15 retry result：Desktop 重启已完成，插件 tools/health 可调用；health 的 `version=0.2.0` 与安装 manifest `0.3.0-rc.1` 不一致。源码修复以 manifest 为唯一版本来源，并让实际 release bundle 的 `serverInfo.version` 与 Widget appInfo 接受自动断言。由于候选不可变，版本升为 `0.3.0-rc.2`；在 rc.2 完成 Phase 7 和用户重新授权之前，Phase 8 保持停止。

2026-07-15 strict-valid A1 result：用户另行授权一次使用正确 fixture 的真实 Windows A1。`0.3.0-rc.2` health、repo-root host binding、open、get 与 validate 均通过，但同一 openAttempt 的 Widget 没有 instance/state/transitions，await-ready 返回 false。该失败消耗本次授权；继续调查或修复 Widget host binding/lifecycle 需要用户另行授权。

2026-07-15 Widget bridge investigation/fix：用户已另行授权调查和修复。官方当前 MCP Apps bridge 使用 `protocolVersion=2026-01-26`，并把 `ui/notifications/tool-result` 的 canonical tool result 直接置于 `params`；ChatGPT compatibility global 也保留包含 hidden `_meta` 的 canonical `toolResponseMetadata` envelope。rc.2 分别使用 `2025-11-21`、只消费 `params.result`、且不能正确还原 canonical compatibility envelope，导致 Widget 可能在 bootstrap 前失败或无法 hydrate。修复升为 immutable `0.3.0-rc.3`，保留旧 shape fallback；本地 39 files / 113 tests、Vite、固定候选、安装生命周期、reproducibility、clean-room 与 harness 通过，tree `3decfde0429232307e76ddcdbe3df5fa62ced1c1c66bcf33fe7f5a52b9f48bc4`。该结果只恢复 rc.3 Phase 7 remote Gate；CI 全绿、安装、完整重启和新 task A1 之前，Phase 8 仍为 Stopped / host verification pending。

2026-07-15 rc.3 remote/install result：用户明确授权 push、等待跨平台 CI 全绿、安装/重启 rc.3 并在独立新 task 执行 A1。commit `520b258` 对应 run `29385355303` 的 Windows/macOS/Ubuntu、clean-room、downloaded artifact integrity 五 job 全绿；artifact `8331247906` 下载后独立 verifier 命中固定 tree/checksum，CLI 已安装 `0.3.0-rc.3` 且 installed/enabled。当前硬闸门是完全退出并重启 Desktop；重启前不得把当前 task 的旧 MCP/iframe 视为 rc.3 证据。

2026-07-15 rc.3 A1 result：Desktop 完全重启后的新 task health 精确为 `0.3.0-rc.3`。openAttempt `c002c246-4569-4f9c-a290-8175bad46078` 的 open/get/validate 全过，但 ready 等待无 Widget instance/state/transitions；fixture SHA-256 前后均为 `6AC138E4E58CE7AA612C9E05D4EE60413588A4CB4A9AABA2B215302D27B6A007` 并已删除。该失败消耗本次 A1 授权；后续调查、retry 或发布必须等待用户另行授权。

2026-07-15 host lifecycle evidence：A1 rollout 在 `03:10:44.619Z` 的 open completion 带出 `mcp_app_resource_uri=ui://agent-context-map/widget.html`、open correlation `79cb3f70-bdf3-4e85-93a6-cd306763c4e4` 与 openAttempt `c002c246-4569-4f9c-a290-8175bad46078`；`03:10:59.696Z` 的 await correlation `cc212d1d-992e-44cb-bb95-d058f13203ba` 返回无 instance/transitions。installed rc.3 直接 stdio probe 已确认 tool descriptor、`resources/list`、`resources/read`、`text/html;profile=mcp-app` 与 HTML 返回都有效；但 Codex Desktop `26.707.9981.0` 的保留日志没有 resource read/rejection、iframe 或 CSP 记录。因此 descriptor 是 confirmed，Desktop resource discovery/read、host acceptance、iframe、JS 和 `ui/initialize` 是 unknown，server bootstrap arrival 是 falsified；这些 Desktop 内部阶段在公开文档中属于 undocumented/bounded uncertainty。

2026-07-15 rc.4 local fix：官方 Apps SDK 文档把 UI resource URI 定义为 cache key，并要求破坏性 Widget bundle 更新更换 URI且同步 descriptor/list/read。rc.3 bridge 代码相对 rc.2 已变，但仍使用 `ui://agent-context-map/widget.html`，故确认仓库 cache invalidation defect。rc.4 使用版本化 URI、最小 CSP，并增加只读进程内 lifecycle observation。候选固定 tree `93ae0d2e7f789e908fa99d9822eac5cfc3bb24ebab2fe1b7f49731ece762038e`、checksum set `b59584a706f5ae7f0641a80da89938ad5b3d92525661a74ff201ef4f3c99d7a8`；本地 Gate 已过，但 live causality 仍须单独授权的安装→完全重启→全新 task A1 验证。

2026-07-15 rc.4 live host result：用户明确授权安装 rc.4、完全重启 Desktop 和在全新 task 执行一次只读 A1；用户完成重启后，`codex plugin list --json` 确认 rc.4 installed/enabled，Desktop `26.707.9981.0` 与 A1 health 均证明新进程/新 instance。task `019f63ee-3c6f-7841-a905-0c60541fd0e8` 的 open correlation 为 `d165f0d0-a864-43ce-8f41-2a673d108e07`，新 openAttempt 为 `c21d2772-dfb6-4f65-8393-2f3fcff2aa0d`；open/get/validate 成功，唯一 await correlation `04569777-ce14-47db-8ed7-bab9a009990a` 返回 ready=false。最终 lifecycle 为 initialize=1、descriptor list=1、open result=1，但 resource list/read、bootstrap、ready 均为 0。原始 rollout、Desktop `logs_2.sqlite` 与 packaged server control 交叉后，descriptor=confirmed，live resource discovery/read=falsified，resource validity=local confirmed/live not reached，host acceptance/iframe=not reached、内部原因 unknown，JS/`ui/initialize`=unknown，server bootstrap=falsified，React ready proof=falsified。fixture hash 前后一致并已删除；脱敏复现位于 `docs/progress-archive/2026-07-15-codex-desktop-widget-resource-discovery-repro.md`。后续只等待 OpenAI host 反馈或宿主修复；push/tag/GitHub Release/stable 不推进。

输入：

- Phase 7 Release Candidate；
- 用户批准的 repo-local/private marketplace 范围；
- 测试项目和敏感数据隔离方案。

修改范围：

- 试点验收记录；
- 发布/回滚/runbook；
- 必要的 repo-local marketplace 文件（只有此时用户再次明确批准才创建）；
- README/用户文档/PROGRESS/HANDOFF。

实施项：

1. 在真实 Codex Desktop 完成新 task、重载、多 task、多项目、升级/回滚；marketplace 或插件安装后必须先完全重启 Desktop，新 task 只通过 UI 或公开 deep link 创建；
2. Tauri 与 Widget 交替编辑同文档，分别验证 content/content、layout/layout、layout/content revision conflict；layout-only 场景只能在用户看到 currentRevision 新预览并再次确认后重放，不得后台自动 rebase；
3. 发布固定 Git tag/Release/checksum；
4. 先 canary，再 stable；stable 指向固定版本，不指 main；
5. 演练卸载、状态清理、重装和数据恢复；
6. 写下一 session handoff 和已知限制。

验收命令：

    npm run harness:check
    npm run harness:budget
    npm run test:all
    npm run build
    npm run build:plugin
    npm run test:release-candidate
    git diff --check

真实验收清单：

- Codex 原生 Widget 打开、ready、编辑、proposal、commit、send；
- 当前任务/项目绑定正确；
- Tauri 仍可独立运行；
- 跨进程冲突可理解且无丢失，layout-only/mixed 分类、受影响 ID 和人工重放路径正确；
- stable 安装、升级失败回滚、卸载重装均通过；
- 发布包无遥测/远程业务请求。

预期结果：

- 用户签署真实宿主验收；
- stable Release 可定位、可校验、可回滚；
- 状态文档、限制、下一 Gate 完整。

停止条件：

- 只有自动化通过、没有真实 Codex Desktop 证据；
- stable 依赖浮动 main/latest 未固定资产；
- 回滚需要覆盖/删除项目数据；
- Tauri 回归。

## 12. 自动化测试与真实宿主矩阵

| 层 | 必测内容 | 自动化 | 真实宿主 |
| --- | --- | --- | --- |
| host identity spike | task/workspace metadata 来源、不可由模型覆盖、reload/multi-task 稳定性 | 只读 spike schema/evidence validator | Phase 0B Codex Desktop；未过不得进入 core 重构 |
| acm-core | parse/serialize/validate/diff/ops/revision/context | Node unit + property/golden + Python parity | 不需要 |
| project store | revision/lock/temp/replace/recovery/index rebuild、layout/content conflict 分类 | 三平台文件系统与故障注入 | Tauri/插件交替写与人工重放 |
| SQLite migration | dry-run、非法文档、备份、rollback | fixture DB | 用户副本演练 |
| MCP schema | input/output/annotations/errors/limits | SDK client contract | Codex tool 列表可见性 |
| MCP runtime | stdio、task root、session、token、TTL | child process/integration | 新 task/reload/multi-task |
| Widget | resource、bridge、hydrate、ready、rebind | browser harness/mock host | Codex Desktop 原生 iframe |
| pending boundary | model write 不落正式文件 | hash guard | 人工 accept/reject |
| send | 三模式、edge whitelist、digest、click gate | contract/security | 消息确实进入当前 task |
| distribution | clean package、relative paths、checksums | clean-room CI | 未安装源码环境 |
| lifecycle | install/update/rollback/uninstall/reinstall | isolated home | 用户验收机 |
| Tauri | editor/store/import/export/build | unit/build/e2e 可行时 | 桌面 smoke |

必须保留的回归：

- npm run build；
- npm run harness:check；
- npm run harness:budget；
- ACM-MD strict validator；
- ACM-MD round-trip；
- 当前 Tauri 创建/打开/编辑/保存/导入/导出；
- 发布包内 MCP bundle reproducibility。

真实宿主测试不能被 Playwright/mock host 替代，因为 task/thread/workspace metadata、Widget instance、ui/message 和宿主重载行为只有 Codex Desktop 能证明。

## 13. 发布、升级、回滚与卸载

### 13.1 发布通道

1. 开发：repo-local plugin path，仅开发者；
2. canary：固定 Release 资产 + checksum，少量项目；
3. stable：固定语义版本和 Release，不指向 main；
4. marketplace：只有用户在 Phase 8 再次批准才创建 .agents/plugins/marketplace.json。

公开 OpenAI app/plugin directory 若要求公网生产 MCP endpoint，会与本项目“无远程业务服务”冲突，因此不属于 v1 stable 必需项。v1 可通过 Codex repo/private marketplace 分发本地 bundled MCP。未来只有官方支持和用户批准都满足时才另立计划。

### 13.2 Release 内容

- plugin source metadata；
- bundled mcp/server.mjs；
- built Widget assets；
- 构建复制的 acm-md Skill；
- manifest、版本、LICENSE/NOTICE；
- SHA-256 checksums；
- 依赖清单/SBOM；
- release notes、最低 Codex/Node/OS 版本；
- migration/rollback/uninstall runbook。

不得包含项目 .acm、SQLite 用户库、token、日志、开发绝对路径、node_modules 或凭证。

### 13.3 升级

- 启动前读取插件自身 schema version，不写项目图谱；
- user-state schema migration 先备份、可回滚；
- core 仍只支持 ACM-MD v0.1，本计划不做协议迁移；
- 新 MCP/Widget 健康检查通过才切换 session；
- 旧 Widget 立即 superseded；
- 更新前后对测试项目 .acm 做 hash 对比。

### 13.4 回滚

- stable 保留至少前一个已验证 Release；
- 插件二进制/Widget/user-state schema 可回滚；
- 项目业务文件不作为插件回滚对象；
- 若新版本已写入合法 v0.1 文件，旧版本必须能读取；否则发布被协议兼容测试阻断；
- 回滚失败时进入只读 recovery，不尝试清空或降级文档。

### 13.5 卸载与重装

- 卸载插件不删除项目 .acm 和 legacy SQLite；
- 停止 MCP/daemon，清除短期 token/session；
- 用户可选择保留或显式清理 recent/log/ui state；
- 重装从 .acm 重建，旧 task/widget binding 不复活；
- 卸载/重装测试必须验证项目 hash 不变。

## 14. 风险、待确认问题与非目标

### 14.1 风险登记

| 优先级 | 风险 | 影响 | 缓解/Gate |
| --- | --- | --- | --- |
| P0 | Codex Desktop 无稳定可信 task/workspace root 证据 | 任意路径或跨任务写入 | Phase 0B 最小只读真实宿主 spike；未过不得进入 Phase 1；Phase 4 在完整插件壳复验 |
| P0 | Agent proposal 绕过人工采纳 | 违反项目硬边界 | 模型 write 只 pending；app-only commit + user gesture + hash guard |
| P0 | SQLite 迁移/原子写丢数据 | 业务图谱损坏 | 只读迁移、严格校验、备份、revision、故障注入、单真源 |
| P1 | Widget stale instance 串线 | 写错项目/任务 | 多重 binding、单调状态、supersede、旧 instance 拒绝 |
| P1 | Windows replace/lock 与 Unix 不一致 | 半写/无法恢复 | 三平台原生测试，不假设 rename 语义 |
| P1 | core 与 Python validator 漂移 | 插件生成非规范文档 | golden parity 和协议 hash |
| P1 | Vite/Node/MCP bundle 含开发路径或缺资产 | clean install 失败 | clean-room、bundle scan、repro checksum |
| P1 | 插件更新改动项目数据 | 无法安全升级 | 更新 hash guard；项目 migration 不绑插件 update |
| P2 | 大图 Widget 性能和 MCP 输出膨胀 | 卡顿/上下文超限 | 有界 selector、虚拟化/裁剪、性能基准 |
| P2 | 敏感 ACM-MD 被 Git 提交 | 数据泄露 | 首次 Git 提示、用户选择、插件不自动 git |
| P2 | 官方 MCP Apps/插件接口演进 | 宿主兼容破坏 | 标准 ui/* 优先、能力探测、固定最低版本、canary |

### 14.2 Activation 决策记录（2026-07-14）

用户明确要求将 plan 迁移到 active，本次按计划原推荐值记录如下；这些答案授权本文对应 Phase/Gate，但本轮不启动 Phase 0：

| # | 决策 | 已批准口径 |
| --- | --- | --- |
| 1 | 路线与 lifecycle | 批准路线 C、本计划 v2 和迁入 active；解耦仅限 core/editor/adapters 模块边界，不拆远程后端、不做微服务、不推倒重写；review 通过与 activation 已分开记录 |
| 2 | AGENTS.md loopback 句 | 批准 §10.6 精确化文本；实际修改仅在 Phase 0A 按范围执行 |
| 3 | pending 本机持久化 | 批准带 task/project/doc/baseRevision/instance、短 TTL 和重新预览的用户状态缓存；不得进入项目或正式图谱 |
| 4 | 数据真源与章程 | 批准项目 ACM-MD 文件成为未来业务单真源、SQLite 退为只读迁移源、不双写；Accepted `DEC-004` 已落位，INSTRUCTIONS.md 只在 Phase 2 Gate 成功且真源实际切换时更新 |
| 5 | 测试运行器 | 批准 Phase 0 引入固定、兼容基线的 Vitest devDependency，并逐项审核 package.json 与 lockfile；禁止 no-op Gate |
| 6 | Git 跟踪 | 默认建议跟踪 `.acm/index.json` 与 `.acm/documents/*.acm.md`，但首次明确提示敏感风险，由项目用户选择；插件不改 `.gitignore`、不自动 git add |
| 7 | SQLite 迁移 | 批准一次性、只读导出、备份、无双写、可回滚策略 |
| 8 | v1 分发 | repo-local → canary → private/stable；公开目录不进入 v1，需另立计划 |
| 9 | 无可信 workspace root 时的降级 | 当前不批准任何降级，默认 fail closed；仅在 Phase 0B 取得真实证据后重新提交用户决定，模型传路径永不作为授权 |
| 10 | related/execution 语义 | 按第 9 节冻结边白名单、深度/数量上限；execution prompt 只执行显式选中 Task |
| 11 | 平台范围 | 代码和 CI 覆盖 Windows/macOS/Linux；真实宿主可 Windows canary 先行，但 stable 前补齐三平台 |

### 14.3 明确非目标

v1 不规划：

- 云同步；
- 多人实时协作；
- 远程数据库；
- 远程业务 MCP 或遥测；
- 自动执行整张图；
- 任意本地文件附件；
- 自动修改其他项目 AGENTS.md；
- 自动安装其他 Skills；
- 取代 Tauri 桌面版；
- 修改 ACM-MD v0.1 核心协议；
- 自动 git add/commit/push；
- 依赖 Canvasight 产品语义；
- 公共插件目录发布（除非另行批准并解决 local-only 冲突）。

如未来认为其中某项必须进入，必须另立 proposed plan、给出理由、风险和迁移方案，并获得用户明确批准。

## 15. 推荐 commit 拆分顺序

以下 commit 拆分用于本 active 计划实施；已完成 Phase 0A 至 Phase 4 均按 scoped local commit 闭环，后续仍只授权各 Phase 明列范围。

1. docs(governance): 记录 activation 决策并精确化 AGENTS 约束
2. test(acm): 引入获批测试运行器并固化 ACM-MD v0.1 golden corpus
3. spike(plugin): 最小只读宿主 identity 证据与 Gate 记录
4. refactor(core): 抽取 schema、parse、serialize、validate
5. refactor(core): 抽取 diff、canonical operations、revision、context selection
6. feat(storage): 增加项目 .acm store、锁、原子写和 recovery
7. feat(migration): 增加 legacy SQLite 只读迁移、rollback，并在 Gate 成功时同步 INSTRUCTIONS
8. refactor(editor): 抽 AcmEditor 与平台接口并退役 legacy operation 调用
9. refactor(tauri): 接入 project store 并保持桌面回归
10. feat(plugin): 增加 plugin manifest、bundled MCP 和安全项目绑定
11. feat(widget): 增加 MCP Apps Widget 与生命周期
12. feat(mcp): 增加 read/validate/context 工具
13. feat(mcp): 增加 pending write/import 与 app-only commit
14. feat(widget): 增加三类 send preview 和 click-gated ui/message
15. test(plugin): 增加并发、安全、三平台、clean package、repro 测试
16. docs(release): 增加发布、升级、回滚、卸载与真实宿主证据
17. chore(release): 固定 canary/stable Release 与 checksum

每个 commit 只包含本主题文件和必要测试；不得 git add -A。每个 commit 前先在权威仓库重复 Git 三项检查，提交前运行该 Phase 最小验收和 git diff --check。

## 16. 后续执行 session 接手指令

可复制给后续 session：

> 项目路径：D:\Code\agent-context-map
> 先完整读取 AGENTS.md、INSTRUCTIONS.md、PROGRESS.md、HANDOFF.md、PROJECT_MAP.md、docs/README.md，以及本计划。先执行 git rev-parse --show-toplevel、git rev-parse --git-dir、git status --short --branch，确认 top-level 为 D:/Code/agent-context-map、Git dir 为项目内 `.git`。
> 不要把 proposed plan 或 review 当成实现授权。先确认本计划已独立评审、用户明确批准、进入 active 生命周期，并核对第 14.2 节用户决策。未满足就只做 planning/review，不改源码。
> 获准后从 Phase 0A/0B 开始，不能跳过 Gate。Phase 0B 必须先用隔离的只读 stdio MCP 在真实 Codex Desktop 证明可信 task/workspace identity；未通过不得进入 Phase 1。每次只执行一个 Phase；按该 Phase 列出的输入、文件、命令、预期结果和停止条件验收。任何 P0 Gate 失败立即停止，记录证据，不自动修复或扩大范围。
> 始终保持 ACM-MD v0.1、Tauri 不退役、项目 ACM-MD 单真源、Agent proposal pending-only、可信 task/project binding、expectedRevision、原子写、用户点击 send、无远程业务服务/云数据库/遥测。模型不得传任意 projectPath 获权。
> Phase 2 只有在数据真源 Accepted 决策已落位且迁移 Gate 全过时才能切换业务真源，并在同一 Phase 同步 INSTRUCTIONS.md；不得提前把目标架构写成当前事实。operations.js camelCase schema 是唯一增量操作模型，legacy snake_case 必须按计划限期退役。
> 每个 Phase 结束更新 PROGRESS.md/HANDOFF.md 和计划生命周期索引，记录实际命令、结果、失败与下一 Gate；只暂存明确相关路径，不 commit/push，除非用户在该 session 明确授权。

## 17. 调查来源

项目内来源：

- AGENTS.md、INSTRUCTIONS.md、PROGRESS.md、HANDOFF.md、PROJECT_MAP.md、README.md、CLAUDE.md、docs/README.md；
- package.json、vite.config.js；
- src/App.jsx、src/acm/data.js、src/acm/agentClient.js、src/acm/FlowCanvas.jsx、src/acm/Panels.jsx；
- src/storage/store.js、src/storage/files.js；
- src-tauri/src/lib.rs、src-tauri/capabilities/default.json、src-tauri/tauri.conf.json、src-tauri/Cargo.toml；
- skills/acm-md/SKILL.md、skills/acm-md/references/acm-md-v0.1.md 和严格校验器。

外部只读来源（调查日期 2026-07-14；v2 修订时通过最新 Codex Manual 缓存再次核对插件、app 与 MCP 章节）：

- OpenAI Codex：Build plugins
  https://learn.chatgpt.com/docs/build-plugins
- OpenAI Codex：Build an app
  https://learn.chatgpt.com/docs/build-app
- OpenAI Codex：MCP
  https://learn.chatgpt.com/docs/extend/mcp
- OpenAI Apps SDK：Build an MCP server
  https://developers.openai.com/apps-sdk/build/mcp-server
- OpenAI Apps SDK：Build your ChatGPT UI
  https://developers.openai.com/apps-sdk/build/chatgpt-ui
- OpenAI Apps SDK：MCP Apps compatibility
  https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
- OpenAI Apps SDK：Reference
  https://developers.openai.com/apps-sdk/reference
- OpenAI Apps SDK：Security & Privacy
  https://developers.openai.com/apps-sdk/guides/security-privacy
- Canvasight 参考仓库与插件目录（只读，pin 469a5a777392ba54b826046332c1af654c4d0704）
  https://github.com/Niall-Young/Canvasight
  https://github.com/Niall-Young/Canvasight/tree/main/plugins/canvasight

官方 MCP Apps 当前推荐以 _meta.ui.resourceUri 和 ui/* JSON-RPC bridge 为标准路径，tools/call 用于 Widget 调工具，ui/message 用于发送 follow-up；window.openai 只作为可选兼容扩展。工具 annotations 只是宿主提示，不能替代 server 授权。安全设计遵循最小权限、显式用户同意、服务端输入校验、写操作人工确认和最小化 structuredContent。

v2 复核确认官方 Codex Manual 公开说明了 repo-local marketplace、bundled MCP、STDIO server 与项目级 MCP 配置，但没有建立“插件 server 必然收到不可由模型伪造的当前 task/workspace identity”这一可直接引用的稳定契约。因此本计划不把文档缺口当作能力存在证据，改由 Phase 0B 的真实宿主只读 spike 决定是否允许后续写路径；这是基于官方资料缺口作出的保守推论。

---

本 Plan 已通过 review-002 并由用户明确激活。仓库 cache-key defect 已由 immutable rc.4 关闭；rc.4 安装、完全重启与全新 task A1 已完成，并证明 Codex Desktop 没有请求合法 UI resource。Phase 8 因 host resource discovery/read Gate 失败而 Stopped；下一闸门是 OpenAI host 反馈或宿主修复，而不是新的 repo candidate。push、tag、GitHub Release 与 stable 均不推进。
