# HANDOFF

更新日期：2026-07-14

交付规则（覆盖本页下方规则生效前的旧提交描述）：每个仓库修改任务在验收和状态同步后自动创建 scoped local commit；每次 `git push` 仍需用户明确确认。本轮规则已形成未 push 的最新本地提交；旧 HEAD/ahead 数字以当前 Git 命令为准。

当前焦点：governed harness retrofit 收尾与分支同步决策

## Resume Point

项目已从“只有 `AGENTS.md` + 长篇 `HANDOFF.md`”增量改造成可重启的 governed harness。改造与验证已完成，当前变更尚未 commit 或 push。

源码基线：

- 分支：`codex/agy_agent`
- HEAD：`154bf75 feat(agent): 接入 agy CLI 协作建议桥`
- `origin/codex/agy_agent`：`077dbec`
- harness 改造前工作区：干净

最近产品状态：

- `077dbec` 已接入 Agent 协作前端、agy SDK 适配和 mock fallback。
- `154bf75` 已在 Tauri 端加入 `request_agent_patch` 命令，通过本机 agy CLI 生成建议 patch。
- pending patch 仍是 view state；未采纳前不进入正式 ACM-MD 数据或导出。

## Harness Change Scope

本轮新增或更新：

- 入口与稳定状态：`AGENTS.md`、`INSTRUCTIONS.md`、`PROGRESS.md`、`HANDOFF.md`、`PROJECT_MAP.md`。
- 机器配置与校验：`.harness/config.json`、`scripts/check-project-harness.py`、`scripts/check-startup-doc-budget.py`。
- 治理层：`docs/README.md`、`docs/exec-plans/`、`docs/decisions/`、`docs/optimization/`、`docs/progress-archive/`。
- npm 入口：`harness:check`、`harness:budget`、`harness:validate`。

保留边界：

- `doc/` 仍是被忽略的本地产品过程资料，不迁移、不删除。
- 没有把任何旧 `doc/` 计划自动标成 active。
- 没有改动产品源码或 ACM-MD 协议。

## Verification

本轮自动 commit 规则变更验证：harness skill 100/100、critical failures 0；`npm run harness:check`、`npm run harness:budget`、`git diff --check` 全部通过。该规则变更应形成独立 scoped local commit，不 push。

已运行：

```powershell
npm run harness:check
npm run harness:budget
npm run build
git diff --check
```

结果：

- Harness 结构：通过，governed 必需文件全部存在，config/profile 一致。
- 启动文档预算：通过，无文件触发 archive 或 hard limit。
- Skill 结构评分：最终 100/100，critical failures 0。
- Vite production build：通过，295 modules transformed；仅有既有大 chunk warning。
- Diff whitespace：通过。

## Blockers And Risks

- 当前无技术阻塞。
- 当前分支的 `154bf75` 尚未出现在 `origin/codex/agy_agent`；不要把“harness 未提交”和“既有源码提交未推送”混成同一个事实。
- `doc/` 与 `docs/` 职责不同：前者是本地产品过程资料，后者是被跟踪的治理控制面。
- 任何 Agent/agy 建议都不得绕过人工采纳边界。

## Next Gate

1. 核对本轮验证结果和 diff，仅保留 harness 范围。
2. 用户决定是否提交，以及是否推送 `codex/agy_agent`。
3. 后续若启动多 phase 产品改造，先在 `docs/exec-plans/proposed/` 起草并完成 review/approval/activation；窄范围直接请求按用户明确授权执行。

## History

改造前长篇交接的稳定摘要已迁入 `docs/progress-archive/2026-06-to-2026-07-pre-harness-history.md`；更细证据仍可从 Git 历史和本地 `doc/` 记录回查。
