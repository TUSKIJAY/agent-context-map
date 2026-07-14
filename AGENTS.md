# AGENTS.md

本文件是 `Agent Context Map` 项目的唯一 Agent 规则入口。`CLAUDE.md` 只保留到本文件的兼容指针。

## 启动顺序

每次接手依次阅读：

1. `AGENTS.md` — 入口地图与硬边界。
2. `INSTRUCTIONS.md` — 稳定项目事实、架构与验证命令。
3. `PROGRESS.md` — 当前生命周期真相和短日志。
4. `HANDOFF.md` — 最新恢复点、证据、阻塞与下一闸门。
5. `PROJECT_MAP.md` — 文件职责与修改入口。
6. 涉及计划、决策、评审或优化记录时，再读 `docs/README.md`。

不要用聊天历史覆盖这些文件的当前状态。发现状态不一致时，以当前仓库、Git 和可重复验证为准，并同步修正状态文档。

## 项目边界

- 保持本地优先的 Vite + React 18 + Tauri 2 应用；不得擅自引入后端、数据库服务或云端依赖。
- 正式图谱与导出必须遵守 `ACM-MD v0.1`。协议的可追踪规范位于 `skills/acm-md/references/acm-md-v0.1.md`；`doc/03-ACM-MD格式规范指导文件.md` 是当前同内容的本地过程文档。协议变更必须同步二者并验证 skill。
- Agent 建议在人工采纳前只能存在于 pending view state；不得写入正式 `doc`、保存、导出或 Agent Diff。
- Agent 推断不得直接标记为 `confirmed`；默认使用 `suggested`，需要人工判断时使用 `needs_validation`。
- 不提交依赖、缓存、构建产物、环境文件、凭证或本地私有配置。
- 保护用户和其他 Agent 的无关改动；不要为清理工作区而回滚、覆盖或批量格式化。

## 修改入口

| 范围 | 首选入口 |
| --- | --- |
| 应用布局、全局状态、工具栏、撤销重做、文件与导出 | `src/App.jsx` |
| ACM 数据契约、校验、导入导出、建议 patch 纯函数 | `src/acm/data.js` |
| Agent SDK / Tauri / MCP / sidecar 适配与 fallback | `src/acm/agentClient.js` |
| 画布、节点、边、布局与交互 | `src/acm/FlowCanvas.jsx` |
| Inspector、Agent、建议变更和校验面板 | `src/acm/Panels.jsx` |
| 本地持久化与文件读写 | `src/storage/` |
| Tauri 命令、权限与桌面配置 | `src-tauri/` |
| ACM-MD skill 与校验器 | `skills/acm-md/` |

更完整的路径职责见 `PROJECT_MAP.md`。

## 文档与状态职责

- `README.md`：面向使用者，不承载 Agent 当前状态。
- `AGENTS.md`：只给入口地图和不可协商规则，不扩成长手册。
- `INSTRUCTIONS.md`：稳定项目章程，不记录会话流水。
- `PROGRESS.md`：当前状态、在制事项、短生命周期日志及归档指针。
- `HANDOFF.md`：当前恢复点；保持紧凑，不积累历史叙事。
- `PROJECT_MAP.md`：维护者路径地图。
- `docs/`：被 Git 跟踪的 harness 治理层，包括计划生命周期、决策、优化 intake 和历史索引。
- `doc/`：被 `.gitignore` 排除的本地产品过程资料、旧计划与评审；现存内容不自动获得执行权限。

详细历史从 `PROGRESS.md` 或 `HANDOFF.md` 迁到 `docs/progress-archive/` 后，必须保留索引和回链。

## 计划与权限

- 优化记录只记录问题，不授权实现。
- proposed 计划和 review 都不授权实现；review 通过也不等于 activation。
- 只有经独立评审、用户明确批准并位于 `docs/exec-plans/active/` 的计划，才授权按其 phase/gate 执行。
- 用户直接提出并授权的明确、窄范围维护任务可直接实施；不得借此扩大到未请求的计划范围。
- 计划状态变化必须同步对应索引、`PROGRESS.md` 和 `HANDOFF.md`。

## Git 外置规则

本项目是独立嵌套仓库。真实 Git 数据必须位于：

`D:\git-stores\stargate\LLM_project_agent思维导图.git`

项目目录内的 `.git` 只能是指针文件。任何 `git add`、`commit`、`push`、初始化或迁移前必须运行：

```powershell
git rev-parse --show-toplevel
git rev-parse --git-dir
git status --short --branch
```

期望：

- top-level：当前 `agent思维导图` 目录。
- git-dir：`D:/git-stores/stargate/LLM_project_agent思维导图.git`。

完整外置规则见 `C:\Users\LENOVO\Desktop\工作\星际之门\GIT_EXTERNAL_STORE_RULES.md`。只处理本项目，不扫描或迁移其他仓库。

提交时只暂存本次明确相关路径；工作区存在不明改动时禁止 `git add -A`。

- 每个发生仓库修改的任务或 active phase，在完成验证、diff 复核以及 `PROGRESS.md` / `HANDOFF.md` 同步后，默认自动创建 scoped local commit，不再逐次等待用户确认；文档-only 和直接授权的窄范围维护同样适用。
- 自动 commit 只授权本次任务范围。存在无关或规则生效前遗留改动时必须局部暂存；无法安全隔离则记录阻塞，不得夹带提交，也不得静默跳过提交闭环。
- `git push` 不在自动授权范围内。每次 push 都必须等待用户在当前任务中明确确认；本地 commit、计划批准或历史 push 授权都不能替代本次确认。

## 验证与完成

常用验证：

```powershell
npm run harness:check
npm run harness:budget
npm run build
```

- 修改 `src/`、`src-tauri/`、`index.html`、`package.json` 或 `vite.config.js` 后，至少运行 `npm run build`。
- 修改 ACM-MD 样例或协议时，再运行 `python skills/acm-md/scripts/validate_acm_md.py <file>`。
- 文档-only 改动至少运行 harness 结构检查、启动文档预算检查和 `git diff --check`。
- 不能仅因结构校验通过就宣称功能有效；按风险补充代表性原生验证。

结束前检查 diff，只保留本次范围；更新 `PROGRESS.md` 与 `HANDOFF.md`，记录实际命令、结果、阻塞和下一闸门。
