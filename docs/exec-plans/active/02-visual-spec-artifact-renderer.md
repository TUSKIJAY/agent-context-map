# Visual Spec Artifact Renderer Plan

- Status: Active — Phase 0 accepted; Phase 1 ready
- Owner: product direction pivot (session 2026-08-11)
- Created: 2026-08-11
- Scope authority: active authorization for the local Phase 0–4 work and gates written here; Phase 0 was accepted on 2026-08-12 and Phase 1 is ready; package merges and all remote Git/release actions remain unauthorized
- Consulted: local audit + Grok + Claude + Kimi independent read-only reviews; user decisions and activation confirmed 2026-08-11; synthesis remains the plan author's responsibility

## 0. Prompt vs Repository Facts

本 session 的 Prompt 假设与当前 checkout 实测存在冲突。**以当前仓库证据为准**，差异必须显式报告，不得静默改目标。

| Prompt 假设 | 当前 checkout 实测 | 处理 |
| --- | --- | --- |
| 权威目录 `D:\Code\agent-context-map` | `/Users/neowang/Desktop/Star Gate/agent-context-map`（macOS） | 使用本机实测路径 |
| 分支 `codex/acm-pluginization-plan`，HEAD ≈ `4ed712c` | 分支 `codex/project-harness-governed`，HEAD `37ace47`（基于 `main` `2d570d4`） | **以当前分支作为实施基线**；activation 时冻结实测 HEAD/状态 |
| 工作树空；有 `packages/acm-core`、`acm-editor` | 起草前产品代码未改；当前仅有本计划及治理文档变更；**无** `packages/` | monorepo 分层仅作为远程证据 |
| active plan `01-…Codex插件化Plan.md` Phase 8 Stopped | 本 checkout `docs/exec-plans/active/` 为空 | pluginization 计划只存在于 `origin/codex/acm-pluginization-plan` |
| DEC-004–007 已 Accepted | 本 checkout 仅有 DEC-001 | DEC-004–007 仅作远程历史决策参考，不自动约束本线 |
| README 2026-08-03 产品复盘 | 本 checkout / `origin/main` README **无**该日期段落 | 未找到可引用文本；不伪造复盘内容 |

远程证据（只读）：

```text
origin/codex/acm-pluginization-plan @ 4ed712c
  packages/acm-core, packages/acm-editor, packages/project-store
  plugins/agent-context-map (+ build-widget.mjs 单文件 HTML IIFE)
  docs/exec-plans/active/01-Agent-Context-Map-Codex插件化Plan.md
  DEC-004 … DEC-007
  Phase 8：rc.4 live host resource discovery/read Gate 失败后 Stopped；无 tag/GitHub Release/stable
```

本计划目标**不变**：收敛为 Visual Spec Artifact Renderer。实施基线是 **`codex/project-harness-governed` 当前分支上的单体应用**，不是 `main` 或插件化分支；远程 monorepo 仅作可选资产来源，不自动合并。

---

## 1. Current State Audit / 当前状态审计

### 1.1 仓库真实状态（2026-08-11 实测）

```text
top-level: /Users/neowang/Desktop/Star Gate/agent-context-map
git-dir:   .git
branch:    codex/project-harness-governed
HEAD:      37ace47 Harden governed harness validation and Python checks
main:      2d570d4 (origin/main)
worktree:  产品代码未改；当前 docs-only 计划/索引/状态变更待治理闭环
profile:   governed
```

产品形态（本分支）：

- Vite 5 + React 18 + React Flow 12 + Dagre + ELK（按需）+ html-to-image
- 单体源码：`src/App.jsx`、`src/acm/{FlowCanvas,Panels,data,Home,TweaksPanel}.*`、`src/storage/{store,files}.js`
- 桌面壳：Tauri 2 + SQLite（`@tauri-apps/plugin-sql`）；浏览器 dev 用 localStorage 兜底
- 协议：`skills/acm-md/references/acm-md-v0.1.md` + Python 校验器
- 已有 `npm run build` → 多文件 `dist/`（主包约 589KB JS + ELK 约 1.4MB 独立 chunk）
- `index.html` 仍依赖 Google Fonts CDN（离线 Artifact 冲突点）
- 本分支 `package.json` **没有** `harness:check` / `harness:budget` npm scripts（验证须直接调用 `python3 scripts/…`）

### 1.2 为什么现有 pluginization active plan 不适合作为新产品方向的执行授权

1. **产品目标不同**：插件化计划授权的是 Codex MCP + Widget + project ACM-MD 真源 + 写路径安全；新方向是**图谱优先的只读 Spec Artifact**。
2. **阻塞层不同**：Phase 8 停在宿主 Widget ready / MCP Apps bridge / Desktop 安装重启 canary，属于**可选宿主适配层**，不是 Artifact 渲染核心。
3. **本 checkout 不持有该 active 文件**：在本分支继续“执行”插件化计划既无文件也无授权；远程 active 状态也不能自动迁移到本线。
4. **价值未证明**：大量工程投入（host-binding、proposal boundary、release clean-room、SBOM）尚未转化为“用户可在浏览器打开并理解一份 Spec”的价值闭环。

### 1.3 Widget 失败属于哪一层

| 层 | 内容 | 与 Artifact 关系 |
| --- | --- | --- |
| 协议语义 | ACM-MD v0.1 节点/边/状态 | 必须保留，Artifact 数据源 |
| 语义图 + 布局 + 画布 | parse/validate/layout/FlowCanvas | Artifact 核心可复用 |
| 编辑与持久化 | Inspector 写、undo、store、SQLite/project-store | MVP 冻结 |
| 宿主适配 | Tauri / MCP stdio / Widget bridge / host identity | **Widget 失败层**；不得阻塞 Artifact |
| 发布治理 | rc 候选、CI、tag、marketplace | 明确不做 |

结论：Widget `ready=false` 是 **Codex Desktop MCP Apps 宿主适配 + 协议握手**问题，不是“图谱不可渲染”问题。Playwright 标准宿主与本地 Vite 路径已能证明 React Flow 可渲染。

### 1.4 已有产品能力 vs 仅工程投入

**已存在且对 Artifact 有直接价值：**

- ACM-MD 解析 `parseAcmMd`、校验 `validateDoc`、导出 `toAcmMd` / Mermaid / JSON
- 节点类型 / 状态 / 关系受控词表与视觉 meta
- React Flow 画布：平移、缩放、Fit View、MiniMap、PNG/SVG 导出
- 类型筛选（legend）、选中节点一跳邻接 focus 高亮、子树折叠、分组容器、dagre/ELK 布局
- Inspector 字段覆盖：标题、类型、状态、描述、来源、置信度、出入边计数
- 浏览器可 `npm run dev` / `npm run build` + `preview` 独立运行（不依赖 Tauri）

**工程投入大、用户价值未闭环（冻结 / 不进 Artifact 核心）：**

- Codex plugin monorepo、MCP tools、proposal/commit、host-binding、clean-room release
- Widget 单文件打包本身有复用价值，但其就绪证明绑在宿主上
- SQLite → project-store 迁移、revision 锁、并发 Gate
- Agent Diff 全编辑闭环、推断落 suggested、确认写回

### 1.5 架构七问（审计结论）

1. **FlowCanvas / Panels 距只读 Viewer 多远？**
   中等距离。交互骨架已在；缺显式 `readOnly` 契约、只读 Inspector（去编辑控件）、搜索、状态筛选、URL hash 深链、三语义投影、图例与亮色默认设计收敛。估计是“模式开关 + 投影层 + 轻壳”，不是重写画布。

2. **能否经 browser/Vite 独立运行？**
   能。`npm run dev` / `build` / `preview` 已是基线；Tauri 为可选壳。storage 在浏览器走 localStorage。

3. **Tauri / MCP / Widget / project-store 耦合层？**
   - Tauri：`src/storage/*`、`src-tauri/*`、动态 import 插件
   - MCP/Widget/project-store：**仅远程分支** `plugins/`、`packages/project-store`
   - 本分支画布与 `data.js` **不**依赖 MCP

4. **能否增加 artifact build entry 而不破坏桌面应用？**
   能。Vite 多入口或独立 `scripts/build-artifact.mjs` + 只读 shell；现有 `npm run build` / Tauri 入口保持。远程 `build-widget.mjs` 已证明 IIFE 单文件路径可行。

5. **自动布局是否适合三视图？**
   - Structure（`contains` 森林）：dagre/ELK layered + 现有 collapse/group **基本适合**
   - Dependency：同一 layered 引擎，换边过滤与方向即可
   - Inquiry：子图过滤后布局即可；**不是**专用 mind-map radial 引擎
   第一阶段不引入 radial/force 新引擎；若 Structure 要“思维导图感”，优先 LR/TB 树形 + 折叠，而不是新算法。

6. **单文件 HTML 还需补什么？**
   - 去 CDN 字体（系统栈：`system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif`）
   - 内联 CSS/JS（IIFE 或 vite-plugin-singlefile 类方案）
   - ELK 按需策略（单文件内动态 import 困难 → 默认 dagre，ELK 可选或剔除）
   - Spec 嵌入策略（构建时注入 JSON/ACM-MD）
   - `file://` 与模块路径安全验收

7. **哪些功能使 MVP 过重、应冻结不删？**
   完整可视化编辑、undo/redo、Agent Diff、关系推断写回、Tweaks 重样式、SQLite/project-store、MCP/Widget、rc 发布管线、云/协作/遥测。

---

## 2. Multi-Agent Consultation Summary / 会商摘要

| 议题 | Codex | Claude | 本计划采纳 |
| --- | --- | --- | --- |
| 根因 | 产品中心是编辑/持久化，目标却是解释/分享 | 缺“无运行时依赖交付物”边界 | 两者合并：方向错位 + 交付物缺失 |
| 演进基线 | 当前单体；勿整支 cherry-pick 插件线 | main 为主；只借 widget 打包思路 + core 切分形状 | **当前 `codex/project-harness-governed` 分支为实施基线**；远程按需点采 |
| Artifact 形态 | P1 静态目录；单 HTML 仅当必须 `file://` 分享 | P1 单 HTML（分享价值优先） | **P0 spike 双路径；P1 默认静态目录；P3 再锁单文件** |
| 旧 plan | 本分支无 active；远程归档 Superseded | paused/completed-partial + DEC | **本分支不适用生命周期迁移**；远程仅作 Stopped/Superseded 证据，另行治理 |
| 三视图 | 统一 nodes/edges 投影过滤 | 投影不写回文档 | 采用；关系集合以产品定义表为准 |

用户已完成实施基线、Artifact 形态、编辑器去留、Dependency 边集合、数据注入与旧 plan 生命周期六项确认；正式口径见 §8.1。

---

## 3. Product Brief / 产品简报

### 3.1 定义

**Agent Context Map → Visual Spec Artifact Renderer**

以 ACM-MD v0.1（或兼容的内存图模型）为语义真源，默认主界面为可交互图谱（结构 / 依赖 / 探询），节点详情在 Inspector 展开，最终产物是**普通浏览器可打开、可离线展示与分享**的交互式 Artifact 网页。

不是：长篇 Spec 文档站、静态截图工厂、Codex Widget 专属 UI、完整双向编辑器。

### 3.2 目标用户（假设，待验证）

| 用户 | 需求 |
| --- | --- |
| Spec 作者 / Tech Lead | 把结构化 Spec 变成可演示的图谱 Artifact |
| 评审人 / 干系人 | 不装编辑器，浏览器打开即可浏览、筛选、定位节点 |
| 下游 Agent / 协作者 | 仍以 ACM-MD 为机器可读真源；Artifact 是人读视图 |

### 3.3 核心问题

结构化 Spec 存在于 Markdown/YAML 与编辑器内部状态中，**缺少一份图谱优先、可分享、只读、离线可用的交互交付物**；此前路径被宿主集成（Widget/MCP）阻塞，未能证明用户价值。

### 3.4 核心使用流程（MVP）

1. 准备合法 ACM-MD（或使用示例 Spec）
2. 构建 / 打开 Artifact（开发预览或静态产物）
3. 默认进入 Structure 视图，平移缩放浏览
4. 点击节点 → Inspector 只读详情
5. 切换 Dependency / Inquiry；搜索与筛选；必要时 hash 定位
6. 可选导出 PNG/SVG 截图分享

### 3.5 MVP 能力分级

| 能力 | 级别 | 说明 |
| --- | --- | --- |
| 图谱主视图 + pan/zoom/fit/minimap | 必须有 | 已有基础 |
| 节点类型/状态视觉区分（克制） | 必须有 | 已有 meta 色 |
| 中文系统无衬线字体、亮色默认 | 必须有 | 需去 CDN |
| Structure / Dependency / Inquiry 三投影 | 必须有 | 需新增投影层 |
| 只读 Inspector（标题/类型/状态/描述/来源/置信度/约束验收/出入边/上下游/可复制 ID） | 必须有 | 展示补齐；去写控件 |
| 类型+状态筛选、图例 | 必须有 | 类型筛选已有，状态筛选待补 |
| 搜索节点 | 应有 | MVP 强烈建议 |
| 折叠层级、1–2 层 focus | 应有 | 一跳 focus 已有；深度 focus 可增强 |
| URL hash 定位节点/视图 | 应有 | 新建 |
| 离线静态目录 Artifact | 必须有 | P1 |
| 单文件 HTML | 应有（P3） | P0 评估，不阻塞 P1 |
| PNG/SVG 导出 | 应有 | 已有 html-to-image |
| 暗色主题 | 以后再做 / 可选 | 不阻塞 MVP |
| 完整编辑、Agent 写入、MCP、Tauri 深集成 | 以后再做 | 冻结 |

### 3.6 非目标（本计划默认排除）

- 继续 rc.5 / Widget openAttempt / Windows Codex canary / resource discovery 绕过
- stable plugin、tag、GitHub Release
- 删除插件或 Tauri 代码
- 立刻重写全仓或修改 ACM-MD v0.1
- 云服务、远程 DB、登录、协作、遥测
- 浏览器内直接调 LLM
- 第一版完整可视化编辑、Agent proposal 写入、双向同步
- GIF/MP4/复杂动画管线

### 3.7 验收标准（产品级，非实施授权）

- 同一份 ACM-MD 可在浏览器打开为交互图谱，无需 Codex Desktop / MCP / Tauri
- 三视图均来自统一图模型投影，切换不复制业务数据、不写回真源
- Inspector 只读且字段覆盖 MVP 清单
- 产物离线可用：无强制 CDN / 无后端
- ACM-MD 严格校验仍可通过；布局与选择态不泄漏进导出协议

### 3.8 仍需产品验证的假设

- P1 静态目录是否足以完成首轮分享闭环；单文件正式交付固定到 P3，P0 只验证可行性。
- 只读 Viewer 作为默认主路径后，用户是否仍频繁进入作为次路径保留的旧编辑器。
- 大图中辅助 `impacts` 边默认显示是否造成噪声；必须支持隐藏，不得进入依赖主排序。
- 构建时嵌入 Spec 是否覆盖 MVP 使用场景；运行时打开本地 `.acm.md` 不进入 P1。

### 3.9 风险与取舍

| 风险 | 缓解 |
| --- | --- |
| 单文件体积（React Flow + 可选 ELK）过大 | P1 静态目录 + dagre 默认；ELK 可选；P0 测体积 |
| 继续背编辑器复杂度 | 显式 readOnly 与能力冻结表 |
| 误合并插件化债务 | 禁止整支 merge；点采需独立 Gate |
| 把视图状态写回 ACM-MD | 保持“派生视图不泄漏”不变量 |
| 远程插件证据丢失 | 保留 `origin/codex/acm-pluginization-plan@4ed712c` 证据路径；本分支不导入旧 active plan |
| 多 Agent 同时写导致 HEAD/diff 漂移 | 单写者；评审针对冻结 revision；评审者只读；每轮结束复核 HEAD/status |

---

## 4. Target Architecture / 目标架构

### 4.1 分层（演进，不假设必建新 package）

```text
ACM-MD (.acm.md / 嵌入 payload)
  → semantic core（parse / validate / normalize；可由 data.js 演进或后续点采 acm-core）
  → unified graph model（nodes + edges + meta；单一真源副本）
  → view projections（structure | dependency | inquiry → 过滤后的可布局子图）
  → layout（dagre 默认；ELK 可选；结果为派生坐标）
  → viewer shell（React Flow 只读画布 + Inspector + 导航）
  → artifact adapter（静态目录 / 单 HTML 构建与 Spec 注入）
  → optional adapters（Tauri | Codex Widget | MCP）— 冻结，不挡主路径
```

第一阶段**不强制**新建 `packages/*`。若 `data.js`（约 870 行）在拆分时超过可维护阈值，再以最小纯函数模块落地（可对齐远程 acm-core 的文件边界，但不引入 monorepo 工具链除非获批）。

### 4.2 数据流

```text
load ACM-MD text
  → parseAcmMd + validate (strict for publish path)
  → GraphDocument (canonical)
  → project(viewId, filters) → { nodes', edges', layoutHints }
  → layoutGraph / layoutGraphElk (view state only)
  → GraphCanvas readOnly + Inspector readOnly
  → optional: PNG/SVG snapshot | share URL hash
```

约束：

- pending / suggested 推断不得在 Artifact 路径自动升为 confirmed
- 展示层不得反向覆盖内容真源
- 投影与布局不得写入导出 ACM-MD

### 4.3 三视图投影规则（统一模型）

| 视图 | 节点保留 | 边保留 | 布局偏好 |
| --- | --- | --- | --- |
| Structure / Mind Map | 层级相关为主（Goal/Module/Feature/… 全量可显，折叠按 `contains`） | 主：`contains`；`references`/`replaces` 等其它边默认隐藏，可由用户打开辅助层 | LR 或 TB layered；折叠/分组 |
| Workflow / Dependency | 参与依赖类边的节点 + 必要锚点 | 主：`depends_on`, `requires`, `constrains`, `conflicts_with`；辅：`impacts` 浅色虚线、可隐藏、不参与主排序 | LR layered |
| Inquiry | Question, Assumption, Risk, Decision 及一跳关联 | `needs_validation`, `answers`, 及相关 `impacts`/`constrains` | 紧凑 layered |

实现要求：`project(doc, viewId) -> { nodeIds, edgeIds, options }`，布局与渲染只消费投影结果；`selection.id` 跨视图稳定。

### 4.4 Artifact 构建路径

下表 `P<n>` 与 §5 的 `Phase <n>` 同义；Phase 2 只增强投影/导航，不新增 Artifact 包装形态。

| 阶段 | 产物 | 说明 |
| --- | --- | --- |
| P0 spike | `dist-artifact-dir/` 与可选 `artifact.html` 体积/离线报告 | 不承诺产品入口 |
| P1 | 静态目录（index.html + assets，无 CDN） | 默认交付；构建时嵌入 Spec |
| P3 | 单文件 HTML（内联 CSS/JS + 嵌入 Spec） | 正式单文件交付；参考远程 `build-widget.mjs` IIFE 模式，去掉 MCP bridge |
| 并行 | 现有 `npm run build` 桌面/编辑器路径 | 不破坏 |

### 4.5 与 Tauri / MCP / Widget 的隔离

- Artifact entry **禁止** import Tauri plugins、MCP SDK、host bridge
- 可选适配层可继续存在于仓库，但 CI/Gate 不以其为 MVP 阻塞
- 插件化远程分支保留为证据与 optional 路线，不作为本计划 Phase 入口条件

### 4.6 复用判断表

| 模块/文件 | 当前职责 | 直接复用 | 需要解耦 | 暂时冻结 | 不应进 Artifact 核心 | 依据 |
| --- | --- | --- | --- | --- | --- | --- |
| `src/acm/data.js` 词表/parse/validate/layout | 语义与布局 | 是 | 拆只读导出边界、投影 API | diff 写路径可后置 | — | 已有完整词表与 parse |
| `src/acm/FlowCanvas.jsx` | 画布/导出 | 视觉与导航 | `readOnly`、禁 connect/drag write | 编辑 Handle 样式可留代码 | 写回 doc 的 move/connect | 已有 minimap/focus/export |
| `src/acm/Panels.jsx` Inspector | 详情编辑 | 字段展示 | 只读 Inspector 组件 | 删除/确认按钮 | 写控件 | 字段接近 MVP |
| `src/acm/Panels.jsx` Diff/Validate | 编辑期工具 | Validate 可选只读 | — | Diff 面板 | Diff 作为核心导航 | Artifact 非编辑 diff |
| `src/App.jsx` | 编辑器壳 | 少量状态模式 | Viewer shell 分离 | undo/Home 编辑流 | 持久化编排进核心 | 过重 |
| `src/storage/*` | SQLite/localStorage | 否（Artifact） | — | 是 | 是 | 宿主存储 |
| `src-tauri/*` | 桌面壳 | 否 | — | 是 | 是 | 可选适配 |
| `skills/acm-md/*` | 协议与校验 | 是 | — | — | — | 真源规范 |
| 远程 `packages/acm-core` | 纯逻辑 core | 点采候选 | 与本地 data.js diff 后决定 | monorepo 整包 | 强绑 Vitest 工作区非必须 | 有测试与 strict parity |
| 远程 `packages/acm-editor` | 可注入平台的编辑器 | 部分 UI | contracts 仍要 store/agent | 整包 | store/agent 契约 | 非 Viewer 内核 |
| 远程 `packages/project-store` | 项目文件真源 | 否 | — | 是 | 是 | 写路径/迁移 |
| 远程 `plugins/**` | MCP/Widget | 打包脚本思路 | — | 运行时插件 | 是 | 宿主层失败点 |
| 远程 `build-widget.mjs` | 单文件 HTML | 构建模式 | 去 bridge/CSP 按 Artifact 调整 | — | MCP 专用 define | P3 关键资产 |
| Google Fonts CDN | 字体 | 否 | 换系统字体栈 | — | 强制联网字体 | 离线冲突 |

---

## 5. Active Execution Plan / 执行计划

本文件已完成独立 review、用户批准与 activation。它只授权下述 Phase 0–4 本地工作；Phase 0 已按 Gate 验收，当前进入 Phase 1，不授权任何 push、PR、merge、tag、Release 或远程分支改写。

### Phase 0 — 最小 Artifact build spike

- **Status**：Accepted 2026-08-12；evidence `phase-0-evidence-001.md`；Grok `review-008.md` 与 Claude `review-009.md` 均 approve、无 blocking finding。

- **目标**：用最小改动证明“ACM-MD → 浏览器可打开图谱”构建路径与体积/离线约束，不做产品 UI 完整化。
- **范围**：
  - 只读入口 spike（可临时文件，不默认替换编辑器）
  - 静态目录构建；可选单 HTML 实验（参考远程 widget IIFE）
  - 去掉 Artifact 路径对 Google Fonts 的硬依赖
  - 记录 React Flow / dagre / 是否含 ELK 的体积与 `file://` 行为
- **不做什么**：改 ACM-MD 协议；合并 monorepo；MCP/Widget canary；删除 Tauri/插件代码；三视图完整产品化。
- **预计修改入口**：`vite.config.js` 或 `scripts/build-artifact*.mjs`（新建）、spike 入口 jsx、必要时 `index.html` 字体策略草案；**避免**大改 `App.jsx`。
- **Gate**：
  1. spike 产物可在浏览器打开并渲染 sample 或 fixture 图
  2. 断网/无 CDN 下关键资源可达（或明确记录失败项）
  3. 体积数字写入证据；单 HTML 可行性结论（可行 / 需延后）
  4. `npm run build` 原路径仍通过
  5. 按 §7.5 用 Orca embedded browser 留存实际打开、页面错误扫描和离线行为证据
- **停止条件**：单文件与静态目录均无法在无后端条件下渲染；或必须引入被拒的云依赖。
- **回滚/隔离**：spike 文件可整目录删除；不替换默认入口则零用户影响。
- **文档同步**：`PROGRESS.md` / `HANDOFF.md` 记录体积与结论；不激活后续 Phase。

### Phase 1 — 只读图谱 Artifact Viewer

- **目标**：交付可用的只读 Viewer 主路径（图谱 + 只读 Inspector + 基础导航）。
- **范围**：
  - `readOnly` 契约：禁 drag 写回、禁 connect、禁 Inspector 写、禁删除
  - Viewer shell 成为默认主路径；旧编辑器保留为明确的次入口，不删除、不做同壳读写切换
  - 普通应用启动默认进入 Viewer；通过显式标注的“进入编辑器”动作进入旧编辑器；Artifact 构建不暴露编辑器入口
  - 构建时嵌入 `skills/acm-md/examples/valid-basic.acm.md` 作为 smoke Spec；P1 不提供运行时本地 `.acm.md` 文件选择器
  - 类型筛选、图例、fit/minimap、亮色默认与系统中文字体
- **不做什么**：三视图完整切换；单文件必达；搜索/hash 可列应有但可降级；编辑器删除。
- **预计修改入口**：`src/acm/FlowCanvas.jsx`、`src/acm/Panels.jsx`、新建 `src/acm/viewer/*` 或等价、`src/App.jsx` 路由/模式开关、构建脚本。
- **Gate**：
  1. **Artifact 构建面**严格只读：无可写控件、无编辑器入口，入口依赖图与输出 bundle 均排除编辑器、`src/storage/*` 和 Tauri plugin
  2. **App 内 Viewer 面**默认只读：无可写控件、无隐式写路径；允许用户通过显式“进入编辑器”动作到达旧编辑器。Viewer 初始执行图不静态 import storage/Tauri，编辑器及其写能力只可在该显式动作后的 lazy/dynamic 边界加载
  3. 两个面中的 Viewer 操作均不改变导出 ACM-MD 语义；点击节点可显示只读详情（字段达 MVP 清单的核心项）
  4. 静态目录产物可 `preview`/本地静态服务器打开
  5. 若 repo-local `.venv` 不存在，先按 `AGENTS.md` 用 `skills/acm-md/requirements.txt` 初始化一次；随后运行 `.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict`、`python3` harness 检查与 `npm run build`
- **停止条件**：只读与编辑共享状态导致真源被污染且无法隔离。
- **回滚/隔离**：feature flag / 独立入口；默认仍可进旧编辑器。
- **文档同步**：更新 `PROJECT_MAP.md` 入口；`INSTRUCTIONS.md` 仅在稳定事实变化时改。

### Phase 2 — 三语义视图、筛选、Inspector 与导航

- **目标**：同一图模型投影出 Structure / Dependency / Inquiry；补齐筛选与导航。
- **范围**：
  - `project(viewId)` 纯函数 + 单测或可重复脚本断言
  - 视图切换保持 `selection` id
  - 状态筛选；搜索（title/id/tags）
  - 折叠；focus 1–2 层（在一跳基础上可扩展）
  - hash 或等价深链（`view` + `node`）
  - Inspector 补齐上下游列表与可复制稳定 ID
- **不做什么**：新布局引擎；暗色主题必达；编辑写回；宿主集成。
- **预计修改入口**：`src/acm/data.js` 或 `src/acm/project.js`、Viewer shell、`FlowCanvas` 过滤参数。
- **Gate**：
  1. 三视图切换不修改 canonical doc（导出 diff 为空）
  2. 投影规则表与实现一致；空图/孤点/环不崩溃
  3. 搜索与筛选可用；hash 刷新可复现定位
  4. 构建与 harness 通过
- **停止条件**：投影被迫复制三套业务数据才能工作。
- **回滚/隔离**：投影模块可关，回退单视图。
- **文档同步**：产品简报中的视图规则落为 accepted 说明（若有决策则另立 DEC）。

### Phase 3 — 离线/单文件输出与 PNG/SVG 导出

- **目标**：可分享交付物闭环。
- **范围**：
  - 静态目录产物规范化（无 CDN、可拷贝）
  - 单文件 HTML 正式构建（P3 目标；若 P0 发现硬阻塞则保留目录降级并记录）
  - 保留/适配 PNG/SVG 导出
  - 构建时 Spec 注入与版本元数据（doc_id、生成时间、schema_version）
- **不做什么**：发布到公共 CDN 作为运行时依赖；marketplace；插件 rc。
- **预计修改入口**：`scripts/build-artifact*.mjs`、`package.json` scripts、Viewer 资源加载。
- **Gate**：
  1. P1 静态目录与 P3 单文件均在 Phase 0 记录版本的 Orca embedded browser（Chromium runtime）离线打开成功；单文件存在硬阻塞时标记 `degraded`，目录交付 Gate 仍必须通过，不得把降级写成单文件成功
  2. 无强制外网请求
  3. PNG/SVG 导出在 Artifact 路径可用或有明确降级说明
  4. 注入源 Spec 严格校验通过；产物可复现（相同输入 → 稳定结构；hash 策略记录）
- **停止条件**：单文件体积或 `file://` 限制导致不可用且无目录降级。
- **回滚/隔离**：仅保留静态目录交付。
- **文档同步**：README 使用者说明更新（获批后）。

### Phase 4 — 产品验证、示例 Spec 与体验收敛

- **目标**：用真实示例证明价值，收敛体验，准备是否取代默认产品叙事。
- **范围**：
  - 1–2 份高质量示例 Spec（非仅工具自描述样本）
  - 交互走查清单（中文排版、图例、空状态、错误 ACM-MD）
  - 性能基线（节点/边数量建议上限记录）
  - 文档：依据 Phase 4 真实示例与走查证据，由 coordinator 决定 README 是否切换为 Artifact 优先；证据不足时保持“编辑器 + 可选 Artifact”，不追加用户微确认
- **不做什么**：大规模营销站点；协议升级；插件复活。
- **Gate**：
  1. 示例严格校验通过
  2. 走查清单全绿或已知问题登记
  3. 用户可仅凭 README 生成并打开 Artifact
- **停止条件**：示例无法表达 Structure/Dependency/Inquiry 差异。
- **回滚/隔离**：文档叙事可回退为“编辑器 + 可选 Artifact”。
- **文档同步**：`PROGRESS`/`HANDOFF`；全部范围验收后 active → completed。

### Optional — 宿主适配重新接入

- **目标**：在 Artifact 核心稳定后，按需把 Tauri 桌面或 Codex Widget 作为**外壳**挂回。
- **范围**：只读打开项目 `.acm/documents/*.acm.md`；Widget 仅嵌 Viewer。
- **不做什么**：以宿主 Gate 阻塞 Artifact 主线；重开 rc 发布除非单独计划。
- **入口**：远程插件分支证据 + 新 optional plan。
- **Gate**：宿主失败不得标记 Artifact MVP 失败。
- **停止条件**：宿主身份/桥接再次不可证。
- **生命周期**：独立 proposed，不混入本计划强制 Phase。

---

## 6. Lifecycle Decision / 生命周期决策

当前 `codex/project-harness-governed` 分支的 `docs/exec-plans/active/` 为空，不存在可迁移的插件化计划。因此本计划的生命周期处理固定为：

- 不把远程 `01-Agent-Context-Map-Codex插件化Plan.md` 导入当前分支后再归档；
- 不修改、merge、重写或删除 `origin/codex/acm-pluginization-plan`；
- 仅把 `origin/codex/acm-pluginization-plan@4ed712c` 记录为 `Phase 8 Stopped / product direction superseded` 的外部证据与点采来源；
- 如未来确需清理远程插件化分支，另立独立 branch-specific Git 任务与授权，不属于本计划。

对 DEC-004–007：内容真源与 MCP 身份等决策在插件上下文仍有历史价值；Artifact 主线若需“内容不得被展示层覆盖”等原则，应在激活前另提精简 DEC 或在计划约束中引用，**不自动 Accepted 到本 checkout**。

---

## 7. Evidence And Commit Plan

### 7.1 本 session（docs-only）基线命令

本分支无 `npm run harness:check` scripts，使用：

```bash
python3 scripts/check-project-harness.py --root . --profile auto
python3 -m unittest discover -s scripts/tests -p 'test_*.py'
python3 scripts/check-startup-doc-budget.py --root .
git diff --check
```

不运行 Windows canary、插件安装、发布构建、宿主测试。

### 7.2 激活后各 Phase 预期检查（预告，非现在执行）

- 文档/治理：同上 harness 套件
- 产品：`npm run build`；Artifact 专项脚本（待 Phase 0 命名）
- 协议：`.venv` + `validate_acm_md.py --mode strict` 对示例与 fixture

### 7.3 状态文件

- activation 同步 `PROGRESS.md`、`HANDOFF.md`、`active/index.md`、`proposed/index.md`、`reviews/index.md` 与 `roadmap.md`
- Phase 0 已验收；状态文件必须把 Phase 1 记为单一下一闸门，不得把 Phase 0 spike 误写为完整只读 Viewer

### 7.4 Commit 边界

- 本次治理与 activation 不自动 commit；仅移动/更新计划、review、索引与状态文件。
- 计划激活后，activation 构成每个 Phase 验收通过时创建一个 plan-scoped local commit 的预授权；提交前必须复核完整 diff、运行该 Phase Gate，并只暂存该 Phase 路径。
- 禁止：跨 Phase 混提、`git add -A`、远程分支改写、push、PR、merge、tag、Release；这些远程动作仍需单独授权。

### 7.5 Orca + Codex Goal 自治执行模型

激活后在**当前 Orca worktree / 当前 `codex/project-harness-governed` 分支**执行，不为并行方便另建 worktree。Orca 负责 Run、Task、Dispatch、worker completion 与消息证据；Codex CLI Goal 是唯一写者和协调者。

Goal objective 使用：

> 在当前 `codex/project-harness-governed` 分支，严格按 active Visual Spec Artifact Renderer plan 从 Phase 0 到 Phase 4 实施、验证、独立审核、按 Phase 提交并如实同步状态；保持 local-first 与 ACM-MD v0.1，不 merge 插件化分支，不执行任何 push/PR/merge/tag/release。

执行 loop：

1. Orca 创建/绑定一个 Run；按 Phase 创建 Task，Codex Goal 只在一个 writer terminal 中实施。
2. 每个 Phase 先冻结 exact HEAD、工作树状态、目标 diff/hash 和验收命令；评审期间 writer 不继续改动。
3. 从 Grok、Claude、Kimi 中选择至少两名**非 Codex**评审者，对同一冻结 revision 独立首轮审核；首轮互不可见，第三名只用于专项或分歧仲裁。评审落在 `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/`，记录 reviewer、冻结 HEAD/diff/hash、verdict、findings 与未验证项。优先使用 Orca orchestration；若某 CLI 不能被 Orca 识别，可用 `agent-cli-bridge` 只读调用，并明确记录为外部 review。
4. Codex 协调者基于仓库证据、计划不变量和原生验证综合结论。Blocking finding 必须修复并复审；普通实现方向、评审者选择、非阻塞取舍与验收不再请求用户逐项确认。每个 Phase 最多两轮正式复审，避免无界讨论。
5. 评审分歧先由第三名仲裁；仍不一致时选择更小、可逆、符合当前 active 范围的方案并记录 dissent。只有超出 active 范围、协议变更、不可逆/破坏性动作、秘密/外部写入、远程 Git 动作或无法形成可信验收证据时才停止并升级。
6. Phase acceptance 必须同时满足：全部 mandatory Gate 通过、至少两份独立 review 无 blocking finding、最终 HEAD/status 与冻结范围可解释、`PROGRESS.md`/`HANDOFF.md` 如实更新。真实浏览器验收由 Orca embedded browser 执行：静态目录经 loopback 静态服务器打开，单文件经 `file://` 打开；每轮至少保存 snapshot、screenshot、页面可见错误扫描/`eval` 结果与命令输出，并在该 Phase review/evidence 中记录浏览器版本。可用时再保存直接 console/network 摘要；工具不提供该采集通道时必须明确记 `tool_unsupported`，并用页面错误扫描及 loopback server access log（`file://` 时记 `not_applicable`）替代。Orca 若不支持目标 `file://` 场景，单文件项只能记为 blocked/degraded；任何证据通道都不能由 writer 自证或改成人工口头通过。模型投票不能替代原生构建、测试和浏览器证据。

---

## 8. Review And Activation Gate

- Review location：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/`
- Required verdict：至少两名非 Codex CLI 独立 review 对范围、冻结表、Phase Gate 和自治 loop 无 blocking 问题
- User approval：用户于 2026-08-11 明确授权“没问题就把 plan 迁移到 active”；因此 review 通过后可直接 activation，不追加确认轮次
- 获批后：移入 `docs/exec-plans/active/`；本 session 只完成 activation，Phase 0 由用户随后在 Orca 中开启 Goal 后开始

### 8.1 已确认决策（2026-08-11）

1. **实施基线**：以当前 `codex/project-harness-governed` 分支的单体产品代码为准；远程 pluginization 仅点采，禁止整支 merge/批量 cherry-pick。
2. **Artifact 形态**：P1 静态目录，P3 正式单文件；P0 仅验证单文件可行性。
3. **编辑器去留**：只读 Viewer 是默认主路径；旧编辑器保留为次路径，不在 P1 做同壳读写双模式。
4. **Dependency 边集合**：`constrains` 纳入主关系；`impacts` 为浅色虚线辅助关系、可隐藏、不参与主排序。
5. **数据注入**：Artifact 主路径采用构建时嵌入 Spec；P1 不做运行时打开本地 `.acm.md`。
6. **插件化计划归档**：当前分支无该 active plan，记为不适用；本计划不执行导入、归档或远程分支改写。
7. **执行自治**：使用 Orca + Codex CLI Goal；Grok/Claude/Kimi 承担独立讨论与审核；协调者自主决定普通执行方向与验收，不反复请求用户确认。

### 8.2 Review Disposition / 评审结论

- [x] Viewer 主路径、编辑器显式次路径与 Artifact 纯只读构建面已拆清。
- [x] `App.jsx` 拆分成本进入 Phase 0/1 证据与停止条件，不在 activation 时预判成功。
- [x] Orca loop、冻结 revision、至少两名非 Codex 独立 review 与浏览器原生证据已可执行。
- [x] Phase 0 后是否新增 Accepted DEC 由 Phase 证据决定，不阻塞 activation。
- [x] 示例主题与验收人群属于 Phase 4 范围，由 coordinator 在 active 边界内决定。

### 8.3 Activation Record / 激活记录

- Activated: 2026-08-11
- User authorization: “没问题就把 plan 迁移到 active”
- Reviewed candidate SHA-256: `9186323ecb9d72fa2b5140587818fef0229bebeb0ff0e041ea68204c1b63056c`
- Final independent verdicts: Grok `approve/high`（`review-006.md`）；Claude `approve/high`（`review-007.md`）；均无 blocking finding
- Post-review delta: status/authority/section title、review disposition、本 activation record，以及下述用户直接授权的资源约束修订
- Execution state: Phase 0 accepted 2026-08-12；Phase 1 ready

### 8.4 User Amendment / 用户修订（2026-08-11）

- 用户撤销此前的 Codex 账户额度保留要求，并明确允许长时间运行。
- 与账户额度读取、百分比阈值及自动停止相关的 Goal 前置条件全部移除；不再阻塞 Phase 0 启动。
- 本修订不改变产品范围、Phase Gate、独立 review、local-first、单写者或 Git/发布权限边界。

### 8.5 Phase 0 Acceptance Record / 验收记录（2026-08-12）

- Frozen HEAD: `f88b0c3a1b5453a1d08b93f14078ca3f31edb5b9`
- Frozen source-manifest SHA-256: `2e05af54a090b42a0ab7aba9fdb73c3ba64e0ba45d5b6350c5ec9a26006d9d23`
- Native evidence: `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/phase-0-evidence-001.md`
- Independent verdicts: Grok `review-008.md` approve/high；Claude `review-009.md` approve/medium-high；均无 blocking finding
- Outcome: 静态目录与 dagre-only 单文件均可行；原编辑器构建、严格 ACM-MD fixture、harness、单测和启动文档预算通过；Phase 1 可开始。
- Deferred hardening: 目录 `file://` 不作为 Gate；ELK 体积断言、CSP 与内联 closing-tag escaping 留给 Phase 3 正式构建。

---

## 9. Appendix — Git Readback Snapshot

```text
Date:     2026-08-11
Root:     /Users/neowang/Desktop/Star Gate/agent-context-map
Branch:   codex/project-harness-governed
HEAD:     37ace47
Recent:
  37ace47 Harden governed harness validation and Python checks
  c9cadf7 chore(harness): establish governed project workflow
  2d570d4 docs(handoff): C+D 已合并进 main…
Remote pluginization tip (evidence only): 4ed712c docs: add honest product retrospective
Local Orca: 1.4.180 ready; orchestration contract available
Local CLIs: codex 0.147.0; grok 1.0.0; Claude Code 2.1.224; Kimi 0.31.0
Activation baseline was committed separately as f88b0c3 before the Phase 0 source manifest was frozen.
```
