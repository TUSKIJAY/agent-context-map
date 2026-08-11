# PROJECT_MAP.md

本文件是项目的路径导航：说明“什么内容在哪、某类改动先看哪里”。规则、状态和实施权限分别以 `AGENTS.md`、`PROGRESS.md` / `HANDOFF.md` 和 `docs/` 生命周期为准。

## 根目录控制面

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | 唯一 Agent 规则入口：启动顺序、任务分级、硬边界、Git 与验证要求 |
| `CLAUDE.md` | 到 `AGENTS.md` 的兼容指针，不复制规则 |
| `INSTRUCTIONS.md` | 稳定项目目标、技术事实、数据不变量和验证基线 |
| `PROGRESS.md` | 当前项目级状态、阻塞、待办、验证结果和历史入口 |
| `HANDOFF.md` | 最新 session 的停点、最近证据和单一下一步 |
| `PROJECT_MAP.md` | 本路径地图 |
| `README.md` | 面向普通使用者的产品说明与运行方法 |
| `.harness/config.json` | machine-readable harness profile 和原生验证命令 |
| `package.json` | Node 依赖与开发、构建、预览和 Tauri 脚本 |
| `vite.config.js` | Vite + React 构建配置 |
| `index.html` | Vite HTML 入口 |

## 应用源码

| Path | Responsibility |
| --- | --- |
| `src/main.jsx` | React 应用挂载入口 |
| `src/App.jsx` | 首页/编辑器切换、全局状态、工具栏、撤销重做、自动保存、打开和导出 |
| `src/acm/Home.jsx` | 开始页、最近图谱、新建、示例和导入入口 |
| `src/acm/FlowCanvas.jsx` | React Flow 画布、节点、边、拖拽、布局、分组和折叠交互 |
| `src/acm/Panels.jsx` | Inspector、Agent Diff、校验结果及左右侧栏 |
| `src/acm/TweaksPanel.jsx` | 节点样式、网格和主色等显示偏好 |
| `src/acm/data.js` | ACM 数据契约、受控词表、关系推断、校验、Diff、导入和导出 |
| `src/storage/store.js` | 文档、本地应用状态、基线和快照的浏览器/Tauri 持久化抽象 |
| `src/storage/files.js` | 打开、导入、另存和导出到磁盘的浏览器/Tauri 适配 |

## Tauri 桌面层

| Path | Responsibility |
| --- | --- |
| `src-tauri/src/lib.rs` | Tauri builder、SQLite migration 和桌面命令 |
| `src-tauri/src/main.rs` | 桌面进程入口 |
| `src-tauri/tauri.conf.json` | 应用标识、窗口、构建和前端产物配置 |
| `src-tauri/capabilities/default.json` | Tauri 权限声明 |
| `src-tauri/Cargo.toml` | Rust 包与依赖 |
| `src-tauri/icons/` | 应用图标 |

## ACM-MD Skill

| Path | Responsibility |
| --- | --- |
| `skills/acm-md/SKILL.md` | 生成、读取、修复和验证 ACM-MD 的调用约定 |
| `skills/acm-md/references/acm-md-v0.1.md` | 被 Git 跟踪的 ACM-MD v0.1 唯一规范 |
| `skills/acm-md/scripts/validate_acm_md.py` | ACM-MD 结构、关系和悬空边校验器 |
| `skills/acm-md/requirements.txt` | Python 校验器的可安装依赖声明 |
| `skills/acm-md/examples/valid-basic.acm.md` | 严格模式可复现 smoke fixture |
| `skills/acm-md/agents/openai.yaml` | Skill 接入元数据 |

## 文档与治理

| Path | Responsibility |
| --- | --- |
| `docs/README.md` | 文档权威、生命周期和放置地图 |
| `docs/exec-plans/` | proposed、active、completed 和 reviews 生命周期 |
| `docs/decisions/` | Accepted/Proposed 决策记录 |
| `docs/optimization/` | record-only 优化 intake |
| `docs/progress-archive/` | 从启动文档迁出的历史证据 |
| `doc/` | 若本地存在则视为被忽略且冻结的 legacy 资料；仅供历史回查 |

## Harness 工具

| Path | Responsibility |
| --- | --- |
| `scripts/check-project-harness.py` | 必需文件、非空内容、关键契约锚点和 profile/config 一致性检查 |
| `scripts/tests/test_project_harness.py` | checker 的通过与负向退化测试 |
| `scripts/check-startup-doc-budget.py` | 五份强制启动文档的行数和字节预算检查 |

## 生成与本地目录

以下路径不应提交：

- `node_modules/`、`dist/`、`.vite/`。
- `src-tauri/target/`、`src-tauri/gen/`。
- `output/`（绿色版桌面交付物）。
- `.venv/`、`__pycache__/`、Python bytecode。
- `.claude/`、`.env*`、日志、缓存和系统垃圾。

Git 数据位置由当前 checkout 决定；始终使用 `git rev-parse --show-toplevel` 和 `git rev-parse --git-dir` 读取，不在项目地图中硬编码机器路径或 `.git` 形态。
