# Phase 3 Evidence 001 — Offline Artifact Delivery And Portable Exports

- Plan: `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md`
- Phase: 3 — static directory, single-file HTML, build metadata and PNG/SVG export
- Evidence date: 2026-08-12 (Asia/Shanghai)
- Frozen Git HEAD: `eaf3c84745ee84c0d5ada9c40667072ea4d8f278`
- Frozen source-manifest SHA-256: `360f85ac21b94ffcab928e8a232e493e9bbade42056ec9e87ec69abdb33c786b`
- Frozen binary diff SHA-256: `6ea88b40b58bc7010f290a8d6384f431338afc2ef03e0b7f6a7906dc20cc7522`
- Browser runtime: Orca embedded Chromium `150.0.7871.47` on macOS

## Scope And Frozen Source Manifest

Phase 3 replaces the two Phase 0 spike builders with one formal, guarded build path. It accepts an explicit source Spec, validates and injects it at build time, emits provenance and reproducibility metadata, enforces a 750,000-byte dagre-only boundary, and produces either a copyable static directory or one `file://`-safe HTML document. It also replaces DOM/`foreignObject` image capture with a pure SVG representation and rasterizes that same representation for PNG, keeping nodes and relations together.

| Path | SHA-256 |
| --- | --- |
| `.harness/config.json` | `00148f4b94166e4bf0fd89825f81ca71e9b720151d20960294b7061454eedc36` |
| `PROJECT_MAP.md` | `7adbdd1bb306a1c6c50d9856485537d021f0dcc5b741d1d4eaa325aab7f5d462` |
| `README.md` | `5a8b32c69212ff1a13b0ee6d952f7d54c39ba198188e551b87639c186cdcda82` |
| `artifact.html` | `eef21dcc33f8664422a4f8d86e3e8621a11ee2f6cbc50f286d24b99553a1ec82` |
| `package-lock.json` | `a733154e128431501cbef16ccad905245170eb236923c309eb162807b2c9d78d` |
| `package.json` | `3e2f40fa94169b593e91a386ec7898f56063f0deb20db99c097366b3152545e6` |
| `scripts/artifact-build-lib.mjs` | `9f45e052d60377652c2c54ee388b8f77aabadd952d92ba0e40ec924ddfbf1859` |
| `scripts/build-artifact.mjs` | `d2d4bbea0c1e50043f058297332784445a6d332607658f5d691c32f939684588` |
| `scripts/check-artifact-build.mjs` | `78a720ef92dd17495a53b4876df310839c1b6fa52cee1cf9be695ba45a40a3ba` |
| `scripts/check-portable-svg.mjs` | `fd1399b6a3d0b90c50fef08bbe2e51e700085bdce709b44a170b2b3d3dee247f` |
| `src/Launcher.jsx` | `da69baa2dbdfb72560346e52ecceaac9d7af2507a09930764d8d83ba54bf3cbe` |
| `src/acm/FlowCanvas.jsx` | `7d5564118c4ea0d4a71fb572a480c235377199f266995f1307cee45a3c4bd702` |
| `src/acm/export-svg.js` | `c7259755264cc0c5a0c16f869f3301b9e33e35b85ac99f4758ea15548f70a270` |
| `src/acm/viewer/ViewerApp.jsx` | `665d207bfe9903cab1147ea5c268973ed31ac4f88e0e56b46a2e62940f8b31ad` |
| `src/artifact/main.jsx` | `765b89eaf6598246472e0502023f245884eea76813478e042eb61b37bd662cdd` |
| `scripts/build-artifact-single-spike.mjs` | `DELETED` |
| `vite.artifact.config.js` | `DELETED` |

The aggregate is the SHA-256 of the ordered `sha256sum` lines for existing files followed by the two literal `DELETED  <path>` lines, including line endings. Generated directories and this evidence file are not manifest members. The binary diff hash covers the tracked pre-evidence delta from the frozen HEAD, including deletions; the source manifest separately freezes the five untracked implementation files.

## Formal Build Contract And Reproducibility

The public commands are:

```bash
npm run build:artifact -- --spec <file.acm.md>
npm run build:artifact:single -- --spec <file.acm.md>
```

Both accept `--generated-at` or `SOURCE_DATE_EPOCH`; a fixed time makes the runtime byte-for-byte reproducible. Output cleanup refuses the filesystem root, repository root, and any non-empty unmanaged directory. Invalid formats, invalid finite positive byte limits, parse failures and validation errors fail closed. The Artifact entry excludes editor, storage, Tauri and ELK code.

At `generated_at=2026-08-12T00:00:00.000Z`:

| Property | Directory | Single file |
| --- | --- | --- |
| Runtime SHA-256 | `45cbd73e970af19bcfd227904facbad60d308556ba17c90bb7729799de4f6e44` | `53223103c7b955737704b86e1c4090a7f506cad9f86579e8157d6e7138468a3d` |
| Runtime bytes | 531,551 | 530,832 |
| Output | HTML + local CSS/JS + manifest | exactly one `artifact.html` |
| CSP | self-only resources; no connect | inline script/style only; no connect |
| ELK | absent | absent |

Shared metadata:

- `doc_id=acm_viewer_three_views`
- `schema_version=acm-md/0.1`
- source Spec SHA-256 `e611df541d4676834b55eea7ced426041455e7e23d8e1a92f490f1fcdc21acbf`
- canonical structure SHA-256 `f89a1dc80b9777aed885786a46002fc3ab509f40b8246db3d7e26cb0de14edb9`
- `layout_engine=dagre`, `includes_elk=false`, `renderer_version=0.2.0`
- maximum runtime size 750,000 bytes

`npm run check:artifact-build` performs two independent builds of each format and reproduced both hashes. It also checks CSP, local resource references, exactly-one-file output, case-insensitive `</script` / `</style` escaping, metadata, ELK exclusion, runtime markers and the byte boundary.

## Native Validation Evidence

| Check | Result |
| --- | --- |
| `npm run check:viewer-projections` | Pass; all three projections, canonical stability and edge cases |
| `npm run check:portable-svg` | Pass; deterministic 1,953-byte SVG, SHA-256 `236776d1cb26f23e5f0075790e35ab533315dbfec6b938704e373849dbb807fb` |
| `npm run check:artifact-build` | Pass; both formats reproduce the hashes and sizes above |
| formal directory + single builds | Pass; 275 / 271 modules, no ELK in Artifact runtime |
| `npm run build` | Pass; 289 modules; editor build and lazy ELK path remain intact; existing large-chunk warning only |
| strict `valid-basic.acm.md` | Pass |
| strict `valid-viewer-views.acm.md` | Pass; one intentional warning for a `suggested` edge |
| Harness | Pass; governed profile, no missing/empty/content/config errors |
| Harness tests | Pass; 8/8 |
| Startup document budget | Pass; no attention or hard-limit trigger |
| `git diff --check` | Pass |

One combined validation command initially referenced the not-yet-created Phase 4 example `viewer-product-readiness.acm.md` and stopped with `FileNotFoundError` after the builds passed. This was a command-path error, not an application failure; the current tracked Viewer fixture was then validated and all remaining Gates completed.

## Orca Embedded Browser Evidence

### Static directory

- Page `bc5a03ae-b902-4ca3-b77c-101e3af1ce54` opened `http://127.0.0.1:4174/artifact.html` from the formal directory output.
- Final eval receipt `47d055c6-f4c7-4e67-9710-c63025246a58` reported Viewer ready, Artifact surface, canonical stability, all injected metadata, no editor action, local CSS/JS only and no visible application errors.
- Snapshot receipt `402891a0-890b-4cb9-bd41-74f44d1a172f` recorded the rendered Structure graph and read-only controls.
- Offline toggle receipt `86dba767-fa70-48cb-99e0-95a6959a0418` retained the already-loaded canonical six-node Inquiry view with no external resources. Orca's network emulator also blocks loopback transport itself, so a forced offline reload cannot distinguish local-server transport from external dependency. The directory proof is therefore local-only loopback resources plus successful post-load offline interaction; it does not claim a serverless directory `file://` reload.

### Single file

- Page `7ae36b20-ab05-4381-81ad-7113f0a0d39f` opened the formal output directly by `file://`.
- Orca offline reload receipt `b7d102ae-676c-4df8-878e-aa8106e68264` succeeded with the network emulator enabled.
- Final eval receipt `e3c98888-7785-4bd9-9cb6-ca3cab498248` reported protocol `file:`, Viewer ready, canonical stability, all injected metadata, Inquiry view, selected `question_format`, six nodes, zero external resources and zero visible errors.
- Export click receipts: PNG `d0c08b0e-4f31-4e51-b7fe-052194f563d2`; SVG `ced4b7e8-7707-499d-897b-c8f1f3f699cc`; both returned `ok:true` while the page was offline.

Orca `screenshot` repeatedly reached `Page.captureScreenshot` but timed out even after tab switch/focus; the final receipt was `e6eda040-814d-4f1d-a2d6-b363a80e8dda`. This evidence channel is recorded as `tool_failed`, not silently treated as success. The in-app Browser connector supplied the fallback screenshots from the same formal outputs; its DOM/state check showed ready/canonical Artifact content, local resources, no editor action and no visible or console errors. Orca snapshots and eval receipts remain the primary interactive evidence.

## PNG/SVG Export Acceptance

An initial DOM-derived SVG was 648 kB, used `foreignObject`, and rendered blank/black in independent visual QA. It was rejected. The replacement generates portable `rect`/`path`/`text` markup from canonical document data and rendered node geometry. A second visual pass then caught that the PNG path still omitted relation lines; PNG was changed to rasterize the same portable SVG instead of a DOM snapshot.

Final directory exports:

- PNG: 2060×1134 RGBA, SHA-256 `893f546da3931e72af3e0f8e874333e8be1984120759b053f28bebd15f72f741`
- SVG: 6,444 bytes, SHA-256 `d7ae714126db96f35deebe4ce0cb3ff054abf16c534110fbc5a25b723d37c793`
- automatic SVG visual report `20260811-173336-b4b77d7532798a8a.md`: `VERDICT: PASS`, no critical or non-critical findings

Final offline single-file exports:

- PNG: 2060×1134 RGBA, SHA-256 `b9362eb32b22749ad1489021d69bb35e6b4013f001fcb24fbc99bff45477f578`
- SVG: SHA-256 `a0679029fa782faabb8741e09c3eff411b7423605cbfea4d40c1958a7aa45d18`
- automatic SVG visual report `20260811-173726-c01c264c1a54405c.md`: `VERDICT: PASS`, no critical or non-critical findings

Direct visual inspection of both final PNGs and rendered SVGs confirmed a white background, Chinese node titles, status/type marks, six Inquiry nodes, relation paths, arrowheads and relation labels. Exported files differ because each browser session had independent layout geometry, while their semantic content and portable representation are equivalent.

## Phase 3 Gate Assessment Before Independent Review

1. The formal static directory works through the required loopback path with only local resources; the formal single file survives an Orca offline `file://` reload: pass, with the directory emulator caveat recorded above.
2. CSP, resource scans and browser evaluation show no mandatory external request: pass.
3. PNG/SVG exports work from both directory and offline single-file Artifact paths; failed visual candidates were rejected and final output includes relation geometry: pass.
4. The injected source fixture passes strict validation; canonical structure is stable; fixed-time runtime hashes reproduce for both formats and the strategy is documented: pass.

This is writer-collected evidence against the frozen implementation. Phase 3 acceptance still requires two independent non-Codex reviews with no blocking finding.

## Independent Review Closeout

- Grok `review-014.md`: `approve/high`; reproduced all per-file and aggregate hashes plus the tracked binary diff, reran the complete native Gate set, and found no blocker. It recorded two low, non-blocking observations: the binary diff alone does not contain untracked files (wording corrected above), and the formal JavaScript builder validates error-level issues while README/native acceptance separately runs Python strict validation.
- AGY/Antigravity `review-015.md`: `approve/high`; reproduced both freeze hashes, independently reran the native suite, inspected cleanup/CSP/isolation/export boundaries, and found no blocking issue.

Both mandatory Phase 3 acceptance reviews approve the same frozen source implementation. Phase 3 Gates are accepted; Phase 4 may start from the eventual Phase 3 scoped local commit.
