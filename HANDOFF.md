# HANDOFF

> 面向后续 Agent / 新 session 的接手说明。配合 `AGENTS.md`（操作约束）与 `PROJECT_MAP.md`（文件职责）一起读。
> 本文件**被 git 跟踪**；它引用的 `doc/` 下计划文档则**已被 gitignore，仅本地存在**（见下）。

更新日期：2026-06-09
当前焦点：**Agent 协作编辑 / Co-edit Mode 已完成前端 mock，下一步对接 agy SDK**

---

## 0. 2026-06-09 最新接手重点：对接 agy SDK

本轮在分支 `codex/agy_agent` 上完成了 Agent 协作编辑前端原型，当前源码改动尚未提交：

```text
M src/App.jsx
M src/acm/FlowCanvas.jsx
M src/acm/Panels.jsx
M src/acm/data.js
```

已完成能力：

- 顶部新增 `Agent 协作` 主按钮，右侧状态显示 `待确认 N` / `本轮建议 +N 节点 +M 关系`。
- 右侧面板切为 `Inspector / Agent / 建议变更 / 校验`。
- `Agent` tab 支持当前节点上下文、紧凑聊天、prompt chips、快捷动作（展开 / 方案 / 重推理）。
- `建议变更` tab 展示 pending graph patch，支持逐项采纳 / 拒绝 / 全部采纳 / 全部拒绝，并可校正建议节点和建议关系字段。
- 画布渲染 AI 建议层：建议节点虚线紫色边框 + `AI 建议` badge，建议关系虚线；未采纳前不写入正式 `doc`。
- 采纳后才写入 `doc.nodes` / `doc.edges`，继续复用现有 `validateDoc` / `diffDoc` / export 流程。

关键验证：

- `npm run build` 已多次通过（最近一次在 2026-06-09，对应修复右侧 Agent 输入栏贴底问题）。
- 已用 Python Playwright 检查 `http://127.0.0.1:5173/`：Agent tab 输入框已贴右侧面板底部，控制台无 error/warn。
- 5173 当前被 Vite 监听，进程命令行为：

```text
node ...\node_modules\.bin\..\vite\bin\vite.js --host 127.0.0.1 --port 5173
```

### 当前 mock / agy 替换入口

最重要入口：

```text
src/App.jsx
  runMockAgent(text)
```

当前 `runMockAgent()` 做三件事：

1. 取当前选中节点作为 `baseNodeId`。
2. 调用 `createMockAgentPatch(doc, baseNodeId, prompt)` 生成本地 mock patch。
3. `setPendingAgentPatch(patch)`，让画布和右侧面板显示 pending 建议。

对接 agy SDK 时，建议不要把 SDK 调用散落在 `App.jsx`。推荐新增一个轻薄适配层：

```text
src/acm/agentClient.js
```

建议接口：

```js
export async function requestAgentPatch({ doc, baseNodeId, prompt, selection }) {
  // v1: call agy sidecar / MCP / SDK
  // return pendingAgentPatch shape
}
```

然后把 `src/App.jsx` 的 `runMockAgent()` 中：

```js
const patch = createMockAgentPatch(doc, baseNodeId, prompt);
```

替换成：

```js
const patch = await requestAgentPatch({ doc, baseNodeId, prompt, selection });
```

### pendingAgentPatch 数据契约

当前纯函数入口都在 `src/acm/data.js`：

```text
createMockAgentPatch(doc, baseNodeId, prompt)
previewAgentPatchDoc(doc, patch)
agentPatchStats(patch, status)
updateAgentPatchOperation(patch, opId, updater)
applyAgentPatchOperations(doc, patch, operationIds)
rejectAgentPatchOperations(patch, operationIds)
markAgentPatchOperations(patch, operationIds, status)
```

agy SDK 返回值应尽量保持这个结构：

```js
pendingAgentPatch = {
  id,
  createdAt,
  source: "agy_sdk",
  prompt,
  summary,
  baseNodeId,
  operations: [
    { id, op: "add_node", status: "pending", node: {...} },
    { id, op: "add_edge", status: "pending", edge: {...} },
    { id, op: "update_node", status: "pending", nodeId, patch: {...} }
  ]
}
```

协议边界必须继续遵守：

- pending patch 是 view state，不写入正式 ACM-MD。
- 未采纳建议不能进入保存 / 导出 / Agent Diff。
- 采纳后节点/边可以写入正式 `doc`，但推断内容默认 `status: "suggested"`。
- 需要人工判断的内容用 `status: "needs_validation"`。
- 不要把 AI 建议直接标成 `confirmed`。
- 不要改 `ACM-MD v0.1` 核心契约，除非同步更新 `doc/03-ACM-MD格式规范指导文件.md`。

### 下一步建议

1. 先阅读 `AGENTS.md` / `PROJECT_MAP.md` / 本 `HANDOFF.md`。
2. 跑 Git 外置检查：

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
```

期望 `git-dir` 仍是：

```text
D:/git-stores/stargate/LLM_project_agent思维导图.git
```

3. 阅读以下源码入口：

```text
src/App.jsx            # runMockAgent / pendingAgentPatch 状态 / 右侧 tab 接入
src/acm/data.js        # pending patch 纯函数与 mock 结构
src/acm/Panels.jsx     # AgentPanel / SuggestionsPanel / Inspector 快捷动作
src/acm/FlowCanvas.jsx # AI 建议层视觉渲染
```

4. 新增 `src/acm/agentClient.js`，将 agy SDK 适配成 `pendingAgentPatch`。
5. 修改 `runMockAgent()` 为 async，加入 loading/error 状态；失败时保留 mock fallback 或 toast 提示。
6. 修改源码后必须运行：

```powershell
npm run build
```

7. 若继续验证 UI，使用当前 Vite dev 地址：

```text
http://127.0.0.1:5173/
```

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
