# Agent Context Map · Stable Instructions

## Objective

维护一个基于 ACM-MD v0.1 的本地优先图谱编辑器，把需求澄清、任务拆解和 Agent 协作上下文转成可视化、可编辑、可校验、可导出的结构化图谱，并让多轮开发能够安全启动、验证和交接。

## Product And Stack

- 前端：Vite 5、React 18、React Flow、原生 CSS / 内联样式。
- 布局：Dagre 默认，ELK 按需加载；分组、折叠、边折点与引擎选择均为派生视图状态。
- 桌面：Tauri 2，SQLite 本地持久化，浏览器开发模式使用 localStorage fallback。
- Agent 协作：前端将外部结果归一化为 `pendingAgentPatch`；桌面端可调用 agy CLI，不可用时保留 mock fallback。
- 数据契约：ACM-MD v0.1；正式规范位于 `skills/acm-md/references/acm-md-v0.1.md`。

项目不依赖远程后端即可运行。除非用户明确批准架构变化，不新增服务器、云数据库或强制联网能力。

## Stable Invariants

1. 正式 `doc.nodes` / `doc.edges` 与导出结果必须保持 ACM-MD 往返语义。
2. 布局、折叠、分组、选择态和未采纳 Agent 建议不得污染正式协议数据。
3. Agent 输出必须先归一化和校验，再作为 pending patch 展示；只有人工采纳的 operation 才可进入正式图谱。
4. 外部 Agent 建议不得直接成为 `confirmed`。
5. 图谱正文按整份 JSON 本地保存；修改存储层时保持浏览器 fallback 与桌面路径的兼容边界。
6. 依赖和 Tauri 权限按最小必要原则调整。

## Repository Structure

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | 应用级状态、布局、工具栏、撤销重做、Agent 协作接入、文件与导出 |
| `src/acm/data.js` | ACM 数据、纯函数、校验、Diff、导入导出、patch apply/reject |
| `src/acm/agentClient.js` | agy / Tauri / MCP / sidecar 调用与结果归一化 |
| `src/acm/FlowCanvas.jsx` | React Flow 画布、布局、分组、折叠、节点和边 |
| `src/acm/Panels.jsx` | Inspector、Agent、建议变更和校验 UI |
| `src/storage/` | SQLite/localStorage 持久化与文件读写 |
| `src-tauri/` | 桌面命令、能力、配置和 Rust 入口 |
| `skills/acm-md/` | 可分发的 ACM-MD skill、规范与校验器 |
| `docs/` | 被跟踪的 harness 治理和历史索引 |
| `doc/` | 本地忽略的产品过程资料与旧记录 |

详见 `PROJECT_MAP.md`。

## Verification

从仓库根目录运行：

```powershell
npm run harness:check
npm run harness:budget
npm run build
```

按任务补充：

- 桌面/Rust 改动：`npm run tauri:build -- --no-bundle` 或更窄的 Rust/Tauri 检查。
- ACM-MD 文件：`python skills/acm-md/scripts/validate_acm_md.py <file>`。
- UI 行为：在构建通过后运行 `npm run dev`，完成针对性浏览器检查。

结构检查只证明 harness 文件和配置存在；功能结论必须来自原生验证。

## Governance

- Harness profile：`governed`。
- `AGENTS.md` 是唯一规则入口，`CLAUDE.md` 仅为兼容指针。
- `PROGRESS.md` 是当前生命周期状态面，`HANDOFF.md` 是最新恢复索引。
- `docs/exec-plans/` 管理需要正式 plan/review/activation 的工作。
- `docs/optimization/` 为 record-only intake。
- `docs/progress-archive/` 保存移出启动路径的长期证据。

## Git And Generated Files

- 当前工作树使用外置 Git 数据目录；检查方式和提交纪律见 `AGENTS.md`。
- 不提交 `node_modules/`、`dist/`、`.vite/`、`src-tauri/target/`、`src-tauri/gen/`、`output/`、`.env*` 或本地缓存。
- `doc/` 当前被忽略；不要把其中旧计划误当成当前 active plan。
