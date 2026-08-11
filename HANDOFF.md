# Handoff

> Session bookmark only. Stable facts live in `INSTRUCTIONS.md`; project status lives in `PROGRESS.md`.

## Resume Point / 接手点

**Visual Spec Artifact Renderer Phase 0 已验收；单一下一步是 Phase 1 只读 Viewer。**

- Active plan：`docs/exec-plans/active/02-visual-spec-artifact-renderer.md`
- Evidence：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/phase-0-evidence-001.md`
- Independent reviews：`review-008.md`（Grok approve/high）与 `review-009.md`（Claude approve/medium-high），均无 blocking finding
- Activation commit：`f88b0c3`
- Frozen Phase 0 source manifest：`2e05af54a090b42a0ab7aba9fdb73c3ba64e0ba45d5b6350c5ec9a26006d9d23`

## Phase 0 Result

- Parallel static-directory build works over loopback and offline in Orca Chromium 150; network contains only local HTML/JS/CSS.
- dagre-only single-file HTML works offline via `file://`; 512,471 bytes, SHA-256 `be427f27...f48e`.
- Original editor build remains green; no ACM-MD v0.1, storage, Tauri, MCP, backend, or CDN dependency was added to the Artifact entry.
- The existing GraphCanvas still exposes write affordances; this is a spike limitation, not a read-only product contract.

## Last Verification

- `npm run build:artifact:spike` — pass, 283 modules.
- `npm run build:artifact:single:spike` — pass, one HTML.
- `npm run build` — pass, 294 modules; existing large-chunk warning only.
- strict ACM-MD fixture — pass through repo-local `.venv`.
- governed harness, 8/8 tests, startup budget and `git diff --check` — pass.
- Orca browser snapshot/eval/console/network/screenshot/offline receipts are indexed in Phase 0 evidence.

## Blocker

无已知阻塞。

## Next Gate / 单一下一步

Phase 1：让默认 App 与 Artifact 共用真正只读的 Viewer shell；旧编辑器仅在显式“进入编辑器”动作后 lazy/dynamic 加载。验收必须证明 Artifact bundle 排除编辑器、`src/storage/*` 和 Tauri plugin，且 Viewer 操作不改变 canonical ACM-MD。

## Scope Reminder

- 保持 local-first 与 ACM-MD v0.1；不 merge 插件化分支。
- 不 push、PR、merge、tag、Release。
- Phase 3 前处理 ELK/体积断言、CSP 与 inline closing-tag escaping；目录 `file://` 不作为正式 Gate。
