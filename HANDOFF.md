# Handoff

> Session bookmark only. Stable facts live in `INSTRUCTIONS.md`; project status lives in `PROGRESS.md`.

## Resume Point / 接手点

**Visual Spec Artifact Renderer Phase 0–1 已验收；单一下一步是 Phase 2 三语义投影与导航。**

- Active plan：`docs/exec-plans/active/02-visual-spec-artifact-renderer.md`
- Phase 1 evidence：`docs/exec-plans/reviews/02-visual-spec-artifact-renderer/phase-1-evidence-001.md`
- Independent reviews：`review-010.md`（Grok approve/high）与 `review-011.md`（AGY/Gemini approve/high），均无 blocking finding
- Frozen Phase 1 source manifest：`76fcfb9eaa2dabb53ef6b6476ac0201c02fbd1c5883e214ef273e97d2648bc2e`

## Phase 1 Result

- `src/main.jsx` 默认挂载 Viewer launcher；只有显式“进入编辑器”动作会 lazy/dynamic 加载旧 `App.jsx`。
- `src/artifact/main.jsx` 只挂载 Viewer，不包含编辑器动作。生成 bundle 不含 editor-entry、storage、Tauri 或 plugin-sql 标记。
- `GraphCanvas readOnly` 在节点标记、Handle、React Flow props、事件挂载和 callback guard 五层禁止 drag/connect/delete 写路径。
- 只读 Inspector 覆盖核心字段、稳定 ID 与上下游；类型筛选、fit、pan/zoom、MiniMap、PNG/SVG 导航保留。

## Last Verification

- Artifact directory build：284 modules；仅本地 HTML/JS/CSS。
- Single-file feasibility：519,732 B；SHA-256 `af96ee2f...80e`；`file://` 资源列表为空。
- Original `npm run build`：297 modules；初始 Viewer 不加载 `App-Dp-Qc2Pj.js`，显式动作后才加载。
- strict ACM-MD fixture、governed harness、8/8 tests、startup budget 与 `git diff --check`：pass。
- Orca Chromium 150：Artifact offline、Delete key、无 draggable/connectable nodes、canonical stable、console empty。

## Blocker

无已知阻塞。

## Next Gate / 单一下一步

Phase 2：用 `project(viewId)` 从同一 canonical doc 投影 Structure / Dependency / Inquiry，补齐状态筛选、搜索、折叠/focus 与 hash 定位。验收必须证明三视图不复制或写回业务数据，空图、孤点和环不崩溃。

## Scope Reminder

- 保持 local-first 与 ACM-MD v0.1；不 merge 插件化分支。
- 不 push、PR、merge、tag、Release。
- Phase 3 前处理 ELK/体积断言、静态输出 CSP 与 inline closing-tag escaping；单文件当前仍是 feasibility output。
