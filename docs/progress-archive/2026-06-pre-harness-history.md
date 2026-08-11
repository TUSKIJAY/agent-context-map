# 2026-06 Pre-Harness Product And Layout History

本页归档改造前 `HANDOFF.md` 中的长期项目历史。它用于证据回查，不覆盖 `PROGRESS.md` 的当前状态，也不授权继续任何后续方向。

## Source Baseline

- 来源：`main` commit `2d570d4` 中的 `HANDOFF.md`。
- 原 handoff 更新日期：2026-06-05；其后 `main` 以 `2d570d4` 完成 C+D 合并状态收尾。
- 当时工作区记录为干净，布局可读性任务已完成。

## Task 1 — Lightweight Layout And Subtree Folding

以下提交已进入 `main`：

1. `e2b537c` — 加固 `validateDoc`，统一 DataEntity id 前缀为 `data`。
2. `0e3299f` — 根据内容估算节点尺寸并按图规模调整间距。
3. `980bc32` — 引入仅属于视图状态的子树折叠/展开。

记录的验证证据：

- `npm run build` 通过。
- 37 节点真实图谱的折叠、展开和恢复行为经浏览器预览验证。
- ACM-MD / JSON 导出与本地持久化未出现 `collapsed` 泄漏。

## Task 2 — ELK Layout And Group Containers

PR [#1](https://github.com/TUSKIJAY/agent-context-map/pull/1) 已合并到 `main`。核心提交：

1. `993f5c1` — 引入 `elkjs`，保持按需动态加载。
2. `64d20e4` — 增加 ELK 布局和 Dagre/ELK 引擎切换。
3. `3f57cdb` — 增加 ELK 正交边路由。
4. `6fd0241` — 增加按类型/模块分组的嵌套布局和容器渲染。
5. `6687214` — 增加组级折叠和容器内拖拽落位。
6. `04ee343` — 加固异步竞态、陈旧闭包和折叠坐标处理。

后续 `46a2b9c` 修复导出弹窗样式告警，`aa66fc3` 更新 README，`2d570d4` 完成状态收尾。

记录的验证证据：

- `npm run build` 通过。
- 37 节点图谱按模块/类型分组无重叠；组折叠、引擎切换和展开行为经浏览器验证。
- 分组、折叠、布局引擎、容器和边折点没有泄漏到 ACM-MD、JSON、Mermaid 或 Agent Diff 导出。
- 曾生成 `output/portable/Agent Context Map/Agent Context Map.exe`；`output/` 属构建产物，不进入 Git。

## Historical Follow-Ups

当时记录过语义缩放、邻居 N 跳聚焦和力导向布局等候选方向，但均未排期、未获当前授权，也不是 active plan。

## Current Redirect

- 当前项目级状态：`../../PROGRESS.md`
- 最新会话恢复点：`../../HANDOFF.md`
- 当前计划生命周期：`../exec-plans/roadmap.md`
