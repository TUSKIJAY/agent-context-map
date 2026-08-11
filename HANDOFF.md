# Handoff

> Session bookmark only. Stable facts live in `INSTRUCTIONS.md`; project status lives in `PROGRESS.md`.

## Resume Point / 接手点

**Visual Spec Artifact Renderer Phase 0–3 已验收；单一下一步是 Phase 4 产品验证、真实示例与体验收敛。**

- Active plan：`docs/exec-plans/active/02-visual-spec-artifact-renderer.md`
- Phase 3 evidence：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/phase-3-evidence-001.md`
- Independent reviews：`review-014.md`（Grok approve/high）与 `review-015.md`（AGY/Antigravity approve/high），均无 blocking finding
- Frozen Phase 3 source manifest：`360f85ac21b94ffcab928e8a232e493e9bbade42056ec9e87ec69abdb33c786b`
- Phase 2 local commit：`eaf3c84745ee84c0d5ada9c40667072ea4d8f278`

## Phase 3 Result

- `npm run build:artifact` 生成可拷贝目录与 `artifact-manifest.json`；`npm run build:artifact:single` 生成唯一 `artifact.html`。
- 固定 `generated_at` 时，目录 runtime hash 为 `45cbd73e...6e44`（531,551 B），单文件为 `53223103...8a3d`（530,832 B）；canonical structure hash 为 `f89a1dc...edb9`。
- 两种 Artifact 均有 CSP、无强制外网、默认仅 dagre，并拒绝 ELK、编辑器/storage/Tauri 运行时和超过 750,000 B 的产物。
- PNG 由同一份可移植纯 SVG 栅格化；最终目录与离线单文件导出均保留中文节点、关系线、箭头和标签，SVG 自动视觉 QA 为 PASS。

## Last Verification

- formal directory + single builds、`check:artifact-build`、`check:portable-svg`、`check:viewer-projections`：pass。
- `npm run build`：pass，289 modules；编辑器与 lazy ELK 路径保留。
- strict basic + three-view fixtures：pass；three-view 仅有 intentional suggested-edge warning。
- governed harness、8/8 tests、startup budget 与 `git diff --check`：pass。
- Orca Chromium 150：目录 local-only、single `file://` offline reload、PNG/SVG clicks 均 pass；Orca screenshot 超时已记 `tool_failed` 并由 Browser connector screenshot fallback 补证。

## Blocker

无已知阻塞。

## Next Gate / 单一下一步

Phase 4：创建 1–2 份高质量真实 Spec，逐项验收中文排版、图例、空状态与错误 ACM-MD，记录性能基线和建议节点/边上限，并依据真实证据决定 README 是否切换为 Artifact 优先。全部 Gate 与双独立 review 通过后，将 active plan 移至 completed。

## Scope Reminder

- 保持 local-first 与 ACM-MD v0.1；不 merge 插件化分支。
- 不 push、PR、merge、tag、Release。
- Phase 4 不扩成协议升级、营销站点、插件复活或云发布。
