# Visual Spec Viewer: Three-view Fixture

```acm
schema_version: "acm-md/0.1"
doc_id: "acm_viewer_three_views"
meta:
  title: "离线 Visual Spec Artifact"
  created_by: "project-maintainer"
  created_at: "2026-08-12"
  updated_at: "2026-08-12"
  purpose: "Exercise Structure, Dependency, and Inquiry projections in the read-only Viewer."
  source: "phase_2_projection_fixture"
nodes:
  - id: "goal_share_spec"
    type: "Goal"
    title: "交付可离线分享的 Visual Spec"
    status: "confirmed"
    description: "让评审人无需编辑器或宿主即可理解同一份 ACM-MD。"
    source: "active_plan"
    confidence: 0.98
    tags: ["artifact", "offline"]
  - id: "module_renderer"
    type: "Module"
    title: "Artifact Renderer"
    status: "confirmed"
    description: "从统一图模型派生只读语义视图。"
    source: "active_plan"
    confidence: 0.96
    tags: ["viewer", "projection"]
  - id: "feature_viewer"
    type: "Feature"
    title: "只读三视图导航"
    status: "confirmed"
    description: "在结构、依赖与探询视图之间保持稳定节点标识。"
    source: "phase_2"
    confidence: 0.94
    tags: ["structure", "dependency", "inquiry"]
  - id: "feature_editor"
    type: "Feature"
    title: "旧编辑器次入口"
    status: "deprecated"
    description: "保留写能力，但不进入 Artifact 执行图。"
    source: "phase_1"
    confidence: 0.9
    tags: ["editor", "lazy"]
  - id: "api_browser"
    type: "API"
    title: "标准浏览器运行时"
    status: "confirmed"
    description: "只需要本地 HTML、CSS 与 JavaScript。"
    source: "phase_0"
    confidence: 0.97
    tags: ["browser", "offline"]
  - id: "constraint_local"
    type: "Constraint"
    title: "Local-first 与无强制联网"
    status: "confirmed"
    description: "Artifact 不依赖后端、Tauri、MCP 或 CDN。"
    source: "project_invariant"
    confidence: 1.0
    tags: ["local-first", "boundary"]
  - id: "risk_runtime"
    type: "Risk"
    title: "大图可能降低浏览器响应"
    status: "needs_validation"
    description: "需要在真实规模示例上记录节点与边的建议上限。"
    source: "phase_4_gate"
    confidence: 0.68
    tags: ["performance", "browser"]
  - id: "assumption_build_time"
    type: "Assumption"
    title: "构建时注入覆盖 MVP 分享流程"
    status: "suggested"
    description: "运行时文件选择器不进入当前阶段。"
    source: "product_assumption"
    confidence: 0.72
    tags: ["build-time", "mvp"]
  - id: "question_format"
    type: "Question"
    title: "静态目录还是单文件作为默认交付？"
    status: "needs_validation"
    description: "Phase 3 根据可复制性与体积证据收敛。"
    source: "active_plan"
    confidence: 0.64
    tags: ["delivery", "single-file"]
  - id: "decision_static"
    type: "Decision"
    title: "Phase 1 以静态目录为默认交付"
    status: "confirmed"
    description: "单文件在 Phase 3 完成正式 hardening。"
    source: "approved_plan"
    confidence: 0.95
    tags: ["static-directory", "phase-3"]
edges:
  - id: "edge_goal_renderer"
    from: "goal_share_spec"
    to: "module_renderer"
    type: "contains"
    status: "confirmed"
    reason: "产品目标包含 Artifact Renderer。"
    source: "active_plan"
    confidence: 1.0
  - id: "edge_renderer_viewer"
    from: "module_renderer"
    to: "feature_viewer"
    type: "contains"
    status: "confirmed"
    reason: "Renderer 提供三视图导航。"
    source: "phase_2"
    confidence: 1.0
  - id: "edge_renderer_editor"
    from: "module_renderer"
    to: "feature_editor"
    type: "contains"
    status: "confirmed"
    reason: "旧编辑器作为显式次入口保留。"
    source: "phase_1"
    confidence: 0.92
  - id: "edge_renderer_requires_viewer"
    from: "goal_share_spec"
    to: "feature_viewer"
    type: "requires"
    status: "confirmed"
    reason: "产品目标需要只读 Viewer。"
    source: "phase_2"
    confidence: 0.95
  - id: "edge_viewer_browser"
    from: "feature_viewer"
    to: "api_browser"
    type: "depends_on"
    status: "confirmed"
    reason: "Viewer 运行在标准浏览器。"
    source: "phase_1"
    confidence: 0.98
  - id: "edge_local_constrains_viewer"
    from: "constraint_local"
    to: "feature_viewer"
    type: "constrains"
    status: "confirmed"
    reason: "Viewer 必须保持 local-first。"
    source: "project_invariant"
    confidence: 1.0
  - id: "edge_viewer_conflicts_editor"
    from: "feature_viewer"
    to: "feature_editor"
    type: "conflicts_with"
    status: "suggested"
    reason: "默认路径不能同时暴露写控件。"
    source: "phase_1_boundary"
    confidence: 0.8
  - id: "edge_risk_impacts_viewer"
    from: "risk_runtime"
    to: "feature_viewer"
    type: "impacts"
    status: "needs_validation"
    reason: "规模风险影响 Viewer 体验。"
    source: "phase_4_gate"
    confidence: 0.68
  - id: "edge_question_validates_assumption"
    from: "question_format"
    to: "assumption_build_time"
    type: "needs_validation"
    status: "needs_validation"
    reason: "交付形态需要验证构建时注入假设。"
    source: "product_assumption"
    confidence: 0.7
  - id: "edge_decision_answers_question"
    from: "decision_static"
    to: "question_format"
    type: "answers"
    status: "confirmed"
    reason: "当前阶段已决定默认使用静态目录。"
    source: "approved_plan"
    confidence: 0.95
  - id: "edge_local_constrains_question"
    from: "constraint_local"
    to: "question_format"
    type: "constrains"
    status: "confirmed"
    reason: "交付形态必须满足离线与无后端边界。"
    source: "project_invariant"
    confidence: 1.0
validation:
  status: "valid"
  fixture: "viewer_three_views"
```
