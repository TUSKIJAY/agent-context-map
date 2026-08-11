# Agent Context Map · Stable Instructions

## Objective

维护一个基于 ACM-MD v0.1 的本地优先图谱编辑器，把需求澄清、任务拆解和 Agent 协作上下文转成可视化、可编辑、可校验、可导出的结构化图谱，并让多轮开发能够安全启动、验证和交接。

## Stable Project Facts

- 应用版本：`0.2.0`。
- 前端：Vite 5、React 18、React Flow、原生 CSS / 内联样式。
- 布局：Dagre 默认，ELK 按需加载；支持子树折叠、分组容器、组级折叠和正交边。
- 桌面：Tauri 2；浏览器开发模式以 localStorage 兜底，桌面端使用本地 SQLite 与文件接口。
- 协议：`ACM-MD v0.1`；正式规范位于 `skills/acm-md/references/acm-md-v0.1.md`。
- Harness profile：`governed`。
- 当前仓库没有 CI 配置和独立 `test` script；`npm run build` 是已确认的产品原生基线。

项目不依赖远程后端即可运行。除非用户明确批准架构变化，不新增服务器、云数据库、遥测或强制联网能力。

## Stable Invariants

1. 正式图谱数据与导出必须保持 ACM-MD v0.1 语义一致。
2. 布局、折叠、分组、容器、边折点、选择态和显示偏好不得污染正式协议数据或导出。
3. 协议、解析、校验、Agent Diff 和导出相关改动必须同步检查，不能只改其中一层。
4. 浏览器和 Tauri 存储实现可以不同，但都必须保持图谱正文往返语义，不得静默丢字段。
5. 依赖和 Tauri 权限按最小必要原则调整；新增运行时依赖必须同步 `package-lock.json`。

## Responsibility Routing

- 仓库规则、任务分级、Git 边界与验证要求：`AGENTS.md`。
- 文件职责和修改入口：`PROJECT_MAP.md`。
- 当前项目状态与最新恢复点：`PROGRESS.md`、`HANDOFF.md`。
- 文档生命周期与放置规则：`docs/README.md`。
- 用户安装、运行和产品能力：`README.md`。

本文件只维护长期稳定的产品事实与不变量，不复制路径地图、治理流程或会话状态。

## Verification Baseline

产品生产构建：

```bash
npm run build
```

Harness 结构与启动文档预算：

```bash
python3 scripts/check-project-harness.py --root . --profile auto
python3 scripts/check-startup-doc-budget.py --root .
```

Tauri 打包只在桌面壳、Rust 端、权限或桌面交付物相关任务中运行：

```bash
npm run tauri:build -- --no-bundle
```
