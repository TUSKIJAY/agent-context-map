# Agent Context Map: Validator Smoke Fixture

```acm
schema_version: "acm-md/0.1"
doc_id: "acm_validator_smoke"
meta:
  title: "ACM-MD validator smoke fixture"
  created_by: "project-maintainer"
  created_at: "2026-08-11"
  updated_at: "2026-08-11"
  purpose: "Verify that the tracked strict validator and its Python dependency are runnable."
  source: "repository_fixture"
nodes:
  - id: "goal_validator_smoke"
    type: "Goal"
    title: "Validate one minimal ACM-MD graph"
    status: "confirmed"
    description: "Provide a stable, tracked smoke input for strict validation."
    source: "repository_fixture"
    confidence: 1.0
    tags: ["fixture", "validation"]
  - id: "module_validator_smoke"
    type: "Module"
    title: "Validator input"
    status: "confirmed"
    description: "Keep the fixture small while exercising a valid node relation."
    source: "repository_fixture"
    confidence: 1.0
    tags: ["fixture"]
edges:
  - id: "edge_validator_smoke"
    from: "goal_validator_smoke"
    to: "module_validator_smoke"
    type: "contains"
    status: "confirmed"
    reason: "The validation goal contains the smoke-input module."
    source: "repository_fixture"
    confidence: 1.0
validation:
  status: "valid"
```
