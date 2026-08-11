# Progress

> 本文件只保留当前项目级状态与滚动窗口。历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-12。
- 当前分支：`codex/project-harness-governed`。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer Phase 0–1 已验收；Phase 2 ready。**
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
| Phase 0–1 证据与独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 2 准备：在统一 canonical graph 上实现 Structure / Dependency / Inquiry 三投影、状态筛选、搜索与深链导航。

## Blocked

- 无已知阻塞。

## To Do

- Phase 2：实现 `project(viewId)` 纯函数和可重复断言；补齐视图切换、状态筛选、搜索、折叠/focus 与 hash 定位。
- Phase 3 前处理已登记的单文件 hardening：ELK/体积断言、CSP、大小写无关 closing-tag escaping。
- 不 push、PR、merge、tag、Release。

## Completed (Rolling Window)

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
| Artifact directory build | Pass — 284 modules; HTML 1.02 kB + CSS 15.87 kB + JS 507.92 kB |
| Artifact single-file spike | Pass — one HTML, 519,732 B, SHA-256 `af96ee2f...80e` |
| Original `npm run build` | Pass — 297 modules; Viewer initial chunk + editor lazy chunk; existing large-chunk warning only |
| ACM-MD strict smoke fixture | Pass — repo-local `.venv`, PyYAML 6.0.3 |
| Local harness / tests / budget | Pass — governed; 8/8; no budget trigger |
| Orca browser | Pass — App lazy boundary, strict Artifact read-only, loopback offline and single `file://`; Chromium 150.0.7871.47 |
| Independent review | Pass — Phase 1 Grok 010 + AGY/Gemini 011 approve/high; no blocking finding |
| `git diff --check` | Pass |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c` |
