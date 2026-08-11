# Progress

> 本文件只保留当前项目级状态与滚动窗口。历史见 `docs/progress-archive/index.md`。

## Current Status

- 更新日期：2026-08-12。
- 当前分支：`codex/project-harness-governed`。
- Harness profile：`governed`。
- **Visual Spec Artifact Renderer Phase 0–3 已验收；Phase 4 ready。**
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
| Phase 0–3 证据与独立 review | `docs/exec-plans/reviews/02-visual-spec-artifact-renderer/` |
| 长期历史 | `docs/progress-archive/index.md` |

## In Progress

- Phase 4 准备：用 1–2 份非工具自描述真实 Spec 完成交互走查、性能基线和 README 用户闭环。

## Blocked

- 无已知阻塞。

## To Do

- Phase 4：创建真实示例、覆盖中文排版/图例/空状态/错误 ACM-MD、记录节点/边性能建议上限，并决定 README 产品叙事。
- 不 push、PR、merge、tag、Release。

## Completed (Rolling Window)

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
| ACM-MD strict fixtures | Pass — basic + three-view fixture through repo-local `.venv`; one intentional suggested-edge warning |
| Projection assertions | Pass — Structure `10/3`, Dependency `7/6`, Inquiry `6/5`; canonical stable; empty/orphan/cycle/focus/hash pass |
| Local harness / tests / budget | Pass — governed; 8/8; no budget trigger |
| Browser/export | Pass — directory local-only + single offline `file://`; PNG/SVG relations visible; Chromium 150.0.7871.47; Orca screenshot channel limitation recorded |
| Independent review | Pass — Phase 3 Grok 014 + AGY/Antigravity 015 approve/high; no blocking finding |
| `git diff --check` | Pass |

## Historical Redirects

| Period or topic | Archive path |
| --- | --- |
| 2026-06 pre-harness product and layout history | `docs/progress-archive/2026-06-pre-harness-history.md` |
| Codex 插件化与 Widget Phase 8 证据 | 仅 `origin/codex/acm-pluginization-plan@4ed712c` |
