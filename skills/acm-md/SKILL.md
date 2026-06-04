---
name: acm-md
description: Generate, read, repair, validate, and explain Agent Context Map Markdown (ACM-MD) graphs and Agent Diff change sets. Use when the user asks for ACM-MD, Agent Context Map, requirement graphs, demand maps, graph import/export, an `acm` fenced YAML block, Agent Diff, changes objects, or validation/repair of ACM-MD files produced by task-decomposer or other agents.
---

# ACM-MD

Use this skill to work with Agent Context Map Markdown: a Markdown wrapper around one YAML graph stored in an `acm` fenced code block.

## Core Contract

Formal ACM-MD output must contain exactly one main `acm` fenced block. Inside the block, YAML must include:

```yaml
schema_version: "acm-md/0.1"
doc_id: "acm_001"
meta:
  title: "..."
nodes: []
edges: []
```

Import may tolerate early `schema_version: "0.1"`, raw YAML without a fence, or multiple `acm` blocks for repair work, but generated/exported output must normalize to one `acm` block and `schema_version: "acm-md/0.1"`.

Allowed node types:

`Goal`, `Module`, `Feature`, `Page`, `DataEntity`, `API`, `Constraint`, `Risk`, `Assumption`, `Question`, `Decision`, `Task`

Allowed statuses:

`confirmed`, `suggested`, `needs_validation`, `deprecated`

Allowed edge types:

`contains`, `depends_on`, `impacts`, `conflicts_with`, `requires`, `replaces`, `references`, `constrains`, `answers`, `needs_validation`

Recommended id prefixes:

`goal_`, `module_`, `feature_`, `page_`, `data_`, `api_`, `constraint_`, `risk_`, `assumption_`, `question_`, `decision_`, `task_`, `edge_`, `changes_`

Ids must be stable and unique. Do not use titles as ids. Existing nonconforming ids may be preserved during repair if changing them would break references.

## Workflow

1. Determine the operation: generate a new graph, read/summarize a graph, apply Agent Diff, repair invalid ACM-MD, or validate a file.
2. For nontrivial generation or repair, read `references/acm-md-v0.1.md` for the full field rules and examples.
3. Separate confirmed user facts from agent inference:
   - User-confirmed content: `status: "confirmed"`, `source: "user_discussion"`.
   - Agent inference: `status: "suggested"`, `source: "agent"`, confidence below 0.8 unless strongly grounded.
   - Unsettled items: `status: "needs_validation"` and a matching `Question` or `Assumption` node when useful.
4. Build nodes first, then edges. Every edge `from` and `to` must reference an existing node id.
5. If `changes` exists, include `changes.summary`. When reading Agent Diff, consume `summary`, then `agent_instructions`, then added/modified/removed nodes and edges.
6. Validate before handing off. Prefer the script below for any saved file.

## Validation

Run strict validation for generated/exported ACM-MD:

```powershell
python C:\Users\LENOVO\.codex\skills\acm-md\scripts\validate_acm_md.py <file.acm.md> --mode strict
```

Run tolerant validation when repairing legacy or pasted input:

```powershell
python C:\Users\LENOVO\.codex\skills\acm-md\scripts\validate_acm_md.py <file.md> --mode tolerant
```

Strict mode fails on zero or multiple `acm` blocks. Tolerant mode may parse raw YAML or use the first block, but reports warnings.

## Repair Rules

When repairing invalid ACM-MD:

- Preserve existing ids whenever possible.
- Add missing required fields instead of inventing unrelated structure.
- Normalize `schema_version` to `acm-md/0.1`.
- Convert invalid node or edge types to the closest allowed type only when the intent is clear; otherwise mark the item `needs_validation`.
- Do not mark inferred or uncertain content as `confirmed`.
- Remove placeholder strings such as `[TODO]`, `[PLACEHOLDER]`, or template-only bracket text from final generated output.

## Reference

Full protocol text: `references/acm-md-v0.1.md`.
