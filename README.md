<div align="center">

# Agent Context Map

**本地优先的 Visual Spec Artifact Renderer** · 把 ACM-MD 变成可离线打开、可交互浏览、可分享的结构 / 依赖 / 探询图谱。

![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![React Flow](https://img.shields.io/badge/React_Flow-12-ff0072)
![Layout](https://img.shields.io/badge/layout-dagre_%2B_elkjs-f59e0b)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)
![ACM-MD](https://img.shields.io/badge/protocol-ACM--MD_v0.1-7c5cff)
![Local First](https://img.shields.io/badge/local--first-no_backend-22c55e)

</div>

Agent Context Map（ACM）默认是一条只读 Artifact 交付路径：把结构化 Spec 渲染为普通浏览器可打开的交互图谱，让评审人不安装桌面壳、MCP 或后端也能理解目标、约束、依赖、风险和待澄清问题。原有图谱编辑器仍作为显式次入口保留，用于本地修改和 Agent Diff。

项目基于 **ACM-MD v0.1** 协议构建——*ACM-MD = Agent Context Map · Markdown*，一种用 **Markdown + YAML** 描述 Agent 任务上下文的开放文本格式，人能读、Agent 也能解析。布局、筛选、折叠、选择和视图偏好只存在于展示层，不写回协议真源。

## 最快路径：从 ACM-MD 到 Artifact

需要 Node.js 20+ 与 Python 3。首次在当前 checkout 使用时：

```bash
npm install
python3 -m venv .venv
.venv/bin/python -m pip install -r skills/acm-md/requirements.txt
```

严格校验一份真实示例并生成静态目录：

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/retail-replenishment-pilot.acm.md --mode strict
npm run build:artifact -- --spec skills/acm-md/examples/retail-replenishment-pilot.acm.md
python3 -m http.server 4174 --directory dist-artifact-dir
```

浏览器打开 `http://127.0.0.1:4174/artifact.html`。页面可切换 Structure / Dependency / Inquiry，搜索和筛选节点，查看只读 Inspector，并导出 PNG / SVG。

如需一个可直接双击或通过 `file://` 打开的文件：

```bash
npm run build:artifact:single -- --spec skills/acm-md/examples/retail-replenishment-pilot.acm.md
```

打开 `dist-artifact-single/artifact.html` 即可。构建遇到解析或结构校验错误会失败关闭，不生成可误用的有效 Artifact。

![Agent Context Map 演示](assets/screenshots/demo.gif)

> 当前图片记录原有编辑器能力；默认产品入口已经是只读 Viewer，编辑器只在用户显式选择后加载。

可选编辑器界面：

![Agent Context Map 编辑器界面](assets/screenshots/02-editor.png)

## 界面预览

<table>
  <tr>
    <td width="50%"><img src="assets/screenshots/03-inspector.png" alt="节点 Inspector 详情" /></td>
    <td width="50%"><img src="assets/screenshots/04-validate.png" alt="图谱校验面板" /></td>
  </tr>
  <tr>
    <td align="center"><b>Inspector · 逐节点编辑</b><br/>类型、状态、优先级、置信度、标签与来源一目了然</td>
    <td align="center"><b>校验 · 一键体检</b><br/>悬空边、重复 ID、未确认关系等问题实时汇总</td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/screenshots/05-export.png" alt="导出给 Agent" /></td>
    <td width="50%"><img src="assets/screenshots/01-home.png" alt="开始页" /></td>
  </tr>
  <tr>
    <td align="center"><b>导出给 Agent</b><br/>完整 ACM-MD / Agent Diff / 图谱 JSON / Mermaid 预览</td>
    <td align="center"><b>开始页</b><br/>新建、导入、查看示例，编辑自动保存到本地</td>
  </tr>
</table>

## 核心能力

- 从同一份 canonical ACM-MD 投影 Structure / Dependency / Inquiry，不复制三套业务数据。
- 只读 Viewer 支持平移、缩放、适配画布、MiniMap、中文搜索、类型/状态图例与筛选、折叠和 0–2 层关联聚焦。
- Inspector 展示稳定 ID、标题、类型、状态、描述、来源、置信度、标签和上下游关系。
- 静态目录与单文件 Artifact 均无强制外网、后端、Tauri 或 MCP 依赖；构建元数据记录源 Spec 与 canonical hash。
- PNG 与 SVG 使用同一份可移植矢量表示，包含节点、关系线、箭头和标签。
- 支持目标、模块、功能、约束、数据对象、接口、风险、假设、问题、决策和任务等节点类型。
- 原编辑器作为显式次入口保留节点拖拽、关系连线、协议校验、Agent Diff 与多格式导出。
- **双布局引擎**：dagre（分层，快速，默认）与 elkjs（ELK 正交边路由、绕开节点、少交叉、嵌套布局），工具栏一键互切。

## 可选：本地应用与编辑器

```bash
npm install
npm run dev
```

开发服务器默认运行在：

```text
http://localhost:5173
```

生产构建：

```bash
npm run build
npm run preview
```

## Artifact 构建说明

Artifact 是同一份 ACM-MD 的只读浏览器交付物，不需要 Tauri、MCP、后端或 CDN。构建前先用 repo-local `.venv` 做严格校验：

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/payment-ledger-migration.acm.md --mode strict
```

生成可拷贝的静态目录：

```bash
npm run build:artifact -- --spec skills/acm-md/examples/payment-ledger-migration.acm.md
python3 -m http.server 4174 --directory dist-artifact-dir
```

浏览器打开 `http://127.0.0.1:4174/artifact.html`。目录内的 `artifact-manifest.json` 记录 `doc_id`、`schema_version`、`generated_at`、源 Spec hash、canonical structure hash、文件 hash、体积上限和是否包含 ELK。

生成可直接双击打开的单文件：

```bash
npm run build:artifact:single -- --spec skills/acm-md/examples/payment-ledger-migration.acm.md
```

输出只有 `dist-artifact-single/artifact.html`。如需逐字节复现，给两次构建传同一个 ISO 时间；也可使用标准的 `SOURCE_DATE_EPOCH`：

```bash
npm run build:artifact:single -- --spec skills/acm-md/examples/payment-ledger-migration.acm.md --generated-at 2026-08-12T00:00:00.000Z
```

两种产物均使用 CSP、只包含本地资源、默认采用 dagre 且拒绝意外打入 ELK；Viewer 内可导出带关系线的 PNG 和不依赖 `foreignObject` 的纯 SVG。

### 真实示例

- `skills/acm-md/examples/retail-replenishment-pilot.acm.md`：连锁零售补货预警试点，29 节点 / 50 边。
- `skills/acm-md/examples/payment-ledger-migration.acm.md`：支付账本数据库零停机迁移，30 节点 / 52 边。

两份示例都通过 strict 校验，并刻意同时包含层级、依赖、约束、风险、问题和决策，让三种视图承担不同阅读任务。

### 规模建议

在 Apple Silicon / Node.js 22 的多次合成基线中，150 节点 / 225 边的 dagre 布局中位数约 0.19–0.29 秒，250 / 375 约 0.63–0.68 秒。建议：

- 日常 Artifact 控制在 **150 节点 / 225 边以内**。
- 最高到 **250 / 375** 时必须走真实浏览器专项验收，并优先使用筛选、折叠和语义投影。
- 更大规模尚未形成质量承诺，应拆分 Spec 或另做性能计划。

可用 `npm run check:viewer-performance` 在当前机器重跑基线；数字受硬件、浏览器与图结构影响，不是跨设备 SLA。

## 目录结构

```text
index.html
package.json
vite.config.js
src/
  main.jsx
  App.jsx
  acm/
    FlowCanvas.jsx     # React Flow 画布、节点、连线与 PNG/SVG 导出
    export-svg.js      # 可移植纯 SVG 导出
    Home.jsx           # 开始页
    Panels.jsx         # Inspector / Agent Diff / 校验面板
    TweaksPanel.jsx    # 显示设置
    data.js            # ACM-MD 数据契约、关系推断、校验、导入导出
src-tauri/             # Tauri 桌面壳（绿色版 exe）
skills/
  acm-md/              # ACM-MD 生成 / 校验 Agent 技能（含协议规范与校验器）
```

## 什么是 ACM-MD

**ACM-MD（Agent Context Map · Markdown）** 是本项目的核心数据契约，也是一份与具体工具无关的开放格式约定。它用 Markdown + YAML 结构描述 Agent 任务上下文，包括：

- 项目目标与范围
- 节点清单
- 节点之间的关系
- 校验结果
- Agent 可继续执行的上下文差异

详细规范见仓库内的协议文本：

```text
skills/acm-md/references/acm-md-v0.1.md
```

## Agent 技能（ACM-MD Skill）

仓库内置了一个与编辑器配套的 Agent 技能，放在 `skills/acm-md/`，让任意 Agent 都能正确地生成、读取、校验和修复 ACM-MD：

```text
skills/acm-md/
  SKILL.md                  # 技能说明与调用指引
  references/acm-md-v0.1.md # ACM-MD v0.1 协议规范（开放文本格式）
  scripts/validate_acm_md.py# ACM-MD 校验器（结构 / 关系 / 悬空边等）
  agents/openai.yaml        # Agent 接入配置
```

它让「对话式拆解 → 生成并严格校验 ACM-MD → 构建只读 Artifact → 评审 → 必要时进入编辑器修订」形成闭环。

## 技术栈

- React 18 + Vite 5
- React Flow（@xyflow/react）画布与连线
- 双布局引擎：Dagre（默认，同步）+ elkjs（ELK 嵌套布局 / 正交边路由，按需动态加载、不增重默认包）
- 可移植纯 SVG 导出（rect/path/text）+ 浏览器 Canvas PNG 栅格化
- Tauri 2 桌面打包（绿色版 exe，SQLite 本地持久化）
- 原生 CSS / 内联样式，纯前端本地状态管理

## 适用场景

- 把模糊想法拆成结构化需求图谱
- 为 Agent 编排任务上下文
- 审阅复杂需求中的目标、约束、风险和交付物
- 在多 Agent 协作前建立统一的上下文地图

## 备注

本项目是纯本地前端应用，不依赖后端服务。当前版本优先保证 ACM-MD 到离线只读 Artifact 的可重复交付；编辑、桌面壳和更深的 Agent 工作流属于可选能力。
