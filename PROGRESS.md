# Progress

> 本文件只保留当前项目级状态与滚动窗口。历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-12。
- 当前分支：`codex/project-harness-governed`。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer Phase 0–4 已验收并移入 completed；当前无 active plan。**
- 激活治理基线已单独提交为 `f88b0c3`；Phase 0 source、evidence 与状态按独立 scoped local commit 处理。
- 实施基线仍为当前单体分支；`origin/codex/acm-pluginization-plan@4ed712c` 只作点采证据，未 merge/cherry-pick。

## Navigation

| Need | Source of truth |
| --- | --- |
| Agent 入口与硬边界 | `AGENTS.md` |
| 稳定事实与架构不变量 | `INSTRUCTIONS.md` |
| 最新会话接手点 | `HANDOFF.md` |
| 文件职责 | `PROJECT_MAP.md` |
| 文档权限与生命周期 | `docs/README.md` |
| Completed 产品计划 | `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md` |
| Phase 0–4 证据与独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- 无当前实施任务；等待新的明确请求。

## Blocked

- 无已知阻塞。

## To Do

- 可选宿主适配不属于当前授权，若启动需另立 proposed plan。
- 不 push、PR、merge、tag、Release。

## Completed (Rolling Window)

- [x] 2026-08-12 — Visual Spec Artifact Renderer Phase 0–4 全部验收，计划从 active 移入 completed；Phase 4 implementation + acceptance commit `2bba798`。
- [x] 2026-08-12 — Phase 4 两份真实 Spec 已 strict-clean：零售补货试点 29/50，支付账本迁移 30/52；三语义视图区分、中文搜索、图例、空状态与错误输入均通过。
- [x] 2026-08-12 — 性能基线覆盖 50–250 节点；README 记录日常 150/225、专项 250/375 边界，并切换为 Artifact-first，编辑器保留为显式次路径。
- [x] 2026-08-12 — README-only 目录与离线单文件流程、150/225 浏览器 fixture 及 invalid structural Spec fail-closed 均通过 Orca/原生验证。
- [x] 2026-08-12 — Phase 4 source manifest `a82faa7d...a2c`；Grok 016 与 AGY/Antigravity 017 均 approve/high、无 blocking finding。
- [x] 2026-08-12 — Phase 3 正式目录与单文件交付、构建元数据/固定时间复现、CSP、750,000 B/ELK 边界与 README 命令已闭环。
- [x] 2026-08-12 — PNG 改为栅格化同一份纯 SVG；最终两类 Artifact 导出均保留中文节点、关系线、箭头与标签，SVG 视觉 QA PASS。
- [x] 2026-08-12 — Phase 3 source manifest `360f85ac...86b`；Grok 014 与 AGY/Antigravity 015 均 approve/high、无 blocking finding。
- [x] 2026-08-12 — Phase 2 三语义投影、状态/类型筛选、title/id/tags 搜索、跨视图 selection、折叠、0–2 层 focus、hash 深链与关系 Inspector 已闭环。
- [x] 2026-08-12 — Phase 2 source manifest `3f593f45...f8dc`；Grok 012 与 AGY/Antigravity 013 均 approve/high、无 blocking finding。
- [x] 2026-08-12 — 默认 App 已切换到只读 Viewer；旧编辑器仅在显式“进入编辑器”后加载独立 lazy chunk，初始资源图不含写运行时。
- [x] 2026-08-12 — Artifact 无编辑入口；drag/connect/delete/Handle 均禁用。Delete、筛选和节点选择后 canonical snapshot 不变。
- [x] 2026-08-12 — Phase 0 build spike、离线证据、严格校验和双独立 review 已闭环；保留 Phase 3 hardening 清单。

## Verification Baseline

| Check | Result |
| --- | --- |
| Formal Artifact directory | Pass — 531,551 B, runtime SHA-256 `45cbd73e...6e44`, local assets + manifest |
| Formal Artifact single file | Pass — one HTML, 530,832 B, runtime SHA-256 `53223103...8a3d`, offline `file://` |
| Original `npm run build` | Pass — 289 modules; editor and lazy ELK preserved; existing large-chunk warning only |
| ACM-MD strict fixtures | Pass — basic、three-view、retail、payment；仅既有 three-view fixture 有 intentional suggested-edge warning |
| Projection assertions | Pass — Structure `10/3`, Dependency `7/6`, Inquiry `6/5`; canonical stable; empty/orphan/cycle/focus/hash pass |
| Real example experience | Pass — retail `29/50` → `29/28`, `19/15`, `12/8`; payment `30/52` → `30/29`, `15/12`, `14/8`; search/legend/empty/error pass |
| Performance boundary | Pass — 50/75 to 250/375 repeatable baseline; comfortable `150/225`, extended-review `250/375`, above not qualified |
| Local harness / tests / budget | Pass — governed; 8/8; no budget trigger |
| Browser/export | Pass — real directory local-only + real single offline `file://`; 150/225 fixture rendered; PNG/SVG relations visible; Chromium 150.0.7871.47; Orca screenshot limitation recorded |
| Independent review | Pass — Phase 4 Grok 016 + AGY/Antigravity 017 approve/high; no blocking finding |
| `git diff --check` | Pass |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c` |
