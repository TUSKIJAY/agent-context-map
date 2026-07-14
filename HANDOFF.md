# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 1 已完成；下一步执行 Phase 2 项目 `.acm` 文件真源与 SQLite 迁移兼容。

## Resume Point

- 权威仓库：`D:\Code\agent-context-map`，项目内普通 `.git/`，分支 `codex/acm-pluginization-plan`，origin `https://github.com/TUSKIJAY/agent-context-map.git`；该分支尚无 upstream。
- active plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`；review-002 = approve；用户于 2026-07-14 批准。
- Phase 0A/0B 已完成：
  - Phase 0A 固定决策与 baseline，提交 `8162e6e`；
  - Phase 0B 在 `spikes/codex-host-binding/` 建立最小 repo-local plugin、只读 stdio MCP、6 个自动化 tests 和脱敏 Gate report；
  - Codex Desktop new task、same-task follow-up、second task、cachebuster reload 与伪造 identity args 均验证；最终 Gate = `trusted_host_identity`；
  - 单一 host workspace 可绑定；多 workspace 候选只返回 `trusted_native_picker_required`，缺任一 task/root 证据均 `unavailable`。
- Phase 1 已完成：
  - `packages/acm-core/src/` 是 platform-free 协议核心，公共入口为 `index.js`；
  - strict parse、确定性 serialize、JS/Python validator parity、Diff、canonical camelCase `op`、legacy input adapter、SHA-256 revision 与 context 裁剪已覆盖；
  - `src/acm/data.js` 保留 UI 词表/布局与兼容包装，现有 legacy pending UI 行为未回退；
  - 尚未创建项目 store、执行 SQLite 迁移或切换业务真源。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：未设置
- HEAD：Phase 1 scoped commit；接手时以 `git log -1 --oneline` 实测
- push：未获授权
- 当前计划状态：Phase 1 complete；Phase 2 next

## Phase 1 Verification

已运行并通过：

```powershell
npm test -- --run acm-core
npm run test:acm-roundtrip
npm run test:acm-validator-parity
npm test -- --run
npm run build
npm run tauri:build -- --no-bundle
npm run harness:check
npm run harness:budget
git diff --check
```

结果：acm-core 3 files / 16 tests；全仓 9 files / 31 tests；JS/Python strict parity 8 fixtures；core 生成的 round-trip bytes 经 Python strict stdin 验证；Vite 306 modules；Tauri release executable 构建成功。静态 Gate 证明 core 不导入 React/Tauri/Dagre/ELK/SQLite/fs/path/crypto，也不访问 window/document/localStorage。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- pending proposal 仍不得进入项目、正式图谱、保存、导出或 Agent Diff；本机缓存也必须短 TTL、完整 binding 和重新预览。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前可证明范围；push 仍须用户在当前任务明确确认。

## Blockers And Risks

- DEC-005 的 Phase 0B evidence Gate 已满足，但 Phase 4 仍须在产品 MCP 中复验；字段漂移即 fail closed 并重开 ADR。
- legacy `add_node/update_node/add_edge` 只在显式 adapter 接受并产生 deprecation diagnostics；core 与新调用方只产出 `op: addNode/updateNodeFields/addEdge/...`。Phase 3 必须迁移现有 UI 调用方，Phase 6 必须拒绝 legacy 名称。
- Vite 5 audit advisory 需在后续获授权依赖升级范围内解决，不影响本地 production build，但影响 dev-server 安全基线。

## Next Gate

1. 建 `.acm/index.json`、`.acm/documents/*.acm.md` 与 platform adapter；index 只作可重建 cache。
2. 实现 canonical SHA-256 revision、expectedRevision、document lock、temp/safe replace、crash recovery 与 conflict classification。
3. 实现 SQLite read-only migration preview/backup/validate/apply/rollback；不得双写，未过 Gate 不更新 `INSTRUCTIONS.md` 的当前真源事实。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
