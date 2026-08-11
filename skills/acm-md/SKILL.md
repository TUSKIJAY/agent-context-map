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
6. Before handing off generated ACM-MD, scan all free-text fields for raw Markdown fence delimiters. Do not place the literal three-backtick sequence inside YAML string values; write "acm fenced code block", "three-backtick code block", or another plain-text phrase instead.
7. Validate before handing off. Prefer the script below for any saved file.

## Generation Safety Hooks

- Fence hygiene hook: generated/exported ACM-MD must not contain the raw three-backtick sequence inside the main YAML body. A literal Markdown fence inside `description`, `notes`, `reason`, `summary`, or similar text can prematurely close the outer `acm` block in importers that parse Markdown fences directly.
- If source material contains Markdown code fences, paraphrase or escape the idea in prose before placing it into ACM-MD YAML fields.
- Type hygiene hook: ids, titles, statuses, types, sources, notes, descriptions, reasons, and layout engine values should be strings; `tags` should be an array of strings; `confidence` should be a real number from 0 to 1.
- Graph hygiene hook: every edge must point to existing nodes, should not self-loop, and should avoid duplicate `from`/`to` pairs unless there is a deliberate reason the target app supports parallel relations.
- Layout hygiene hook: if `layout.nodes` is present, every layout entry should reference an existing node id and contain numeric `x` and `y` coordinates.
- ChangeSet hygiene hook: if `changes` is present, include `change_set_id`, `base_doc_id`, and `summary`; keep added/modified/removed node and edge arrays structurally valid.
- The validator below enforces this in strict mode and warns in tolerant mode.

## Validation

Create the repo-local virtual environment once per checkout. Re-run the install step only when `requirements.txt` changes. Do not install the dependency into system Python, and do not require shell activation.

macOS / Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r skills/acm-md/requirements.txt
```

Windows PowerShell:

```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r skills/acm-md/requirements.txt
```

Run the tracked smoke fixture before relying on a newly prepared environment:

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
```

```powershell
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py skills/acm-md/examples/valid-basic.acm.md --mode strict
```

Run strict validation for generated/exported ACM-MD:

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py <file.acm.md> --mode strict
```

```powershell
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py <file.acm.md> --mode strict
```

Run tolerant validation when repairing legacy or pasted input:

```bash
.venv/bin/python skills/acm-md/scripts/validate_acm_md.py <file.md> --mode tolerant
```

```powershell
.venv\Scripts\python.exe skills/acm-md/scripts/validate_acm_md.py <file.md> --mode tolerant
```

Strict mode fails on zero or multiple `acm` blocks, and also fails when the YAML body contains a raw three-backtick fence delimiter. Tolerant mode may parse raw YAML or use the first block, but reports warnings.

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
