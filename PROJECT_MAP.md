# PROJECT_MAP.md

本文件是项目路径地图。规则与状态分别以 `AGENTS.md`、`INSTRUCTIONS.md`、`PROGRESS.md` 和 `HANDOFF.md` 为准。

## 根目录控制面

| Path | Responsibility |
| --- | --- |
| `AGENTS.md` | 唯一 Agent 规则入口：启动顺序、硬边界、Git 与验证要求 |
| `CLAUDE.md` | 到 `AGENTS.md` 的兼容指针，不复制规则 |
| `INSTRUCTIONS.md` | 稳定项目目标、架构事实和数据不变量 |
| `PROGRESS.md` | 当前生命周期真相、在制事项、短日志和归档入口 |
| `HANDOFF.md` | 最新恢复点、证据、阻塞与下一闸门 |
| `PROJECT_MAP.md` | 本路径地图 |
| `README.md` | 面向普通使用者的产品说明与运行方法 |
| `.harness/config.json` | machine-readable harness profile 和验证命令 |
| `package.json` | Node 依赖与 dev/build/harness/Tauri 脚本 |
| `vite.config.js` | Vite + React 构建配置 |
| `index.html` | Vite HTML 入口 |

## 应用源码

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Desktop composition root；选择并注入 Tauri / Browser platform adapters |
| `src/platform/index.js` | 唯一运行时平台选择入口；editor 内部不得自行探测宿主 |
| `src/platform/tauri/` | Tauri store、文件导出与 Agent command adapters |
| `src/platform/browser/` | 明示为 isolated demo 的 localStorage、浏览器文件和下载 adapters |
| `src/acm/data.js` | 到 `packages/acm-editor/src/data.js` 的兼容导出；新实现从 editor package 引用 |
| `src/acm/agentClient.js` | Tauri Agent command 结果归一化与显式 legacy diagnostics adapter；产品操作只产出 camelCase |
| `src/storage/store.js` | 旧调用方到 composition-selected store adapter 的兼容 facade |
| `src/storage/tauriProjectStore.js` | Tauri 项目根选择、ACM-MD 扫描/校验、revision 前置条件、index 重建与 legacy SQLite 迁移 UI adapter |
| `src/storage/files.js` | Tauri/浏览器文件打开、导入、另存和导出 |
| `src/main.jsx` | React 挂载入口 |

## 共享编辑器

| Path | Responsibility |
| --- | --- |
| `packages/acm-editor/src/AcmEditorShell.jsx` | 平台无关 editor shell；工具栏、文档会话、pending proposal 与正式 Diff 编排 |
| `packages/acm-editor/src/document-controller.js` | create/open/save/import、baseline、undo/redo 和 dirty state controller |
| `packages/acm-editor/src/contracts.js` | Store / files / Agent / export / host capability 契约与 mock adapter |
| `packages/acm-editor/src/FlowCanvas.jsx` | React Flow 画布；PNG/SVG 通过注入的 export adapter 执行 |
| `packages/acm-editor/src/Panels.jsx` | Inspector、Agent、待采纳 proposal、正式 Diff 与校验面板 |
| `packages/acm-editor/src/data.js` | UI 词表、布局和到 `acm-core` 的 editor 兼容入口 |
| `tests/acm-editor/` | document controller、mock adapter 与 pending-only contract 回归 |
| `tests/import-boundaries/` | editor 依赖闭包、composition 注入、最小 capability 与 canonical operation 静态 Gate |

## 共享核心

| Path | Responsibility |
| --- | --- |
| `packages/acm-core/src/schema.js` | ACM-MD v0.1 受控词表、字段与 canonical operation 名称 |
| `packages/acm-core/src/parse.js` | strict 单 fence 解析与 tolerant preview 导入 |
| `packages/acm-core/src/serialize.js` | 确定性 ACM-MD 规范化与序列化 |
| `packages/acm-core/src/validate.js` | JS strict/tolerant validator；与 Python validator 做 golden parity |
| `packages/acm-core/src/diff.js` | 正式文档 Diff 与确定性 `changes` 构建 |
| `packages/acm-core/src/operations.js` | 唯一 camelCase operation schema、legacy input adapter、precondition 与原子应用 |
| `packages/acm-core/src/revision.js` | canonical bytes 与 SHA-256 revision |
| `packages/acm-core/src/context.js` | selection/subgraph/execution context 安全裁剪 |
| `packages/acm-core/src/pending.js` | pending proposal 纯函数；不接正式存储 |
| `packages/acm-core/src/index.js` | platform-free 公共导出 |

## 项目文件存储

| Path | Responsibility |
| --- | --- |
| `packages/project-store/src/project-store.js` | Node project store：`.acm` 扫描、strict validation、revision、expectedRevision、写入和可重建 index |
| `packages/project-store/src/locks.js` | 公平进程内互斥、跨进程 SHA-256 lock-file 协议和幂等 mutation registry |
| `packages/project-store/src/safe-replace.js` | 同目录 temp、flush/fsync、安全替换和故障注入 |
| `packages/project-store/src/migration-preview.js` | platform-free legacy row 预览、字段保留检查和 round-trip 判定 |
| `packages/project-store/src/sqlite-migration.js` | Node fixture/CLI 的只读 SQLite、备份、apply 与 rollback |
| `tests/fixtures/project-store/` | 可重建 index 与项目 ACM-MD fixture |

## Tauri 桌面层

| Path | Responsibility |
| --- | --- |
| `src-tauri/src/lib.rs` | Tauri builder、project-store / migration 命令注册和 agy CLI bridge |
| `src-tauri/src/project_store.rs` | 原生项目扫描、跨运行时锁、same-volume safe replace、delete recovery copy 与 recovery evidence |
| `src-tauri/src/legacy_sqlite.rs` | `sqlx` read-only legacy SQLite preview 与用户状态目录备份；不提供 SQL write path |
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

所有新的计划、评审、决策、优化记录、进度归档和 Agent 过程文档都必须通过上述 `docs/` 入口落位并维护索引。

### `doc/`（冻结的本地 legacy）

保留早期产品计划、评审、handoff 和协议镜像，仅供必要的历史回查。今后不得在 `doc/` 新增、更新或同步任何文件，也不得把其中内容作为当前规范、计划、评审、状态或执行权限来源。

ACM-MD v0.1 的唯一可追踪规范是 `skills/acm-md/references/acm-md-v0.1.md`；`doc/` 中的旧镜像不再同步。

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

项目唯一权威根目录是 `D:\Code\agent-context-map`。该目录使用普通项目内 `.git/`；原星际之门目录及其外置 Git store 只保留为迁移来源，不再作为开发入口。
