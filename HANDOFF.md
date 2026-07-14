# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 2 已完成；下一步执行 Phase 3 editor 与 platform adapters 解耦并保持 Tauri 回归。

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

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 2 scoped commit；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 2 complete；Phase 3 next

## Phase 2 Verification

已运行并通过：

```powershell
npm run test:project-store
npm run test:concurrency
npm run test:atomic-recovery
npm run test:sqlite-migration
npm run test:acm-roundtrip
npm run build
cargo test --manifest-path src-tauri\Cargo.toml --lib
npm run tauri:build -- --no-bundle
git diff --check
```

结果：专项 23 tests；Rust 3 tests；20 路同 revision 竞争只有 1 次提交、其余 100% conflict；故障点前后只保留完整原文或完整新文；SQLite 原库 hash 不变、非法批次不写入、失败 apply 可 rollback；JS 迁移候选同时通过 Python strict validator；Vite 308 modules；Tauri release executable 构建成功。

关键实现：

- `packages/project-store/src/project-store.js`：truth scan、revision、write/delete、index rebuild。
- `packages/project-store/src/locks.js` 与 `src-tauri/src/project_store.rs`：相同 canonical root + SHA-256 lock filename 协议；锁/临时文件不自动清理。
- `src/storage/tauriProjectStore.js`：native picker、严格解析、旧 bytes 前置条件、冲突暂停、迁移逐份确认。
- `tests/project-store/source-switch.test.js`：静态证明产品不再注册 SQLite write backend/capability。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- `.acm/documents/*.acm.md` 是唯一业务内容真源；index、UI state、浏览器 demo、legacy SQLite 和 pending proposal 都不能覆盖它。
- pending proposal 仍不得进入项目、正式图谱、常规保存、导出或 Agent Diff。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前 Phase；push 仍须用户在当前任务明确确认。

## Risks

- Phase 4 必须在产品 MCP 生命周期复验 DEC-005 host identity；字段漂移即 fail closed。
- legacy snake_case operations 仍只在显式 adapter 接受；Phase 3 必须迁移产品调用方，Phase 6 必须拒绝 legacy 名称。
- Windows safe replace 已原生执行；portable tests 已建立，macOS/Linux 真实矩阵留在计划 Phase 7，不把它写成已运行证据。
- Vite 5 / esbuild audit advisory 仍待单独获批 major upgrade；不得 `audit fix --force`。

## Next Gate

1. 抽 `packages/acm-editor` 的 AcmEditorShell 与 document controller。
2. 将 Tauri/Browser store、file、export、Agent capabilities 在 composition root 注入，editor 不再自发现 `window.__TAURI_INTERNALS__` 或 SQLite。
3. FlowCanvas/Panels 保持 pending-only；产品内部 operations 全部迁到 canonical camelCase。
4. 运行 `acm-editor`、import-boundaries、Vite、Tauri、harness 和 diff Gate。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
