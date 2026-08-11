# Progress

> 本文件只保留当前项目级状态与滚动窗口。历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-12。
- 当前分支：`codex/project-harness-governed`。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer Phase 0 已验收；Phase 1 ready。**
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
| Phase 0 证据与独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 1 准备：将 Phase 0 构建 spike 收敛为默认只读 Viewer；旧编辑器只经显式 lazy/dynamic 边界进入。

## Blocked

- 无已知阻塞。

## To Do

- Phase 1：实现 `readOnly` 契约、Viewer shell、构建时 fixture、筛选/图例/fit/minimap，并证明 Artifact bundle 排除编辑器、storage 与 Tauri。
- Phase 3 前处理已登记的单文件 hardening：ELK/体积断言、CSP、大小写无关 closing-tag escaping。
- 不 push、PR、merge、tag、Release。

## Completed (Rolling Window)

- [x] 2026-08-12 — Phase 0 静态目录产物在 Orca Chromium 150 loopback 与 offline 模式渲染 2 节点/1 边；console 空、network 仅本地 HTML/JS/CSS。
- [x] 2026-08-12 — dagre-only 单文件 HTML 以 `file://` 离线打开；512,471 bytes，SHA-256 `be427f277058bf9e7b8e4557b159dd5328d029a91d486026413c3d60a0adf48e`。
- [x] 2026-08-12 — 原 `npm run build`、严格 ACM-MD fixture、governed harness、8/8 tests、启动文档预算与 diff check 通过。
- [x] 2026-08-12 — Phase 0 source manifest 冻结为 `2e05af54...9d23`；Grok 与 Claude 独立 review 均 approve、无 blocking finding。
- [x] 2026-08-11 — Visual Spec Artifact Renderer 完成用户批准、独立 review 与 activation；治理基线本地提交 `f88b0c3`。
- [x] 2026-08-11 — governed harness 首个本地提交与 review 加固（`37ace47` / `c9cadf7`）。

## Verification Baseline

| Check | Result |
| --- | --- |
| Artifact directory build | Pass — 283 modules; HTML 1,008 B + CSS 15,869 B + JS 502,418 B |
| Artifact single-file spike | Pass — one HTML, 512,471 B, dagre-only |
| Original `npm run build` | Pass — 294 modules; existing large-chunk warning only |
| ACM-MD strict smoke fixture | Pass — repo-local `.venv`, PyYAML 6.0.3 |
| Local harness / tests / budget | Pass — governed; 8/8; no budget trigger |
| Orca browser | Pass — loopback/offline and single `file://`; Chromium 150.0.7871.47 |
| Independent review | Pass — Grok 008 + Claude 009; no blocking finding |
| `git diff --check` | Pass |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c` |
