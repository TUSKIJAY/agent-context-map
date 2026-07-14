# PROJECT_MAP.md

本文件是项目路径地图。规则与状态分别以 `AGENTS.md`、`INSTRUCTIONS.md`、`PROGRESS.md` 和 `HANDOFF.md` 为准。

## 根目录控制面

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | 唯一 Agent 规则入口：启动顺序、硬边界、Git 与验证要求 |
| `CLAUDE.md` | 到 `AGENTS.md` 的兼容指针，不复制规则 |
| `INSTRUCTIONS.md` | 稳定项目目标、架构事实、数据不变量和验证命令 |
| `PROGRESS.md` | 当前生命周期真相、在制事项、短日志和归档入口 |
| `HANDOFF.md` | 最新恢复点、证据、阻塞与下一闸门 |
| `PROJECT_MAP.md` | 本路径地图 |
| `README.md` | 面向普通使用者的产品说明与运行方法 |
| `.harness/config.json` | machine-readable harness profile 和验证命令 |
| `package.json` | Node 依赖与 dev/build/harness/Tauri 脚本 |
| `vite.config.js` | Vite + React 构建配置 |
| `index.html` | Vite HTML 入口 |

## 应用源码

### `src/App.jsx`

应用主组件，负责：

- 首页/编辑器切换、三栏布局与工具栏。
- 文档状态、选择态、撤销重做、自动保存。
- 打开、另存、导入、导出。
- Agent 会话状态、pending patch、采纳/拒绝和 toast。

### `src/acm/data.js`

ACM 核心数据与纯函数：

- 节点/关系/状态受控词表与示例图谱。
- 关系推断、校验、Diff。
- ACM-MD / JSON / Mermaid 的解析与导出。
- Agent patch 的预览、统计、更新、应用和拒绝。

数据结构、协议语义、校验或导入导出改动优先从这里开始。

### `src/acm/agentClient.js`

Agent 适配边界：

- 按顺序尝试 window agy、Tauri invoke、MCP、sidecar。
- 将外部返回归一化为 `pendingAgentPatch`。
- 防止 Agent 输出直接成为 `confirmed`。
- 外部能力不可用时回退到本地 mock。

### `src/acm/FlowCanvas.jsx`

React Flow 画布：

- 节点、边、拖拽、连线、缩放和平移。
- Dagre / ELK 布局、正交边、分组容器。
- 子树与组折叠、Agent 建议预览层。

布局、画布交互和建议层视觉改动优先从这里开始。

### `src/acm/Panels.jsx`

侧栏与右侧面板：

- Inspector。
- Agent 对话。
- 建议变更的逐项校正、采纳和拒绝。
- 校验结果与导航。

### `src/acm/Home.jsx`

开始页：最近文档、新建、示例和导入入口。

### `src/acm/TweaksPanel.jsx`

显示偏好：节点样式、网格和主色等。

### `src/storage/store.js`

本地持久化抽象：

- Tauri 桌面端使用 SQLite。
- 浏览器开发模式使用 localStorage fallback。
- 文档 CRUD、app state、baseline 和历史快照。

### `src/storage/files.js`

文件打开、导入、另存和导出；桌面使用 Tauri dialog/fs，浏览器使用 input/download fallback。

### `src/main.jsx`

React 挂载入口。

## Tauri 桌面层

| Path | Responsibility |
| --- | --- |
| `src-tauri/src/lib.rs` | Tauri builder、SQLite migration、`request_agent_patch` 命令和 agy CLI bridge |
| `src-tauri/src/main.rs` | 桌面进程入口 |
| `src-tauri/tauri.conf.json` | 应用标识、窗口、构建和前端产物配置 |
| `src-tauri/capabilities/default.json` | Tauri 权限声明 |
| `src-tauri/Cargo.toml` | Rust 包与依赖 |
| `src-tauri/icons/` | 应用图标 |

绿色版构建：

```powershell
npm run tauri:build -- --no-bundle
```

## ACM-MD Skill

| Path | Responsibility |
| --- | --- |
| `skills/acm-md/SKILL.md` | 生成、读取、修复和验证 ACM-MD 的调用约定 |
| `skills/acm-md/references/acm-md-v0.1.md` | 被 Git 跟踪的 ACM-MD v0.1 规范 |
| `skills/acm-md/scripts/validate_acm_md.py` | 结构、关系与悬空边校验器 |
| `skills/acm-md/agents/openai.yaml` | skill 接入元数据 |

## 文档与治理

### `docs/`（被 Git 跟踪）

| Path | Responsibility |
| --- | --- |
| `docs/README.md` | 文档权威与放置地图 |
| `docs/exec-plans/` | proposed / active / completed / reviews 生命周期 |
| `docs/decisions/` | Accepted/Proposed 决策记录 |
| `docs/optimization/` | record-only 优化 intake |
| `docs/progress-archive/` | 从启动文档迁出的历史证据 |

### `doc/`（本地忽略）

保存早期产品计划、评审、handoff 和协议过程文档。它们可作为历史证据，但不会自动成为 active plan 或当前状态权威。

当前 `doc/03-ACM-MD格式规范指导文件.md` 与被跟踪的 `skills/acm-md/references/acm-md-v0.1.md` 内容一致；协议变更时必须同步。

## Harness 工具

| Path | Responsibility |
| --- | --- |
| `scripts/check-project-harness.py` | 结构与 profile/config 一致性检查 |
| `scripts/check-startup-doc-budget.py` | 启动文档行数/字节预算检查 |

统一入口：

```powershell
npm run harness:check
npm run harness:budget
npm run harness:validate
```

## 生成与本地目录

下列路径不应提交：

- `node_modules/`、`dist/`、`.vite/`。
- `src-tauri/target/`、`src-tauri/gen/`。
- `output/`（绿色版交付物）。
- `.claude/`、`.env*`、日志、缓存和系统垃圾。

项目根 `.git` 是指向 `D:\git-stores\stargate\LLM_project_agent思维导图.git` 的文件，不是真实 Git 目录。
