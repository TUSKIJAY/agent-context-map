# Agent Context Map: Baseline fixture

```acm
schema_version: "acm-md/0.1"
doc_id: "acm_baseline_001"
meta:
  title: "ACM-MD v0.1 baseline"
  source: "user_discussion"
nodes:
  - id: "goal_001"
    type: "Goal"
    title: "Preserve the ACM-MD contract"
    status: "confirmed"
    source: "user_discussion"
    confidence: 1
  - id: "module_001"
    type: "Module"
    title: "Baseline validation"
    status: "confirmed"
    source: "user_discussion"
    confidence: 1
edges:
  - id: "edge_001"
    from: "goal_001"
    to: "module_001"
    type: "contains"
    status: "confirmed"
    source: "user_discussion"
    confidence: 1
layout:
  engine: "manual"
  nodes:
    goal_001: { x: 80, y: 60 }
    module_001: { x: 340, y: 60 }
```
