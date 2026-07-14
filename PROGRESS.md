# Progress

## Current Snapshot

- 更新日期：2026-07-14
- 唯一权威工作目录：`D:\Code\agent-context-map`
- Git dir：项目内普通 `.git/`
- 当前分支：`codex/acm-pluginization-plan`；upstream `origin/codex/acm-pluginization-plan`
- 当前 HEAD：`f43f7e5` Phase 7 remote-CI corrections；第二轮 Windows 慢文件系统测试预算修复在当前工作区，待 scoped commit/push
- Harness profile：`governed`
- Active exec plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`
- 当前 Phase：Phase 7 in progress；第二轮 macOS、Ubuntu 与 clean-room 全绿；Windows 全部语义断言已过，仅 20 路文件锁用例以 5.26 秒越过 Vitest 默认 5 秒，专属 20 秒测试预算待第三轮验证

## Navigation

| Need | Location |
| --- | --- |
| 入口规则 | `AGENTS.md` |
| 稳定项目事实 | `INSTRUCTIONS.md` |
| 最新恢复点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限 | `docs/README.md` |
| 计划生命周期 | `docs/exec-plans/roadmap.md` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 7 本地候选已完成：`0.3.0-rc.1`、Node 24.12.0/npm 11.6.2、checksums/SBOM、clean-room、source-free 启动和隔离 HOME 生命周期 Gate 全通过。
- Phase 7 当前只剩提交并推送 Windows CI 测试预算修复、确认第三轮 Windows/macOS/Linux workflow 全绿；任一 runner 未绿前不得进入 Phase 8。

## Blocked

- Phase 7 第二轮远端 run `29324813249`：macOS、Ubuntu、clean-room 全绿；Windows 105 项中 104 通过、1 项仅因 20 路真实文件锁竞争耗时 5.26 秒超过默认 5 秒，产品锁与断言无失败。测试专属预算修复尚未推送。
- Phase 2 已在本机 Windows 完成 Node/Rust same-volume replace、故障注入和 Tauri release build；macOS/Linux 原生矩阵现由 Phase 7 workflow 承担，不把尚未运行的平台伪装为当前证据。
- `npm audit` 仍报告现有 Vite 5 / esbuild 的 1 high + 1 moderate dev-server advisory，修复要求 Vite major upgrade；本 Phase 未执行 `audit fix --force`。
- Node 24 的 `node:sqlite` 仅用于迁移 fixture 自动化并会发 experimental warning；发布产品使用 Rust `sqlx read_only(true)`，不依赖 Node SQLite runtime。

## Completed

- [x] 2026-07-14 — Phase 7 本地 RC：固定插件 `0.3.0-rc.1` 和 Node 24.12.0/npm 11.6.2；生成 13-file source-free release、SHA-256 checksums、deterministic manifest、依赖清单与 CycloneDX SBOM，release tree SHA-256 `accbb6f7f89c687bd4d052025f7697284c0823e942893df62d7adfbd1bc1b775`。
- [x] 2026-07-14 — Phase 7 本地 Gate：Windows 38 files / 105 tests（POSIX-only 1 skipped）；原生 junction/独占锁、隔离 HOME fresh/update/downgrade/uninstall/reinstall、`.acm` hash guard 和 plugin validator 通过。
- [x] 2026-07-14 — Phase 7 clean-room：不复制 `.git`、`node_modules`、源码生成物或 dist，从隔离副本完成 `npm ci`、全测、Vite build、固定包与两次 bundle；三平台 workflow 已建立但远端 runner 未执行，故 Phase 7 本身未完成。
- [x] 2026-07-14 — Phase 7 Linux 本地 Gate：Ubuntu WSL 固定 Node 24.12.0/npm 11.6.2，POSIX symlink/permission 与 38 files / 105 tests 通过；修复 Python 命令选择、test-mode JSX 绝对源码路径泄漏和 toolchain 未强制问题，Windows/Ubuntu release tree hash 一致。
- [x] 2026-07-14 — Phase 7 首轮远端诊断：run `29324137580` 的 Ubuntu platform/clean-room 通过；CI 固定 Python 3.13.5 + PyYAML 6.0.3，distribution fixture 改由真实 release CLI 子进程构建；本地 38 files / 105 tests、RC、clean-room、Vite、harness 与 diff check 通过。
- [x] 2026-07-14 — Phase 7 第二轮远端诊断：run `29324813249` 的 macOS、Ubuntu、clean-room 全绿；Windows 已通过 PyYAML、release CLI、junction/locked file 与 104 项测试，唯一失败是文件锁竞争用例 5.26 秒越过 Vitest 默认 5 秒；产品 2 秒 lock timeout 不变，仅为磁盘并发测试设置 20 秒预算。
- [x] 2026-07-14 — Phase 6：模型可见 get/validate/write/import/export 与 app-only commit/manual-edit/send 全部落位；write/import 只生成 15 分钟 pending proposal，正式写入必须由当前 Widget 实例的一次性人工 gesture 触发。
- [x] 2026-07-14 — Phase 6 安全边界：canonical camelCase only、operation 数量/体积上限、锁内 expectedRevision、task/project/document/instance 绑定、idempotency、prompt-injection 和 stale proposal/revision/gesture 全部 fail closed；server 重建 context payload 与 digest。
- [x] 2026-07-14 — Phase 6 Gate：专项 16 tests、全仓 36 files / 101 tests；标准宿主完成预览不发送、二次确认后仅发送一次以及 proposal 人工采纳；Widget SHA-256 `abc2e2e4b55e19961748877e6e1ee9eb559e3da01636f0c3c9c044be8ab6f4e0`，MCP Release 可复现 SHA-256 `4ddc0e0c6cb576d254bc1763c0c64b7432bf50e3f3963a38316cb3e3604e1f52`；Vite、Tauri executable/MSI/NSIS、distribution、harness 与 diff check 通过。
- [x] 2026-07-14 — Phase 5：构建 self-contained MCP Apps Widget，复用 `acm-editor`；标准 `ui/*` bridge、兼容 fallback、ephemeral working copy、openAttempt/widgetInstance/rebind/supersede 和 React/项目/画布首帧 ready proof 落位。
- [x] 2026-07-14 — Phase 5 真实 Gate：Playwright 标准宿主渲染 2 nodes/1 edge 并完成编辑，console/localStorage 均为零；产品 Codex 临时 canary 证明 open success 不等于 ready、无 Widget 时 await 保持 false，测试 `.acm` hash 不变。
- [x] 2026-07-14 — Phase 5 Gate：Widget 3、lifecycle 1、rebind 2、bundle policy 1、distribution 3、全仓 29 files / 88 tests；Widget SHA-256 `ef20b5144c7edab1045d581403d70a9cb4ccc37a3a54fc37f3aa86929e55a527`，MCP Release 可复现 SHA-256 `a0e0776bd80f19542f6b4dbeb4bd8b2b8f5d87a6fdf9dc6a8a19538f0e1fbbe4`；Vite、Tauri executable/MSI/NSIS、plugin validator、harness 与 diff check 通过。
- [x] 2026-07-14 — Phase 4：以标准 `.codex-plugin/plugin.json`、`.mcp.json` 和自包含 `mcp/server.mjs` 建立正式 local-only 插件包；发布包包含构建复制的 `acm-md` skill 和 MCP Apps UI resource 占位。
- [x] 2026-07-14 — Phase 4 安全边界：只接受 host-owned task/workspace 元数据与 MCP roots 的单根交集；伪造 identity 参数、缺失/多 root、旧 task rebind、traversal、absolute path、symlink/junction 和 Windows 保留设备名全部 fail closed。
- [x] 2026-07-14 — Phase 4 真实宿主与拓扑 Gate：临时安装产品插件后用 3 个独立 Codex task、remove/reinstall reload 和额外 writable dir 重放；项目 fingerprint 稳定、session 隔离、`.acm` 未修改；DEC-005/006 确认为单 bundled stdio MCP，无 daemon/listener/token。
- [x] 2026-07-14 — Phase 4 Gate：MCP schema 3、runtime 2、binding 4、path security 10、distribution 3、全仓 24 files / 81 tests 通过；clean package 可独立启动，8 个 Release 文件两次构建 SHA-256 一致；plugin validator、Vite 317 modules、harness 与 diff check 通过。
- [x] 2026-07-14 — Phase 3：抽出 platform-free `packages/acm-editor`、document controller 和能力 contracts；Desktop composition root 注入 Tauri/Browser store、files、Agent、export 与 host capabilities。
- [x] 2026-07-14 — Phase 3 边界收敛：editor 依赖闭包不含 Tauri/SQLite/宿主全局发现；FlowCanvas 使用 export adapter；pending proposal 与正式 Diff 分栏；产品 Agent operations 全部改为 camelCase，legacy 仅保留显式 diagnostics adapter。
- [x] 2026-07-14 — Phase 3 Gate：editor 4 files / 7 tests、import-boundaries 4 tests、全仓 19 files / 60 tests、Vite 317 modules、Tauri release bundle、harness 与 diff check 全通过；桌面 smoke 覆盖项目绑定、新建/打开/编辑/撤销/重做/校验/Diff/保存/重开。
- [x] 2026-07-14 — Phase 2：新增 `packages/project-store`，实现项目 `.acm` 扫描、strict validation、canonical SHA-256 revision、expectedRevision、公平锁、跨进程 lock file、幂等 mutation、same-directory temp/safe replace、recovery evidence 和可重建 index。
- [x] 2026-07-14 — Phase 2 真源切换：Tauri 正式存储改为用户原生选择的 `.acm/documents/*.acm.md`；移除 SQL write backend、`tauri-plugin-sql` 依赖和全部 SQL capabilities；浏览器 localStorage 明示 isolated demo。
- [x] 2026-07-14 — Phase 2 迁移：legacy SQLite 使用只读 preview、JS/Python strict validation、round-trip、用户状态目录 backup、逐文档确认与 rollback；原库不删除、不双写。
- [x] 2026-07-14 — Phase 2 Gate：专项 23 tests、Rust 3 tests、Vite 308 modules、Tauri release `--no-bundle`、source-switch static Gate 与 `git diff --check` 全通过；同步实施 DEC-004/DEC-007 和 `INSTRUCTIONS.md`。
- [x] 2026-07-14 — Phase 1：新增 platform-free `packages/acm-core`，抽取 schema/model/strict parse/deterministic serialize/validator/diff/canonical operations/revision/context/pending；`src/acm/data.js` 收敛为 UI 兼容入口。
- [x] 2026-07-14 — Phase 1 Gate：core 16 tests、全仓 31 tests、JS/Python strict parity 8 fixtures、generated round-trip Python strict、Vite build、Tauri release `--no-bundle` 与静态 platform-import Gate 全通过。
- [x] 2026-07-14 — Phase 0B：隔离 repo-local plugin + dependency-free read-only stdio MCP；真实 Desktop 多 task/reload/伪造参数场景通过，Gate = `trusted_host_identity`。
- [x] 2026-07-14 — Phase 0A：DEC-004 至 DEC-007、固定 Vitest 3.2.7、ACM-MD / Agent boundary / SQLite v1 / distribution baseline 全部落位并通过 Gate。
- [x] 2026-07-14 — 用户批准 plugin plan v2 并迁入 active；review-002 = approve；权威仓库迁至 `D:\Code\agent-context-map`。
- [x] 2026-07-14 — governed harness、docs-only 治理和自动 scoped local commit 规则完成。
- [x] 2026-06-09 — agy SDK 前端适配与 Tauri/agy CLI bridge 已完成于本地提交 `077dbec`、`154bf75`。

## Next

1. 创建 Windows 慢文件系统测试预算 scoped local commit。
2. 将已获授权的 `codex/acm-pluginization-plan` 推送到 origin 并观察第三轮 `Plugin Release Candidate` workflow。
3. Windows/macOS/Linux matrix 全绿后记录 run URL/结论，标记 Phase 7 complete；任一差异按停止条件修复后重跑。
4. 只有 Phase 7 完成后才进入 Phase 8 真实 Codex Desktop canary、固定 tag/Release 和 stable 交接。

## Recent Log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-07-14 | Phase 7 第二轮只剩 Windows 测试预算差异 | run 29324813249；macOS/Ubuntu/clean-room green；Windows 104 passed + one 5.26s timeout |
| 2026-07-14 | Phase 7 首轮远端差异已复现并本地关闭 | run 29324137580；Ubuntu/clean-room green；Python/PyYAML pin；release CLI fixture；105 tests + clean-room |
| 2026-07-14 | Phase 7 local RC 就绪，remote matrix pending | Windows + Ubuntu WSL 各 105；clean-room npm ci；native filesystem；RC checksums/SBOM |
| 2026-07-14 | Phase 6 pending commit 与 click-gated send 完成 | MCP/context/security/concurrency 16；全仓 101；标准宿主二次确认；Tauri bundles |
| 2026-07-14 | Phase 5 native Widget 与 lifecycle 完成 | standard-host browser replay；Codex canary await Gate；Widget/lifecycle/rebind/policy；88 tests；Tauri bundles |
| 2026-07-14 | Phase 4 plugin/MCP control plane 完成 | product plugin host replay；schema/runtime/binding/path/distribution；reproducible clean bundle |
| 2026-07-14 | Phase 3 editor/platform adapters 解耦完成 | editor 7、import-boundaries 4、全仓 60；Vite 317；Tauri release bundle；桌面 smoke |
| 2026-07-14 | Phase 2 项目文件单真源与 SQLite 只读迁移完成 | project-store 23 tests；Rust 3；Vite 308；Tauri release；DEC-004/007 implemented |
| 2026-07-14 | Phase 1 acm-core 协议等价完成 | `packages/acm-core/`；core 16、全仓 31、parity 8；Tauri release build |
| 2026-07-14 | Phase 0B trusted host identity Gate 通过 | `spikes/codex-host-binding/evidence/gate-report.json`；6 spike tests |
| 2026-07-14 | Phase 0A baseline 与 ADR 完成 | DEC-004 至 DEC-007；Vitest 3.2.7；完整 Gate |

## Archive Policy

详细历史见 `docs/progress-archive/`；本页只保留当前状态、短日志和索引。
