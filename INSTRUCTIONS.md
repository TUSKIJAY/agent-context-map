# Agent Context Map · Stable Instructions

## Objective

维护一个基于 ACM-MD v0.1 的本地优先图谱编辑器，把需求澄清、任务拆解和 Agent 协作上下文转成可视化、可编辑、可校验、可导出的结构化图谱，并让多轮开发能够安全启动、验证和交接。

## Product And Stack

- 前端：Vite 5、React 18、React Flow、原生 CSS / 内联样式。
- 布局：Dagre 默认，ELK 按需加载；分组、折叠、边折点与引擎选择均为派生视图状态。
- 桌面：Tauri 2；用户明确选择的项目内 `.acm/documents/*.acm.md` 是业务内容单真源，`.acm/index.json` 只是可扫描重建的导航缓存。legacy SQLite 只保留显式、只读、带备份的迁移入口，不双写；浏览器开发模式的 localStorage 仅为隔离 demo，不与项目文件同步。
- Agent 协作：前端将外部结果归一化为 `pendingAgentPatch`；桌面端可调用 agy CLI，不可用时保留 mock fallback。
- 数据契约：ACM-MD v0.1；正式规范位于 `skills/acm-md/references/acm-md-v0.1.md`。

项目不依赖远程后端即可运行。除非用户明确批准架构变化，不新增服务器、云数据库或强制联网能力。

## Stable Invariants

1. 正式 `doc.nodes` / `doc.edges` 与导出结果必须保持 ACM-MD 往返语义。
2. 布局、折叠、分组、选择态和未采纳 Agent 建议不得污染正式协议数据。
3. Agent 输出必须先归一化和校验，再作为 pending patch 展示；只有人工采纳的 operation 才可进入正式图谱。
4. 外部 Agent 建议不得直接成为 `confirmed`。
5. 正式图谱正文只保存为项目 ACM-MD；所有覆盖写必须在文档锁内校验 expected revision，并以同目录临时文件和安全替换提交。index、浏览器 localStorage、legacy SQLite、UI state 与 pending proposal 都不得成为并行业务真源。
6. 依赖和 Tauri 权限按最小必要原则调整。

## Responsibility Routing

- 仓库规则、Git 边界、计划权限与验证要求：`AGENTS.md`。
- 文件职责和修改入口：`PROJECT_MAP.md`。
- 当前状态与最新恢复点：`PROGRESS.md`、`HANDOFF.md`。
- 文档生命周期与放置：`docs/README.md`。
- 用户安装、运行和产品能力：`README.md`。

本文件只维护长期稳定的产品事实与不变量，不复制路径地图、治理流程或会话状态。

## Verification

原生产品基线：

```powershell
npm run build
```

完整验证矩阵和文档-only 要求只在 `AGENTS.md` 维护；结构检查通过不能替代产品原生验证。
