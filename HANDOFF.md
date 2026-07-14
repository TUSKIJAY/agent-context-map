# HANDOFF

更新日期：2026-07-14

当前焦点：插件化 active plan 的 Phase 0A 已完成；下一步只能执行 Phase 0B 真实 Codex Desktop host-binding spike，Gate 未过不得进入 Phase 1。

## Resume Point

- 权威仓库：`D:\Code\agent-context-map`，项目内普通 `.git/`，分支 `codex/agy_agent`，origin `https://github.com/TUSKIJAY/agent-context-map.git`。
- active plan：`docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md`；review-002 = approve；用户于 2026-07-14 批准。
- Phase 0A 已完成：
  - AGENTS.md 已落位获批的 loopback MCP 与 pending 本机缓存精确化；
  - DEC-004/005/006/007 分别冻结数据真源、host identity、single stdio MCP 默认值和 SQLite 只读迁移；
  - 固定 `vitest@3.2.7`，建立合法/非法 ACM-MD、round-trip、Agent confirmed 降级、SQLite v1 和 distribution baseline；
  - Phase 0A 全部自动化 Gate 通过。
- 当前没有创建产品插件、core/editor 重构、项目 store、数据迁移或 `.acm` 写路径。

## Current Repository Facts

- top-level：`D:/Code/agent-context-map`
- git-dir：`.git`
- upstream：`origin/codex/agy_agent`
- HEAD / ahead：接手时重新运行 Git 三项检查，不从本页静态数字推断
- push：未获授权
- 当前计划状态：Phase 0A complete；Phase 0B next

## Phase 0A Verification

已运行并通过：

```powershell
npm run test -- --run tests/baseline
npm run test:distribution
npm run build
npm run harness:check
npm run harness:budget
python skills/acm-md/scripts/validate_acm_md.py tests/fixtures/acm-v0.1/valid-basic.acm.md --mode strict
git diff --check
```

结果：baseline 4 files / 8 tests；distribution 1 test；Vite build 295 modules，仅保留既有大 chunk warning；ACM-MD strict validation、harness、budget、diff 全通过。

依赖审核：最初候选 Vitest 3.2.4 命中 critical advisory，已改为固定 3.2.7。`npm audit` 仍有现有 Vite 5 / esbuild 的 1 high + 1 moderate advisory，修复要求 major upgrade，本 Phase 未扩大范围且未运行 `audit fix --force`。

## Governance Boundary

- ACM-MD v0.1 不变；正式规范仍只在 `skills/acm-md/references/acm-md-v0.1.md`。
- pending proposal 仍不得进入项目、正式图谱、保存、导出或 Agent Diff；本机缓存也必须短 TTL、完整 binding 和重新预览。
- 模型参数、插件 cwd、最近项目或任意绝对路径不能成为项目授权来源。
- 自动 commit 只包含当前可证明范围；push 仍须用户在当前任务明确确认。

## Blockers And Risks

- P0 风险尚未裁决：Codex Desktop 是否向 bundled stdio MCP 提供不可由模型覆盖的 task/workspace identity。官方手册未承诺该字段，必须以 Phase 0B 真实宿主证据为准。
- 若 Phase 0B 结论为 `trusted_native_picker_required` 或 `unavailable`，必须立即停止，记录证据并保持计划 active/blocked；不得用 mock 或模型路径参数继续 Phase 1。
- Vite 5 audit advisory 需在后续获授权依赖升级范围内解决，不影响本地 production build，但影响 dev-server 安全基线。

## Next Gate

1. 使用 plugin-creator 约束在 `spikes/codex-host-binding/` 建最小 repo-local plugin、bundled read-only stdio MCP、schema tests 和 evidence validator。
2. 验证 spike 不引用业务 core/editor/SQLite，不读取或写入 `.acm`，运行前后测试项目 hash 不变。
3. 在真实 Codex Desktop 记录 new task、reload、第二 task、多 workspace root、伪造 `projectPath/threadId/root` 的脱敏协议证据。
4. 只在结论为 `trusted_host_identity` 时进入 Phase 1；否则按 plan 停止。

## History

迁移前稳定历史见 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；冻结 `doc/` 仅可只读回查。
