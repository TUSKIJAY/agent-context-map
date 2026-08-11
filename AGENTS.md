# AGENTS.md

本文件是 `Agent Context Map` 项目的唯一 Agent 规则入口。`CLAUDE.md` 只保留到本文件的兼容指针，不复制规则。

## 启动顺序

每次接手依次读取：

1. `AGENTS.md` — 入口地图、任务分级与硬边界。
2. `INSTRUCTIONS.md` — 稳定项目事实和架构不变量。
3. `PROGRESS.md` — 当前项目级状态、阻塞和验证基线。
4. `HANDOFF.md` — 最新会话停点、证据和单一下一步。
5. `PROJECT_MAP.md` — 文件职责与修改入口。
6. 涉及正式计划、评审、决策、优化记录或历史证据时，再读 `docs/README.md`。

开始修改前执行：

```bash
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
```

不得用聊天历史、旧分支或本地忽略文档覆盖当前仓库、Git readback 和可重复验证给出的事实。

## 任务分级

- **直接执行（默认）**：范围明确、低风险、可逆的小改动。用户请求即为该范围的实施授权，不创建 plan 或 review 文件。
- **轻量规划**：跨多个文件或需要分阶段验证的中型任务。在 `PROGRESS.md` 维护简短检查点后继续执行，不自动进入正式生命周期。
- **正式治理**：仅用于跨 session、大范围、不可逆、安全敏感、影响难以预估，或用户明确要求正式计划/评审的工作。遵循 `docs/exec-plans/roadmap.md`。

优化记录、proposed plan 和 review 都不授权实施。正式治理任务只有在计划完成所需 review、获得用户明确批准并进入 `active/` 后才能执行；用户的一次明确答复可以同时批准 review 与 activation，不追加仪式性确认。

## 项目硬边界

- 保持 local-first。除非用户明确批准架构变化，不引入后端服务、云数据库、遥测或强制联网能力。
- `ACM-MD v0.1` 是核心协议。唯一被 Git 跟踪的规范位于 `skills/acm-md/references/acm-md-v0.1.md`；协议变更必须同步解析、导出、校验器和相关样例。
- 布局引擎、折叠、分组、容器、边折点、选择态和显示偏好属于派生视图状态，不得泄漏到 ACM-MD、JSON、Mermaid 或 Agent Diff 导出。
- 不提交依赖、缓存、构建产物、桌面交付物、环境文件、凭证、token 或本地私有数据。
- 保护用户和其他 Agent 的无关改动；不得为清理工作区而回滚、覆盖、删除或批量格式化。

## 修改入口

| 范围 | 首选入口 |
| --- | --- |
| 应用级状态、工具栏、撤销重做、文件与导出 | `src/App.jsx` |
| 画布、节点、边、布局和交互 | `src/acm/FlowCanvas.jsx` |
| Inspector、Agent Diff 和校验面板 | `src/acm/Panels.jsx` |
| ACM 数据、关系推断、校验、导入导出 | `src/acm/data.js` |
| 本地持久化和磁盘文件 | `src/storage/` |
| Tauri 桌面壳、权限和 Rust 配置 | `src-tauri/` |
| ACM-MD skill、规范和 Python 校验器 | `skills/acm-md/` |

更完整的路径职责见 `PROJECT_MAP.md`。

## 文档与状态职责

- `README.md`：面向使用者的产品说明，不记录 Agent 当前状态。
- `AGENTS.md`：唯一规则入口，只保存地图和不可协商边界。
- `INSTRUCTIONS.md`：稳定项目章程，不记录会话流水。
- `PROGRESS.md`：最新项目级状态；只保留滚动窗口和归档指针。
- `HANDOFF.md`：短小的 session 书签；每次整体重写，不追加历史。
- `PROJECT_MAP.md`：路径到职责的导航，不承担规则、状态或实施权限。
- `docs/`：被 Git 跟踪的计划、评审、决策、优化 intake 和历史归档治理层。
- `doc/`：若当前 checkout 本地存在，则视为被忽略且冻结的 legacy 资料，只能回查；不得新增、更新或作为当前规范、状态、计划及执行权限来源。

## Git 纪律

- 只在 `git rev-parse --show-toplevel` 返回的当前项目根目录操作；不硬编码某台机器的绝对路径或 `.git` 存储形态。
- 只处理当前任务分支与明确范围；不扫描、迁移或修改其他仓库和旧分支。
- 只暂存本次任务路径；存在不明改动时禁止 `git add -A`。
- 仅在用户或当前获批任务明确要求时 commit。每次 push、PR 和合并都需要当前任务的明确授权；本地 commit 不等于远端授权。
- 提交前检查 `git diff --check`、完整 diff 和 `git status --short --branch`。

## 验证与完成

Harness 或文档治理改动至少运行：

```bash
python3 scripts/check-project-harness.py --root . --profile auto
python3 -m unittest discover -s scripts/tests -p 'test_*.py'
python3 scripts/check-startup-doc-budget.py --root .
git diff --check
```

修改 `src/`、`src-tauri/`、`index.html`、`package.json` 或 `vite.config.js` 后，至少运行：

```bash
npm run build
```

首次在当前 checkout 准备 ACM-MD Python 校验器时创建 repo-local `.venv` 并安装依赖；只需执行一次，或在 `requirements.txt` 变化后重新安装，不要安装到系统 Python。

macOS / Linux：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r skills/acm-md/requirements.txt
```

Windows PowerShell：

```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r skills/acm-md/requirements.txt
```

协议、校验器或 ACM-MD 样例改动还要直接调用 `.venv` 解释器，先跑被跟踪的 smoke fixture，再验证目标文件；无需激活虚拟环境。

macOS / Linux：

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py <file.acm.md> --mode strict
```

Windows PowerShell：

```powershell
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py <file.acm.md> --mode strict
```

结构检查通过不能代替产品原生验证。结束前复核 diff，只保留当前范围，并如实更新 `PROGRESS.md` 与 `HANDOFF.md` 中的结果、未验证项、阻塞和下一闸门。
