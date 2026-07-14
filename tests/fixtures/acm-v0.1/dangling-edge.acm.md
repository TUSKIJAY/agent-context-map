```acm
schema_version: "acm-md/0.1"
doc_id: "acm_dangling_edge"
meta:
  title: "Dangling edge"
nodes:
  - id: "goal_001"
    type: "Goal"
    title: "Existing node"
    status: "confirmed"
edges:
  - id: "edge_001"
    from: "goal_001"
    to: "module_missing"
    type: "contains"
    status: "confirmed"
```
