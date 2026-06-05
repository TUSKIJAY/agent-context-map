# HANDOFF

> 面向后续 Agent / 新 session 的接手说明。配合 `AGENTS.md`（操作约束）与 `PROJECT_MAP.md`（文件职责）一起读。
> 本文件**被 git 跟踪**；它引用的 `doc/` 下计划文档则**已被 gitignore，仅本地存在**（见下）。

更新日期：2026-06-05
当前焦点：**复杂图谱可读性优化**（让复杂项目的图谱不再"难看"）

---

## 1. 当前状态

- **任务 1（main 轻量层 B + A）已完成并推送 `origin/main`**，按序三个独立 commit：
  1. `e2b537c` `fix(validate): 加固 validateDoc + 统一 DataEntity id 前缀为 data` —— 落地原在制品（防御性校验 + `entity`→`data`）。
  2. `0e3299f` `feat(layout): dagre 按内容估算尺寸 + 间距随规模自适应`（**B**：`estimateNodeSize` + 间距随规模缓增 + `NODE_W` 对齐 210）。
  3. `980bc32` `feat(canvas): 子树折叠/展开，复杂图谱按需下钻`（**A**：`collapsed` 纯视图状态 + `computeHidden` + 可见子图布局 + 折叠角标）。
  - `npm run build` 通过；预览实测一份 37 节点真实大图：折叠 `37→29`（角标 5/1/2=8）、单点折叠根 `→18`（▸19）、展开复原 `37`；
    导出 ACM-MD / JSON 与本地持久化均**零 `collapsed` 泄漏**（ACM-MD v0.1 协议零污染）。
  - 工作区现已**干净**（无 `M src/acm/data.js` 在制品）。
- 布局现状已被 B 改善：`layoutGraph()` 改为按 `estimateNodeSize` 估算尺寸、间距随节点数自适应；
  A 引入 `collapsed`（纯视图态）+ `computeHidden` / `containsChildren` / `collapseToDepth` 折叠机制——这套尺寸估算与折叠机制将被任务 2 的 C+D 直接复用。

## 2. 建议优先任务（已与用户敲定：串行推进）

### 任务 1 · main 轻量层（B + A） → ✅ **已完成**（见 `doc/03-复杂图谱可读性优化/plan/plan-01-BA-止血与折叠.md`）

main 上三个独立 commit 均已落地并推送（hash 见 §1）：`fix(validate)` → `feat(layout)`（B）→ `feat(canvas)`（A）。

### 任务 2 · 重构层（C + D） → **下一步**（见 `doc/03-复杂图谱可读性优化/plan/plan-02-CD-引擎与分组.md`）

从已含 B+A 的 main 切分支 `feat/elk-grouped-layout`：

- **C**：引入 `elkjs`，ELK 布局 + dagre/ELK 引擎切换 + 正交边路由。
- **D**：按类型/模块的分组容器（React Flow sub-flow + ELK 嵌套布局），组级折叠**直接复用 A**。
- 验证 OK 再 PR 合回 main。

> 串行原因：B 的 `estimateNodeSize`、A 的 `collapsed`/`computeHidden` 都会被 C+D 复用；先落 main 可零冲突复用，免去重复实现与 `data.js` 合并冲突。

## 3. 暂缓事项

- C+D 不要在 B+A 进 main 之前开工（会与共享代码冲突）。
- 语义缩放（LOD）、邻居 N 跳"聚焦+隔离"视图、力导向布局：均为 C+D 之后的可选增量，暂不排期。
- 不得为做布局而改动 `ACM-MD v0.1` 协议：折叠态、分组、容器都必须是**派生视图状态**，不写入 `doc`、不进任何导出格式。

## 4. 接手检查

开工前：

```powershell
git rev-parse --show-toplevel   # 应为项目目录
git rev-parse --git-dir         # 应为 D:/git-stores/stargate/LLM_project_agent思维导图.git（外置）
git status --short --branch     # 任务 1 已提交推送，工作区应为干净（不再有 M src/acm/data.js）
```

注意事项：

- **`doc/` 已被 gitignore**：两份 plan 是本地文档，不在 git/分支里。请用上面的**完整路径**打开它们；切分支时它们仍在工作区可读。
- 提交纪律（AGENTS.md）：**禁止 `git add -A`**，只 `git add` 本次明确相关文件；不得回滚/覆盖工作区里其他来源的改动。
- 改了 `src/` / `index.html` / `package.json` / `vite.config.js` 后，至少跑一次 `npm run build`。
- 修改入口：布局/数据契约 → `src/acm/data.js`；画布交互 → `src/acm/FlowCanvas.jsx`；工具栏/撤销/布局应用 → `src/App.jsx`。
