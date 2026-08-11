# Phase 4 Evidence 001 — Real Specs, Product Walkthrough And Performance Boundary

- Plan: `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md`
- Phase: 4 — product validation, real example Specs and experience convergence
- Evidence date: 2026-08-12 (Asia/Shanghai)
- Frozen Git HEAD: `b18dcbcba5c6ddcc3057ec354a38baf8b71b4c94`
- Frozen source-manifest SHA-256: `a82faa7def7ce64e1f92756da3bdf5876d44a52174295620fdd88f63eeaeea2c`
- Frozen tracked binary diff SHA-256: `e2ca976eb9dc4f6738921f1ad4a48666397650d49052196d81a94f404e6c6b9e`
- Browser runtime: Orca embedded Chromium `150.0.7871.47` on macOS

## Scope And Frozen Source Manifest

Phase 4 adds two non-self-referential ACM-MD examples, repeatable experience and performance checks, an intentional invalid build fixture, and fail-closed structural parsing for Artifact builds. README is changed from editor-first to Artifact-first only after the real examples, exact README commands, offline output and browser interaction were exercised.

| Path | SHA-256 |
| --- | --- |
| `.harness/config.json` | `53b0ecac206742ebbc6ad919b44fdc88917d06252d1553997d0d98c51391e0d1` |
| `PROJECT_MAP.md` | `37c9044154a923edd79d9a80f26f6643fed14987b5ff4003052123c06d057d99` |
| `README.md` | `f85033c1a6a562ebe4e362433e005ce871ddc0e8b2064b8a7a7b088181f01114` |
| `package.json` | `3a8af03a4e18c7c9c0066e096964c9d6aaef7e3bd90ec11c1f5bd3f7ef88a7f0` |
| `scripts/artifact-build-lib.mjs` | `6fe7fe6826f2f9d3a6da3d078f171601af53d26d01a96997305a50006f8b1ecd` |
| `scripts/check-artifact-build.mjs` | `db854dbf0ce066ca8ca97c1f0d9a63a8e6c8129986304226bf9b5b77d3c8c739` |
| `scripts/check-viewer-experience.mjs` | `ec5c238e6baecc7ad80c824a8936705291e66be463b409d0a75a05a51f08fb18` |
| `scripts/check-viewer-performance.mjs` | `e8adb74c1e473b84aeb7a009148ca8c3d4805264a833cda831040ad14fad9dcc` |
| `scripts/fixtures/invalid-artifact-missing-nodes.acm.md` | `9944277765b609af235a9c778546e4eedfd811a5eabf61c479c278624f3e86a3` |
| `skills/acm-md/examples/payment-ledger-migration.acm.md` | `4a7c95f2675b24c9e7640661379a862af7fd12e17159378a982219c377873537` |
| `skills/acm-md/examples/retail-replenishment-pilot.acm.md` | `1045e3d4381592d91ccfe65ac9d756e00cb9e3050f40ff7da07c2768540b9e97` |

The aggregate is the SHA-256 of the ordered `shasum -a 256` lines above, including line endings. Generated outputs and this evidence file are not manifest members. The tracked binary diff does not cover the five untracked source paths; the source manifest freezes all eleven implementation paths.

## Real Spec Acceptance

| Example | Product question | Canonical | Structure | Dependency | Inquiry | Strict |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Retail replenishment pilot | Can a cross-functional team review a human-approved replenishment pilot, its data contracts, operating risks and success criteria? | 29 nodes / 50 edges | 29 / 28 | 19 / 15 | 12 / 8 | Pass, no warning |
| Payment ledger migration | Can an architecture review separate migration work packages, system dependencies, integrity constraints, cutover risks and decisions? | 30 nodes / 52 edges | 30 / 29 | 15 / 12 | 14 / 8 | Pass, no warning |

Both examples use the canonical ACM-MD v0.1 vocabulary, human-readable Chinese descriptions, evidence-like `source` values, confidence, priorities and tags. `contains` forms a complete Structure tree, while dependency and inquiry relations carry different review questions. Neither example describes Agent Context Map itself.

The fixed-time retail directory Artifact records:

- source SHA-256 `1045e3d4381592d91ccfe65ac9d756e00cb9e3050f40ff7da07c2768540b9e97`
- canonical structure SHA-256 `b754196b1949e39d593d31e423e6424251295eede2dc895cb5abf9e0c8330f4c`
- runtime SHA-256 `7ddfd011ed78a55d99c6fdcfcfd3467480c24d06cddd6a9319eadf53d3ff1506`, 547,022 bytes

The fixed-time payment single file is 546,454 bytes with SHA-256 `78fda03dcb9d02371f66f94ca93e0d0a49757fb7762f8590b42bf55ad025b286`; its canonical structure SHA-256 is `37710cfbb3380192eda370a87f716974452e4966ac31dcd843819cf9d91fd708`.

## Repeatable Experience Checklist

`npm run check:viewer-experience` checks both real examples and reports:

- zero JavaScript parse/validation errors and three distinct projections;
- Chinese title search against canonical nodes;
- contextual legend coverage for 11 of 12 node types and both statuses present in the examples;
- an empty result for the valid `Goal + needs_validation` filter combination;
- invalid YAML rejection and dangling-edge detection.

`scripts/artifact-build-lib.mjs` now also rejects a parsed document when structural parse errors remain. `npm run check:artifact-build` proves that `scripts/fixtures/invalid-artifact-missing-nodes.acm.md` fails with `Artifact Spec structure failed: 缺少 nodes 数组`; no plausible-looking Artifact is emitted from that invalid source.

Live retail walkthrough evidence:

- Final Orca eval receipt `44af002d-87ab-45c3-afae-f1175cb231cc`: Viewer ready, `retail_replenishment_pilot`, canonical 29/50, Structure 29, Dependency 19, Inquiry 12, zero validation errors and canonical stability.
- Final Orca snapshot receipt `f6a4686f-f419-4b25-ad16-04938efcc5b3`: Chinese title and node labels, read-only state, all three view controls, search, contextual type/status legend, graph, MiniMap and read-only Inspector are present. Inquiry shows 12 nodes and eight labelled relations.
- Search interaction receipt prefixes `e88bcd2a…` and `b3d93722…`: entering `促销` returns the two expected retail nodes without changing the 29/50 canonical document.
- Empty-state eval receipt prefix `c3e49e7a…`: a valid filter combination produces zero filtered/visible nodes and the explicit Chinese empty-state message, with canonical stability and zero validation errors.

The retail Structure Fit View necessarily makes 29 fully expanded nodes smaller on a single laptop viewport. This is a known, non-blocking readability limit: the product supplies zoom, semantic views, search, filters, 0–2 layer focus and Structure collapse. The Inquiry fallback screenshot is readable without zoom and visually confirms Chinese labels and relationship routing.

The contextual legend does not fabricate the unused `Page` type or `suggested`/`deprecated` statuses merely to reach 100% vocabulary coverage. Their absence from these two real domains is recorded, not treated as a protocol limitation. Grok caught and corrected an earlier evidence-only label that incorrectly called the missing type `Resource`; the measured 11/12 coverage itself was unchanged.

## README-Only User Walkthrough

The README's fastest path was executed exactly against the retail example:

1. strict validation passed;
2. `npm run build:artifact -- --spec skills/acm-md/examples/retail-replenishment-pilot.acm.md` produced the directory Artifact;
3. `python3 -m http.server 4174 --directory dist-artifact-dir` served it;
4. the documented URL opened successfully;
5. `npm run build:artifact:single -- --spec ...` produced one directly openable HTML file.

Directory eval receipt prefix `c4e415be…` and the later final readback show ready/canonical 29/50 content, Structure 29/28, zero validation errors and same-origin local assets. The standard single-file offline reload receipt `474b0b0d-ac49-45e6-a548-74f4babcd9dc3`, eval receipt `07d19f45-77c6-40bb-8795-324f371269f6`, and snapshot receipt `16681448-59f6-4a63-8fb9-bae8c57574c2` show the same document and view counts under `file://`, with zero external resources and zero validation errors.

The dynamically timed README outputs were 547,022 bytes for the directory runtime and 546,307 bytes for the single HTML. Reproducible fixed-time hashes are recorded separately above.

## Performance Baseline And Product Boundary

`npm run check:viewer-performance` generates stable synthetic graphs and measures projection, filter/search and dagre layout medians. A representative full run on Apple Silicon, Node `v22.22.3`, `darwin-arm64` produced:

| Canonical graph | Projection | Filter/search | Dagre layout |
| --- | ---: | ---: | ---: |
| 50 nodes / 75 edges | 0.03 ms | 0.02 ms | 34.53 ms |
| 100 / 150 | 0.05 ms | 0.06 ms | 121.61 ms |
| 150 / 225 | 0.08 ms | 0.06 ms | 287.89 ms |
| 250 / 375 | 0.11 ms | 0.09 ms | 634.74 ms |

Repeated Phase 4 runs placed 150/225 dagre layout at approximately 0.19–0.29 seconds and 250/375 at approximately 0.63–0.68 seconds. These are local baselines, not a cross-device SLA.

Recommendation accepted into README:

- comfortable: at or below 150 nodes / 225 edges;
- extended review: up to 250 / 375 only with real-browser acceptance and aggressive use of semantic views, filters and collapse;
- above 250 / 375: not qualified by this plan; split the Spec or open a dedicated performance plan.

The final 150/225 browser fixture passes Python strict validation with no warning. Its fixed-time directory runtime is 625,197 bytes, SHA-256 `bb871178ef6a2e2c8c459517a3eaaa17aae6a9cec863364539ada9bc35406421`, source SHA-256 `63f4bd00472be258707867e95302027a68678f9e363953e8acb1c1435832b5ad`, and canonical structure SHA-256 `34601f6c1a0f77f28e64fc6bb116c2ca99d15848502d534ea6d54d5139b0995d`.

Orca browser switch receipt `52bdffeb-0b02-4346-9714-aeb8c7b46ff7` reports ready/canonical 150/225 content, zero validation errors, same-origin resources, and actual projection switches of 65.6 ms to Dependency 72/72, 23.2 ms to Inquiry 11/10 and 77.5 ms back to Structure 150/149. Dependency's graph DOM completed at 72 nodes / 72 edges in follow-up receipt `c3dbf82b-5d2b-4b25-8876-18d6d95f40c0`; snapshot receipt `3f0ad8f2-5dc8-4a37-ab7a-9f590bd65e96` records the rendered large graph.

## Browser Evidence Channel Limitation

Orca `screenshot` again timed out after reaching the screenshot capture operation; receipt `007ddf0d-986c-414c-bb64-6e3244e94628` is recorded as `tool_failed`. It is not counted as a successful Orca screenshot. Orca snapshot/eval/offline receipts remain the primary native evidence. The in-app Browser connector supplied a fallback screenshot of the final retail Inquiry view, which visually showed readable Chinese nodes, eight relations, the three-view navigation, legend, filters and no error surface.

## Native Validation

| Check | Result |
| --- | --- |
| strict basic, three-view and both real examples | Pass; both real examples have no warning |
| `npm run check:viewer-projections` | Pass; projections, canonical stability and edge cases |
| `npm run check:viewer-experience` | Pass; real examples and walkthrough assertions |
| `npm run check:viewer-performance` | Pass; 50–250 node baselines and published boundary |
| `npm run check:portable-svg` | Pass; deterministic relation-complete pure SVG |
| `npm run check:artifact-build` | Pass; reproducible outputs and invalid structural input rejected |
| `npm run build` | Pass; editor and lazy ELK path preserved; existing large-chunk warning only |
| Harness | Pass; governed profile, no missing/empty/content/config errors |
| Harness tests | Pass; 8/8 |
| Startup document budget | Pass; no attention or hard-limit trigger |
| `git diff --check` | Pass |

The first combined strict command used the nonexistent path `valid-viewer.acm.md` after the basic fixture passed and therefore stopped with `FileNotFoundError`. This was a command-path error. The correct tracked path is `valid-viewer-views.acm.md`; it is included in the final successful Gate set.

## Product Narrative Decision Before Independent Review

Evidence is sufficient to switch README to Artifact-first:

- two real domains show materially different Structure, Dependency and Inquiry reading tasks;
- the README-only build/open path was replayed for both directory and offline single-file delivery;
- search, filters, empty state, contextual legend, invalid input and a 150-node browser fixture were exercised;
- the original editor remains available as an explicit secondary path and is not deleted.

This is writer-collected evidence against the frozen implementation. Phase 4 acceptance and plan completion still require two independent non-Codex reviews with no blocking finding.

## Independent Review Closeout

- Grok `review-016.md`: `approve/high`; reproduced the 11 file hashes, aggregate manifest and tracked diff, reran the complete native Gate set and fixed-time retail/payment builds, and found no blocking issue. It recorded three non-blocking findings: the missing legend type is `Page`, the example Markdown H1 brand prefix is not domain self-description, and the Node experience check asserts the empty projection while the exact rendered empty-state copy remains live-browser evidence.
- AGY/Antigravity `review-017.md`: `approve/high`; reproduced both freeze hashes, reran the complete native suite, inspected fail-closed parsing, README and local-first/view-state boundaries, and found no blocking or medium issue.

Both mandatory independent non-Codex reviews approve the same frozen Phase 4 implementation. The evidence-only `Page` label was corrected without changing the source manifest. Phase 4 Gates are accepted and the plan may move from active to completed after lifecycle/state synchronization.
