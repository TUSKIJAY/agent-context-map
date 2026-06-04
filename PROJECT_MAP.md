# PROJECT_MAP.md

本文件描述当前项目的相对路径、文件职责和修改入口。Agent 接手项目、定位代码或规划改动前，应先阅读本文件。

## 根目录

```text
AGENTS.md
```

Agent 工作约定。记录 Git 外置规则、项目边界、文档约定、提交流程、依赖管理和验证要求。

```text
HANDOFF.md
```

项目交接说明。记录当前状态、建议优先任务、后续方向、暂缓事项和验收建议。

```text
PROJECT_MAP.md
```

项目地图。说明各目录和文件的用途，帮助快速定位修改入口。

```text
README.md
```

面向使用者的项目说明。包括项目定位、核心能力、本地运行方式、目录结构、协议说明和技术栈。

```text
.gitignore
```

Git 忽略规则。用于排除依赖目录、构建产物、环境变量、本地缓存和系统垃圾文件。

```text
index.html
```

Vite HTML 入口。包含页面挂载点、字体与全局外壳相关设置。

```text
package.json
```

Node 项目配置。定义项目名称、版本、依赖和脚本命令。

```text
package-lock.json
```

npm 依赖锁定文件。新增或更新依赖时应同步更新。

```text
vite.config.js
```

Vite 构建配置。当前主要配置 React 插件。

## src

```text
src/main.jsx
```

React 应用入口。负责把根组件挂载到页面 DOM。

```text
src/App.jsx
```

应用主组件。负责整体三栏布局、顶部工具栏、全局状态、撤销重做、文件打开保存、导出、候选关系菜单和 Tweaks 浮层接入。

适合修改：

- 应用级状态管理
- 工具栏按钮
- 导入导出流程
- 撤销重做逻辑
- 三栏布局结构
- 文件打开与保存行为

## src/acm

```text
src/acm/Home.jsx
```

开始页（启动首屏）。列出最近打开的图谱，提供新建（选模板）、查看示例、导入入口。替代"启动即演示"。

适合修改：

- 开始页布局与入口
- 最近打开列表展示
- 空状态文案

```text
src/storage/store.js
```

本地持久化抽象层。文档级 CRUD + app_state + 快照。两套后端：桌面走 SQLite（`@tauri-apps/plugin-sql`，表由 `src-tauri/src/lib.rs` 迁移创建），浏览器 dev 走 localStorage 兜底。图谱正文按整份 JSON 存储，保证 ACM-MD 往返不丢字段。

适合修改：

- 文档读写 / 最近列表查询
- 自动保存与基线（saveBody / saveBaseline）
- 应用状态（last_opened_doc_id、视口 vp:<docId>）
- 历史快照

```text
src/storage/files.js
```

磁盘文件读写。打开/导入用 `<input type=file>`（浏览器与 WebView2 通用）；另存/导出用桌面原生 `dialog.save()`+`fs.writeTextFile`，浏览器回退 `<a download>`。配合 `data.js` 的 `parseAcmMd`（ACM-MD 导入解析）。

适合修改：

- 文件打开/导入入口
- 导出到磁盘（另存为）
- 文件类型过滤

```text
src/acm/data.js
```

ACM 核心数据与纯函数。包含受控词表、视觉 token、示例图谱、关系推断、校验、Diff 生成、导出转换等逻辑。

适合修改：

- 节点类型
- 关系类型
- 节点状态
- 边状态
- 示例图谱
- 校验规则
- Agent Diff 生成
- ACM-MD / JSON / Mermaid 导出逻辑
- 关系推断规则

```text
src/acm/Canvas.jsx
```

图谱画布组件。负责节点与边的可视化渲染，以及平移、缩放、节点拖拽、连线、选中、高亮等交互。

适合修改：

- 画布交互
- 节点渲染样式
- 边渲染样式
- 拖拽行为
- 连线行为
- 缩放和平移体验
- 邻居高亮与选中效果

```text
src/acm/Panels.jsx
```

左右侧面板组件。包括左侧文档信息和图例，以及右侧 Inspector、Agent Diff、校验面板。

适合修改：

- 节点详情编辑
- 边详情编辑
- Diff 展示
- 校验问题展示
- 左侧元信息
- 节点类型图例
- 面板标签页结构

```text
src/acm/TweaksPanel.jsx
```

右下角 Tweaks 设置浮层。负责节点卡片样式、网格显示、主色等界面偏好设置。

适合修改：

- UI 偏好设置
- 节点样式模式
- 网格开关
- 主题主色设置
- Tweaks 面板表单控件

## doc

```text
doc/03-ACM-MD格式规范指导文件.md
```

ACM-MD 协议规范。定义数据格式、字段含义、节点与边结构、校验字段和 Agent 交接语义。协议相关变更必须同步检查此文件。

```text
doc/01-Agent-Context-Map-工具开发/plan/01-Agent-Context-Map-工具开发Plan.md
```

Agent Context Map 工具开发计划。记录最初的产品目标、实现阶段、功能拆分和技术方案。

```text
doc/01-Agent-Context-Map-工具开发/review/review-001.md
doc/01-Agent-Context-Map-工具开发/review/review-002.md
doc/01-Agent-Context-Map-工具开发/review/review-003.md
doc/01-Agent-Context-Map-工具开发/review/review-004.md
doc/01-Agent-Context-Map-工具开发/review/review-005.md
```

Agent Context Map 相关评审记录。用于追踪方案、实现或交付物的审阅意见。

```text
doc/02-任务拆解大师改造/plan/02-任务拆解大师改造Plan.md
```

任务拆解大师改造计划。记录与 ACM-MD 或任务拆解工作流相关的扩展设想。

## src-tauri（桌面壳 / 绿色版 exe）

```text
src-tauri/tauri.conf.json
```

Tauri v2 桌面配置。定义 `productName`、`identifier`、主窗口尺寸、`frontendDist`（指向 `../dist`）和构建钩子。修改窗口、打包标识、前端产物路径时改这里。

```text
src-tauri/Cargo.toml
```

Rust 端依赖与包配置。包名 `agent-context-map`，release 二进制为 `agent-context-map.exe`。

```text
src-tauri/src/main.rs
src-tauri/src/lib.rs
src-tauri/build.rs
```

桌面壳入口与构建脚本。`main.rs` 调用 `lib.rs` 的 `run()` 启动 Tauri；当前仅承载前端，未接入本地文件能力。

```text
src-tauri/capabilities/default.json
src-tauri/icons/
```

Tauri 权限能力声明与应用图标（当前为脚手架默认图标）。

适合修改：

- 桌面窗口与打包配置
- 应用标识与图标
- 后续接入 Tauri 本地文件 / 持久化能力

构建绿色版 exe：

```text
npm run tauri:build -- --no-bundle
```

## 生成与本地目录

```text
output/portable/Agent Context Map/
```

绿色版 exe 交付目录。含 `Agent Context Map.exe` 与 `version.txt`。由打包后从 `src-tauri/target/release/` 复制改名生成，属构建产物，不应提交。

```text
src-tauri/target/
src-tauri/gen/
```

Rust 编译缓存与 Tauri 生成文件，不应提交。

```text
dist/
```

Vite 构建产物目录。由 `npm run build` 生成，不应提交。

```text
node_modules/
```

npm 依赖目录，不应提交。

```text
.vite/
```

Vite 本地缓存目录，不应提交。

```text
.claude/
```

本地 Agent/Claude 相关目录，不应提交。

```text
.git
```

Git 指针文件，不是真实 `.git/` 目录。真实 Git 数据位于：

```text
D:\git-stores\stargate\LLM_project_agent思维导图.git
```
