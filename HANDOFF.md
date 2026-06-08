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
  A 引入 `collapsed`（纯视图态）+ `computeHidden` / `containsChildren` / `collapseToDepth` 折叠机制——这套尺寸估算与折叠机制已被任务 2 的 C+D 直接复用。
- **任务 2（重构层 C + D）已完成并合并进 `main`**：PR [#1](https://github.com/TUSKIJAY/agent-context-map/pull/1) 已 **MERGED**，`main` 现为 `aa66fc3`（fast-forward 线性并入，无 merge commit）；临时 worktree 分支 `claude/nice-cannon-841e78` 的**远端已删除**（本地 worktree 暂保留）。核心 6 个独立 commit：
  1. `build(deps): 引入 elkjs`（动态 `import()` 按需 code-split，默认 dagre 用户不下载该 1.4MB chunk）。
  2. `feat(layout)` C-1/C-2：`layoutGraphElk` 异步布局 + `engine`（dagre 默认/elk）引擎切换 + loading 遮罩。
  3. `feat(canvas)` C-3：自定义 `elkEdge` 正交边路由（消费 ELK 折点，沿用箭头/标签/虚线/高亮）。
  4. `feat(layout)` D-1~D-3：`computeGroupOf`（按类型/模块）+ ELK 嵌套布局 + RF sub-flow 容器渲染（相对/绝对坐标换算）。
  5. `feat(canvas)` D-4：组级折叠（`collapsedGroups` 并入 A 的 hidden 集，容器退化标题条，切换即重排）。
  6. `fix(layout)`：多 Agent 对抗式评审加固（折叠坐标污染、异步 ELK 竞态 `docEpoch` 失效、闭包陈旧等）。
  - `npm run build` 通过；37 节点大图实测：按模块 11 框 / 按类型 10 框零重叠、组折叠/展开正确、dagre↔ELK↔分组互切无报错无重渲染循环；导出 ACM-MD/JSON/Mermaid（含分组+折叠态）**零泄漏**（协议零污染，实测核对）。
  - 偏离 plan：① elkjs 改动态 import 按需加载；② 组折叠改「切换即重排」（用 `collapsedGroups`，非字面塞进 A 的 `collapsed`，因后者语义是折叠每个成员的子树而非整组）。
  - 引擎、分组维度、容器节点、边折点、组折叠**全部是派生视图状态**——不写入 `doc`/`layout`、不进任何导出。
  - 另有收尾 commit：`fix(export)` 修预存 ExportModal 边框混写告警、`docs(readme)` 补 README 双引擎/分组能力、`docs(handoff)` 本文件。
  - **已产出绿色版 exe**：`output/portable/Agent Context Map/Agent Context Map.exe`（`npm run tauri:build -- --no-bundle`，约 17.3MB，依赖系统 WebView2，免安装双击即用；`output/` 为构建产物，不入库）。

## 2. 建议优先任务（已与用户敲定：串行推进）

### 任务 1 · main 轻量层（B + A） → ✅ **已完成**（见 `doc/03-复杂图谱可读性优化/plan/plan-01-BA-止血与折叠.md`）

main 上三个独立 commit 均已落地并推送（hash 见 §1）：`fix(validate)` → `feat(layout)`（B）→ `feat(canvas)`（A）。

### 任务 2 · 重构层（C + D） → ✅ **已完成并合并进 `main`**（PR [#1](https://github.com/TUSKIJAY/agent-context-map/pull/1) MERGED；见 `doc/03-复杂图谱可读性优化/plan/plan-02-CD-引擎与分组.md`）

在含 B+A 的 main 上切分支 **`claude/nice-cannon-841e78`**（plan 里写的 `feat/elk-grouped-layout` 仅为示意，实际用 worktree 分支名）：

- **C**：引入 `elkjs`，ELK 布局 + dagre/ELK 引擎切换 + 正交边路由 —— ✅。
- **D**：按类型/模块的分组容器（React Flow sub-flow + ELK 嵌套布局），组级折叠复用 A —— ✅。
- 已通过 build + 浏览器实测 + 多 Agent 评审加固，PR #1 **已合并进 `main`**（`aa66fc3`），远端临时分支已清理，并已打出 portable exe（commit 明细与实测见 §1）。

> 串行原因：B 的 `estimateNodeSize`、A 的 `collapsed`/`computeHidden` 都被 C+D 复用；先落 main 零冲突复用，免去重复实现与 `data.js` 合并冲突。

## 3. 暂缓事项

- C+D 已合并进 `main`（PR #1 MERGED）。本地 worktree `claude/nice-cannon-841e78` 用完可删（`git worktree remove --force` + `git branch -d`，须在主目录、关掉占用进程后执行）。
- **下一步可选方向（按需排期，见 plan-02 §9）**：语义缩放（LOD：低缩放只画容器/簇、隐藏卡片细节）、邻居 N 跳"聚焦+隔离"视图、力导向布局（ELK `force`/`stress`）——均为 C+D 之后的增量，目前未排期。
- 不得为做布局而改动 `ACM-MD v0.1` 协议：折叠态、分组、容器、边折点、引擎选择都必须是**派生视图状态**，不写入 `doc`、不进任何导出格式。

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
