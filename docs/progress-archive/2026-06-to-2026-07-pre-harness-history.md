# 2026-06 To 2026-07 Pre-Harness History

本页提炼 2026-07-14 harness retrofit 前的根 `HANDOFF.md`。它是历史检索入口，不覆盖 `PROGRESS.md` 和 `HANDOFF.md` 的当前状态。

## Product Milestones

1. 建立 ACM-MD v0.1 图谱编辑器、校验、Diff 和多格式导出。
2. 接入本地持久化、开始页、文件操作与 Tauri 绿色版交付路径。
3. 将画布迁移到 React Flow，并完成 Dagre 内容尺寸估算、子树折叠。
4. 引入 ELK 动态布局、正交边、按模块/类型分组与组级折叠；这些能力保持派生视图状态，不污染协议数据。
5. 在 `077dbec` 完成 Agent 协作建议 UI、agy SDK 适配与 mock fallback。
6. 在 `154bf75` 完成 Tauri `request_agent_patch` 命令和 agy CLI bridge。

## Durable Boundaries

- ACM-MD v0.1 是正式数据契约。
- 折叠、分组、布局引擎、边折点和 Agent pending patch 不写入正式图谱或导出。
- Agent 建议必须人工采纳；推断内容不能直接成为 `confirmed`。
- 桌面能力必须保留浏览器开发 fallback，构建产物不入 Git。

## Evidence Pointers

- 改造前完整根 handoff：`git show 077dbec:HANDOFF.md`。
- 复杂图谱可读性主线：`e2b537c`、`0e3299f`、`980bc32` 至 `2d570d4`。
- Agent 前端/SDK：`077dbec`。
- agy CLI bridge：`154bf75`。
- 本地详细计划、评审和旧 handoff：`doc/`（被 Git 忽略）。

## Superseded Resume Advice

原 handoff 顶部仍写着“下一步对接 agy SDK”以及早期未提交文件列表；这些状态已被 `077dbec` 与 `154bf75` 取代。当前恢复点只看根 `HANDOFF.md`。
