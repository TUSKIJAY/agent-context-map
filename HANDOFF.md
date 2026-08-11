# Handoff

更新时间：2026-08-11

## Resume Point / 接手点

**Visual Spec Artifact Renderer** 已激活，Phase 0 尚未开始；本 session 只完成 plan/review/状态治理，没有修改运行时代码。

- Active plan：`docs/exec-plans/active/02-visual-spec-artifact-renderer.md`
- Final reviews：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/review-006.md`（Grok approve/high）与 `review-007.md`（Claude approve/high）
- 当前分支：`codex/project-harness-governed` @ `37ace47`
- Reviewed candidate SHA-256：`9186323ecb9d72fa2b5140587818fef0229bebeb0ff0e041ea68204c1b63056c`
- Post-review user amendment：撤销 Codex 账户额度前置约束；产品范围和 Phase Gate 不变

## Confirmed Direction

- 当前单体分支是实施基线；远程 pluginization 只点采，禁止整支 merge。
- P1 静态目录、P3 单文件；Viewer 为默认主路径，旧编辑器为显式 lazy-loaded 次路径。
- Artifact 构建时嵌入 Spec；P1 不提供运行时本地 `.acm.md` picker。
- Dependency 主边含 `depends_on`、`requires`、`constrains`、`conflicts_with`；`impacts` 为可隐藏辅助边。
- 当前分支没有可归档的 active plugin plan，生命周期处理为 N/A。

## Orca Execution Contract

- Orca 1.4.180；本机有 Codex 0.147.0、Grok 1.0.0、Claude Code 2.1.224、Kimi 0.31.0。
- 一个 Codex Goal writer/coordinator；每 Phase 冻结 revision 后由至少两名非 Codex CLI 独立审核。普通实现方向、修复、review 选择与验收不再请求用户微确认。
- 用户允许长时间运行；Goal 无账户额度前置条件。
- local Phase commit 只在该 Phase 验收后按 plan 执行；activation 文档当前未 commit。push、PR、merge、tag、Release 仍无授权。

## Blocker

无已知阻塞。

## Next Gate / 单一下一步

在当前 Orca worktree 创建 Codex Goal，使用 active plan §7.5 的 objective，从 Phase 0 开始；先冻结 exact HEAD、工作树状态和 activation 文档基线，再进入 spike。

## Last Verification

- account-quota 约束修订后的 harness、8/8 unittest、startup budget 与 `git diff --check` 已通过。
- 未运行 `npm run build`：本次没有修改 `src/`、`src-tauri/`、`index.html`、`package.json` 或 `vite.config.js`。
- 未运行 Windows canary、插件安装或任何远程 Git/发布动作。
