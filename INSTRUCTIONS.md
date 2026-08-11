# Agent Context Map · Stable Instructions

## Objective

维护一个基于 ACM-MD v0.1 的本地优先 Visual Spec Artifact Renderer，把需求澄清、任务拆解和 Agent 协作上下文转成可校验、可离线展示与分享的交互图谱。默认主路径是只读 Viewer；原图谱编辑器作为显式次入口保留。

## Stable Project Facts

- 应用版本：`0.2.0`。
- 前端：Vite 5、React 18、React Flow、原生 CSS / 内联样式。
- 布局：Dagre 默认，ELK 按需加载；支持子树折叠、分组容器、组级折叠和正交边。
- 桌面：Tauri 2；浏览器开发模式以 localStorage 兜底，桌面端使用本地 SQLite 与文件接口。
- 协议：`ACM-MD v0.1`；正式规范位于 `skills/acm-md/references/acm-md-v0.1.md`。
- 默认 App 启动进入只读 Viewer；旧编辑器只在用户显式选择“进入编辑器”后 lazy/dynamic 加载。独立 Artifact 入口不暴露编辑器或 storage/Tauri 能力。
- Viewer 从同一 canonical graph 纯投影 Structure / Dependency / Inquiry；筛选、搜索、折叠、0–2 层 focus、布局、选择和 `view` + `node` hash 都是派生状态。Structure 默认只用 `contains` 排序，Dependency 的 `impacts` 是可隐藏辅助层。
- Artifact 有正式静态目录与单文件两种构建；构建时注入通过校验的 ACM-MD、来源与 canonical hash、生成时间和协议版本。两种产物只读、无强制外网，默认只含 dagre；PNG 由同一份可移植纯 SVG 栅格化。
- 被跟踪的真实示例是零售补货试点与支付账本零停机迁移。Viewer 的本机建议规模为日常不超过 150 节点 / 225 边；250 / 375 仅作需专项浏览器验收的扩展范围，更大规模尚未形成质量承诺。
- Harness profile：`governed`。
- 当前仓库没有 CI 配置和产品级 `test` script；`npm run build` 是已确认的产品原生基线，repo-local harness checker 另有 Python `unittest` 覆盖。

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
npm run check:viewer-projections
npm run check:viewer-experience
npm run check:viewer-performance
npm run check:artifact-build
npm run check:portable-svg
```

Harness 结构与启动文档预算：

```bash
python3 scripts/check-project-harness.py --root . --profile auto
python3 -m unittest discover -s scripts/tests -p 'test_*.py'
python3 scripts/check-startup-doc-budget.py --root .
```

ACM-MD 校验器使用被 `.gitignore` 排除的 repo-local `.venv`，不安装到系统 Python，也不依赖 shell activation。首次准备和依赖变化时按 `AGENTS.md` 的跨平台命令创建/更新环境；验证时直接调用对应解释器：

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-viewer-views.acm.md --mode strict
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/retail-replenishment-pilot.acm.md --mode strict
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/payment-ledger-migration.acm.md --mode strict
```

```powershell
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-viewer-views.acm.md --mode strict
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/retail-replenishment-pilot.acm.md --mode strict
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/payment-ledger-migration.acm.md --mode strict
```

Tauri 打包只在桌面壳、Rust 端、权限或桌面交付物相关任务中运行：

```bash
npm run tauri:build -- --no-bundle
```
