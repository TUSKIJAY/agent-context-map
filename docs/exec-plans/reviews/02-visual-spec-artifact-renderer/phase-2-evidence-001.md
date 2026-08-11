# Phase 2 Evidence 001 — Semantic Viewer Projections And Navigation

- Plan: `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md`
- Phase: 2 — Structure / Dependency / Inquiry, filters, Inspector and navigation
- Evidence date: 2026-08-12 (Asia/Shanghai)
- Frozen Git HEAD: `ae13da8ebc54e2b517bb62cac9a1331cb7d5d5c2`
- Frozen source-manifest SHA-256: `3f593f4513aae58c6d47b46caa296e511f2a32d0bf50e3303463f71a2d17f8dc`
- Browser runtime: Chromium `150.0.7871.47` on macOS

## Scope And Frozen Source Manifest

Phase 2 adds one pure projection boundary over the canonical `GraphDocument`, three semantic views, status/type filters, title/ID/tag search, stable cross-view selection, 0/1/2-hop focus, Structure collapse, hash deep links and a relation-complete read-only Inspector. Projection, filters, focus, collapse, layout and hash remain derived view state.

| Path | SHA-256 |
| --- | --- |
| `.harness/config.json` | `0d59716976b690434942932d7b48d39850e6acdd9cfbab30f5d35b3a626ad257` |
| `PROJECT_MAP.md` | `2e2994802e14f8109a4ef76973a7d3f8b4fde23f3cbe99a5366495505e1d2dac` |
| `package.json` | `2cbb3ae492c8bc36a87991bf3cb1278e115fcc628d6dce756b65220d4aace0d0` |
| `scripts/check-viewer-projections.mjs` | `0d4a3405645fd4b24bf375faf5c07baa0183282b65e059424ccb293d83355f0a` |
| `skills/acm-md/examples/valid-viewer-views.acm.md` | `e611df541d4676834b55eea7ced426041455e7e23d8e1a92f490f1fcdc21acbf` |
| `src/acm/FlowCanvas.jsx` | `6eff7d3e575da007fe4bba9daf54f1f47e3e32ca22f35591aee67df08ac96281` |
| `src/acm/project.js` | `08dbbb18576bea6924e15148870104f4a78cb50d67a3663300a7da797e61bb5e` |
| `src/acm/viewer/ViewerApp.jsx` | `e30fb8cc9157e6b6b3dfbf002fbb72139a28d52815ac89c7a8f145444244669d` |

The aggregate is the SHA-256 of the ordered `sha256sum` lines above, including the two spaces before each path and the terminating newline. Generated directories and this evidence file are not source-manifest members.

## Projection Contract

`project(doc, viewId, options)` returns only canonical node/edge IDs plus view options. It never adds coordinates, selection, filter, collapse, focus or display preferences to the canonical document.

| View | Default projection | Auxiliary behavior |
| --- | --- | --- |
| Structure | 10 nodes / 3 `contains` edges | Eight non-`contains` edges hidden by default; explicit toggle renders 11 total edges as a shallow dashed layer |
| Dependency | 7 nodes / 6 edges | Five primary dependency edges plus one `impacts` edge; explicit toggle hides `impacts` and its otherwise unreferenced node, yielding 6 / 5 |
| Inquiry | 6 nodes / 5 edges | Question, Assumption, Risk and Decision seeds plus one-hop `needs_validation`, `answers`, `impacts` and `constrains` neighbors |

The repeatable projection check also proves:

- canonical JSON is byte-for-byte stable before and after all projections;
- type and status filters compose without mutating canonical nodes;
- search matches title, stable ID and tags;
- empty graph, orphan node and dependency cycle do not throw;
- 0/1/2-hop focus is cycle-safe;
- `view` + `node` hash serialization and parsing round-trip.

## Native Build And Validation Evidence

| Check | Result |
| --- | --- |
| `.venv/bin/python ... valid-basic.acm.md --mode strict` | Pass |
| `.venv/bin/python ... valid-viewer-views.acm.md --mode strict` | Pass; one intentional warning for a `suggested` edge |
| `npm run check:viewer-projections` | Pass; Structure `10/3`, Dependency `7/6`, Inquiry `6/5`, canonical stable, all edge cases pass |
| `npm run build:artifact:spike` | Pass; Vite 5.4.21; 285 modules; JS 525.88 kB, CSS 15.87 kB, HTML 1.02 kB |
| `npm run build:artifact:single:spike` | Pass; 538,249 B; SHA-256 `572b8d2e3dbdf22a3a2b63c454af105800a49377bc5e1db2fa53432751bc4637` |
| `npm run build` | Pass; 298 modules; Viewer 542.24 kB; editor remains a 71.10 kB lazy chunk; existing large-chunk warning only |
| Harness | Pass; governed profile, no missing/empty/content/config errors |
| Harness tests | Pass; 8/8 |
| Startup document budget | Pass; no attention or hard-limit trigger |
| `git diff --check` | Pass |
| Artifact/App initial bundle marker scan | Pass; no storage, Tauri, plugin-sql or editor marker in Artifact outputs; no write-runtime marker in the App initial Viewer chunk |

## Browser Evidence

The final build was exercised through loopback static servers in the project browser surface. The tool emitted final DOM snapshots, state evaluations, console summaries and screenshots into the execution transcript; this runtime did not expose stable receipt IDs for those outputs.

### Projection and auxiliary layers

- Clean App load at `http://127.0.0.1:4173/#view=dependency`: Viewer `ready`, `surface=app`, `canonicalStable=true`, 7 rendered nodes / 6 rendered edges, local JS/CSS only, no warning/error console messages.
- Structure default: 10 rendered nodes / 3 primary edges, auxiliary toggle off.
- Structure auxiliary toggle: 10 / 11; all eight auxiliary paths use reduced width/opacity and dashed rendering, while the three `contains` paths remain primary.
- Dependency default: 7 / 6 with `impacts` auxiliary layer on.
- Dependency auxiliary toggle off: 6 / 5; canonical stability remains true.
- Inquiry: 6 / 5 and the selected `feature_viewer` remains selected after switching from Dependency.

### Search, Inspector and deep link

- Selecting `feature_viewer`, switching to Inquiry and reloading preserves `#view=inquiry&node=feature_viewer`, the selected node and `canonicalStable=true`.
- Search query `local` returns `constraint_local` by title/ID/tag search without requiring network access.
- Inspector shows stable ID, tags, source, confidence, four upstream relations and two downstream relations for `feature_viewer`; every relation is a read-only navigation button.
- The final single-file build served through loopback restores `#view=inquiry&node=question_format`, renders 6 Inquiry nodes, remains canonical-stable and declares no external `script` or `link` resource.

### Artifact boundary and visual record

- Artifact directory at `http://127.0.0.1:4174/artifact.html`: Viewer `ready`, `surface=artifact`, no editor action, zero draggable nodes, 10 / 3 Structure projection, local JS/CSS only, and no warning/error console messages.
- A final screenshot records the App Dependency view with seven nodes, the `impacts` auxiliary control, type/status filters, search, focus controls and read-only Inspector.
- A second final screenshot records the strict Artifact Structure surface with no editor action.
- One older App tab retained a browser-extension transport error timestamped before the clean validation tab. The fresh final App tab and both Artifact tabs had empty warning/error summaries; no application regression was inferred from the stale extension message.

Phase 3, not Phase 2, owns formal `file://` and export-download acceptance. This phase uses the already-built single-file only as supplementary deep-link evidence and does not claim the Phase 3 delivery Gate.

## Phase 2 Gate Assessment Before Independent Review

1. Three views are projections of one canonical document and all tested operations leave canonical JSON unchanged: pass.
2. Projection rules match the active plan, including default-hidden Structure auxiliary edges and hideable Dependency `impacts`; empty/orphan/cycle cases pass: pass.
3. Type/status filters, title/ID/tag search, selection persistence, focus/collapse and hash refresh work in the final native browser build: pass.
4. Strict fixtures, projection assertions, App/Artifact/single builds, harness, harness tests, startup budget and diff check pass: pass.

This is writer-collected evidence against the frozen source manifest. Phase 2 acceptance still requires two independent non-Codex reviews with no blocking finding.

## Independent Review Closeout

- Grok `review-012.md`: `approve/high`; all eight individual hashes and the aggregate manifest reproduced, all native validation/build commands reran successfully, and no blocking Gate failure was found. Two low notes cover reviewer browser replay and an internal depth-zero helper/UI distinction; neither affects the Viewer contract.
- AGY/Antigravity `review-013.md`: `approve/high`; all manifest hashes and native commands reproduced, source projection/read-only boundaries passed, and no blocking finding was identified. Its live browser path was not independently replayed.

Both mandatory Phase 2 acceptance reviews approve the same frozen source implementation. Phase 2 Gates are accepted; Phase 3 may start from the eventual Phase 2 scoped local commit.
