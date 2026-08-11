# Progress

> 本文件只保留当前项目级状态与滚动窗口。历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-12。
- 当前分支：`codex/project-harness-governed`。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer Phase 0–2 已验收；Phase 3 ready。**
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
| Active 产品计划 | `docs/exec-plans/active/02-visual-spec-artifact-renderer.md` |
| Phase 0–2 证据与独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 3 准备：规范化离线目录与正式单文件构建，补齐 Spec 元数据、可复现性和 PNG/SVG 导出验收。

## Blocked

- 无已知阻塞。

## To Do

- Phase 3：完成单文件 hardening（ELK/体积断言、CSP、大小写无关 closing-tag escaping）、构建时 Spec 元数据与导出验证。
- 不 push、PR、merge、tag、Release。

## Completed (Rolling Window)

- [x] 2026-08-12 — Phase 2 三语义投影、状态/类型筛选、title/id/tags 搜索、跨视图 selection、折叠、0–2 层 focus、hash 深链与关系 Inspector 已闭环。
- [x] 2026-08-12 — Phase 2 source manifest `3f593f45...f8dc`；Grok 012 与 AGY/Antigravity 013 均 approve/high、无 blocking finding。
- [x] 2026-08-12 — 默认 App 已切换到只读 Viewer；旧编辑器仅在显式“进入编辑器”后加载独立 lazy chunk，初始资源图不含写运行时。
- [x] 2026-08-12 — Artifact 无编辑入口；drag/connect/delete/Handle 均禁用。Delete、筛选和节点选择后 canonical snapshot 不变。
- [x] 2026-08-12 — Phase 1 静态目录与单文件 `file://` 均离线可用；无外部资源，严格 fixture、两类构建、原构建和 harness 全绿。
- [x] 2026-08-12 — Phase 1 source manifest `76fcfb9e...bc2e`；Grok 010 与 AGY/Gemini 011 均 approve/high、无 blocking finding。
- [x] 2026-08-12 — Phase 0 build spike、离线证据、严格校验和双独立 review 已闭环；保留 Phase 3 hardening 清单。
- [x] 2026-08-11 — Visual Spec Artifact Renderer 完成用户批准、独立 review 与 activation；治理基线本地提交 `f88b0c3`。
- [x] 2026-08-11 — governed harness 首个本地提交与 review 加固（`37ace47` / `c9cadf7`）。

## Verification Baseline

| Check | Result |
| --- | --- |
| Artifact directory build | Pass — 285 modules; HTML 1.02 kB + CSS 15.87 kB + JS 525.88 kB |
| Artifact single-file spike | Pass — one HTML, 538,249 B, SHA-256 `572b8d2e...4637` |
| Original `npm run build` | Pass — 298 modules; Viewer initial chunk + editor lazy chunk; existing large-chunk warning only |
| ACM-MD strict fixtures | Pass — basic + three-view fixture through repo-local `.venv`; one intentional suggested-edge warning |
| Projection assertions | Pass — Structure `10/3`, Dependency `7/6`, Inquiry `6/5`; canonical stable; empty/orphan/cycle/focus/hash pass |
| Local harness / tests / budget | Pass — governed; 8/8; no budget trigger |
| Browser | Pass — three views, auxiliary layers, search, selection/hash refresh, strict Artifact and single-file deep link; Chromium 150.0.7871.47 |
| Independent review | Pass — Phase 2 Grok 012 + AGY/Antigravity 013 approve/high; no blocking finding |
| `git diff --check` | Pass |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c` |
