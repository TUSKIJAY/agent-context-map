# Handoff

> Session bookmark only. Stable facts live in `INSTRUCTIONS.md`; project status lives in `PROGRESS.md`.

## Resume Point / 接手点

**Visual Spec Artifact Renderer Phase 0–2 已验收；单一下一步是 Phase 3 离线/单文件交付闭环。**

- Active plan：`docs/exec-plans/active/02-visual-spec-artifact-renderer.md`
- Phase 2 evidence：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/phase-2-evidence-001.md`
- Independent reviews：`review-012.md`（Grok approve/high）与 `review-013.md`（AGY/Antigravity approve/high），均无 blocking finding
- Frozen Phase 2 source manifest：`3f593f4513aae58c6d47b46caa296e511f2a32d0bf50e3303463f71a2d17f8dc`
- Phase 1 local commit：`ae13da8ebc54e2b517bb62cac9a1331cb7d5d5c2`

## Phase 2 Result

- `src/acm/project.js` 以纯函数从同一 canonical doc 投影 Structure / Dependency / Inquiry，只返回 node/edge IDs 与派生 view options。
- Structure 默认 10 nodes / 3 `contains` edges，辅助关系可显式打开；Dependency 默认 7 / 6，`impacts` 可隐藏为 6 / 5；Inquiry 为 6 / 5。
- Viewer 已具备状态/类型筛选、title/id/tags 搜索、跨视图 selection、Structure 折叠、全图/1/2 层 focus 与 `view` + `node` hash 恢复。
- Inspector 覆盖 stable ID、复制、tags、source、confidence 及完整上下游只读导航；所有浏览操作保持 `canonicalStable=true`。

## Last Verification

- strict basic + three-view fixture：pass；three-view fixture 仅有一个 intentional suggested-edge warning。
- `npm run check:viewer-projections`：Structure `10/3`、Dependency `7/6`、Inquiry `6/5`，canonical/edge cases 全绿。
- Artifact directory：285 modules；single-file：538,249 B，SHA-256 `572b8d2e...4637`；App build：298 modules。
- governed harness、8/8 tests、startup budget、bundle marker scan 与 `git diff --check`：pass。
- Chromium 150：辅助层、selection/hash 刷新、搜索、严格 Artifact 与单文件深链均通过；最终 clean tab console empty。

## Blocker

无已知阻塞。

## Next Gate / 单一下一步

Phase 3：把静态目录和单文件从 feasibility 产物收敛为正式、可复现交付；加入 doc_id / generated_at / schema_version 元数据，完成 CSP、closing-tag escaping、体积/ELK 边界，并原生验收 PNG/SVG 下载与离线打开。

## Scope Reminder

- 保持 local-first 与 ACM-MD v0.1；不 merge 插件化分支。
- 不 push、PR、merge、tag、Release。
- Phase 3 不扩成运行时文件选择器、云发布或新布局引擎。
