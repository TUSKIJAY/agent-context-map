# AGENTS.md

本文件是当前项目 `agent思维导图` 的 Agent 工作约定。任何 Agent 在本目录内进行 Git 操作前，都必须先阅读并遵守本文件。

## 项目定位

本项目是 `Agent Context Map`，一个基于 `ACM-MD v0.1` 协议的本地前端图谱编辑器。它的核心目标是把任务拆解、需求澄清和 Agent 协作上下文转成可视化、可编辑、可校验、可导出的结构化图谱。

项目当前技术栈：

- Vite
- React 18
- 原生 CSS / 内联样式
- 纯前端本地状态管理

核心源码目录：

```text
src/
  App.jsx
  main.jsx
  acm/
    Canvas.jsx
    Panels.jsx
    TweaksPanel.jsx
    data.js
```

## 工作边界

- 优先保持本项目为纯前端本地应用，不要擅自引入后端服务、数据库或云端依赖。
- 不要擅自改变 `ACM-MD v0.1` 的核心数据契约；如需调整协议，必须同步更新 `doc/03-ACM-MD格式规范指导文件.md`。
- 修改图谱数据结构、校验规则、导入导出逻辑时，优先检查并更新 `src/acm/data.js`。
- 修改画布交互时，优先检查 `src/acm/Canvas.jsx`。
- 修改侧栏、Inspector、Diff、校验面板时，优先检查 `src/acm/Panels.jsx`。
- 修改全局布局、工具栏、撤销重做、文件打开保存、导出等应用级逻辑时，优先检查 `src/App.jsx`。
- 不要提交构建产物、缓存、依赖目录或本地私有配置。

## 文档约定

- `README.md` 面向普通使用者，说明项目是什么、如何运行、核心能力是什么。
- `AGENTS.md` 面向 Agent，记录操作约束、Git 规则、项目边界和验证流程。
- `HANDOFF.md` 面向后续 Agent，记录当前状态、建议优先任务、暂缓事项和接手检查。
- `PROJECT_MAP.md` 面向维护者和 Agent，记录项目内部相对路径、文件职责和修改入口。
- `doc/` 目录存放需求、协议、评审和计划文档，不要把临时记录混入协议文件。
- 评审类文档建议继续放在 `doc/.../review/` 下，并使用连续编号，例如 `review-006.md`。
- 计划类文档建议继续放在 `doc/.../plan/` 下；接手说明放在根目录 `HANDOFF.md`。

## Git 外置规则

本项目遵守星际之门统一 Git 外置规则：

```text
C:\Users\LENOVO\Desktop\工作\星际之门\GIT_EXTERNAL_STORE_RULES.md
```

核心要求：

- 只处理当前项目目录，不要批量扫描、批量迁移或批量初始化其他项目。
- 当前项目目录是：

```text
C:\Users\LENOVO\Desktop\工作\星际之门\LLM\project\agent思维导图
```

- 真实 Git 数据必须放在外部目录：

```text
D:\git-stores\stargate\LLM_project_agent思维导图.git
```

- 当前项目目录内只保留 `.git` 指针文件，不允许创建真实 `.git/` 文件夹。
- 如果发现当前目录已经有 `.git`，必须先判断它是指针文件还是目录，不要直接覆盖或删除。
- 如果发现上级目录也有 Git 仓库，不要误操作上级仓库；本项目是独立嵌套仓库。

## Git 操作前检查

在进行 `git add`、`git commit`、`git push`、迁移或初始化前，先执行：

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
```

期望结果：

```text
show-toplevel => C:/Users/LENOVO/Desktop/工作/星际之门/LLM/project/agent思维导图
git-dir       => D:/git-stores/stargate/LLM_project_agent思维导图.git
```

如果 `git rev-parse --git-dir` 指向项目目录内的 `.git` 文件夹，说明不符合外置规则，必须先按 `GIT_EXTERNAL_STORE_RULES.md` 修正。

## 当前远端仓库

当前项目已关联 GitHub：

```text
origin => https://github.com/TUSKIJAY/agent-context-map.git
branch => main
```

日常同步命令：

```powershell
git status --short --branch
git pull
git push
```

## 忽略规则

不要提交以下内容：

- `node_modules/`
- `dist/`
- `.vite/`
- `.claude/`
- `.env`
- `.env.*`
- 日志文件
- 本地缓存、构建产物和系统垃圾文件

如需修改忽略规则，优先编辑当前目录的 `.gitignore`。

## 提交流程

推荐流程：

```powershell
git status --short --branch
git diff
git add <明确需要提交的文件>
git commit -m "<简短提交说明>"
git push
```

不要在工作区有不明来源改动时直接执行：

```powershell
git add -A
```

除非用户明确确认当前所有改动都属于本次提交。

如果工作区已有其他 Agent 或用户产生的改动，只提交本次任务明确相关的文件。不要为了清理状态而回滚、覆盖或格式化无关文件。

## 前端验证

本项目是 Vite + React 应用。修改源码后优先运行：

```powershell
npm run build
```

如果需要本地预览：

```powershell
npm run dev
```

文档-only 修改通常不需要运行构建，但如果同时改动 `src/`、`index.html`、`package.json` 或 `vite.config.js`，必须至少运行一次：

```powershell
npm run build
```

## 依赖管理

- 新增依赖前先确认是否真的需要；优先使用现有 React/Vite 能力。
- 新增运行时依赖后必须同步更新 `package-lock.json`。
- 不要提交 `node_modules/`。
- 不要为了单个小功能引入体积很大的库，除非用户明确要求或收益明显。

## 接手与项目地图

后续 Agent 接手时，除本文件外还应阅读：

```text
HANDOFF.md
PROJECT_MAP.md
```

`HANDOFF.md` 记录当前状态和下一步建议；`PROJECT_MAP.md` 记录文件路径和职责。实现新功能前应先查看这两个文件，确认修改入口和任务边界。
