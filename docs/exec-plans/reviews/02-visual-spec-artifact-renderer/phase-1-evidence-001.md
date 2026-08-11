# Phase 1 Evidence 001 — Read-only Artifact Viewer

- Plan: `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md`
- Phase: 1 — Read-only graph Artifact Viewer
- Evidence date: 2026-08-12 (Asia/Shanghai)
- Frozen Git HEAD: `a04b33c6d626f6f4e2222440a77359bb67bf58d0`
- Frozen source-manifest SHA-256: `76fcfb9eaa2dabb53ef6b6476ac0201c02fbd1c5883e214ef273e97d2648bc2e`
- Orca runtime: `1.4.180`
- Browser runtime: Chromium `150.0.7871.47` on macOS

## Scope And Frozen Source Manifest

Phase 1 makes the Viewer the default App surface, adds an explicit `readOnly` canvas contract and a read-only Inspector, and keeps the legacy editor behind one labeled lazy/dynamic action. The Artifact entry imports only the Viewer and does not receive that action.

| Path | SHA-256 |
| --- | --- |
| `PROJECT_MAP.md` | `7687e4c1f8299c67e99fb1ac6ed7e05efd2325fbc5dbebfb78d68e75db2a60eb` |
| `artifact.html` | `29d1d2e3363cdac748d36ced58b990ce886ecdd67fbe30cf234320c0fe82b504` |
| `index.html` | `88f3ec53cabe2a9d69afcc17d6518cf34d68b23bc7aa9e6f69fa9c879f5806d5` |
| `scripts/build-artifact-single-spike.mjs` | `8a86af8527b587802f6ebd0bca5803926f41a214565bfbbac8854e109170cc2a` |
| `src/Launcher.jsx` | `662c697f721df8e3f570a7fb2f473f643fb643100ee14c89e429c21a87df4acd` |
| `src/acm/FlowCanvas.jsx` | `638bccbab53e2527c1db50105b84d9e101e99243be92fd8c390e29dcd5c4f7a2` |
| `src/acm/viewer/ViewerApp.jsx` | `8c793c151ceeccacb098b14e9b91dbe117d1f035bb9e1aa0f5c3a6708088b83c` |
| `src/artifact/main.jsx` | `cab75f9428e744cb8ee5028c7cce94c045d80dd9497a0a6b93a1e987221631b6` |
| `src/main.jsx` | `40d68b9d3d19bb3061cc2a700ba163f35432d47720485263f2dee4df4a124759` |

The aggregate is the SHA-256 of the ordered `sha256  path` lines above, each terminated by a newline. Generated directories and this evidence file are not members of the source manifest.

## Read-only And Dependency Boundary

- `GraphCanvas readOnly` marks every derived node non-draggable/non-connectable, disables connect-on-click and React Flow deletion keys, hides/disables handles, omits drag/connect handlers, and guards both callbacks.
- Viewer operations retain the one parsed `GraphDocument`; a build-time JSON snapshot reports whether any view operation mutated canonical data.
- `src/main.jsx -> Launcher -> ViewerApp` is the initial App graph. `Launcher` is the only source edge to `import("./App.jsx")`.
- `src/artifact/main.jsx -> ViewerApp` has no editor action or editor import.
- Generated output scan found no `last_opened_doc_id`, `persistenceMode`, `@tauri-apps`, or `plugin-sql` marker in the App initial chunk, Artifact directory JS, or single-file HTML.
- Artifact directory and single-file scans also found no editor action text or editor chunk marker.
- The App initial chunk contains only a dynamic reference to `App-Dp-Qc2Pj.js`; write-runtime markers are confined to that lazy editor chunk.

## Native Build And Validation Evidence

| Check | Result |
| --- | --- |
| `npm run build:artifact:spike` | Pass; Vite 5.4.21; 284 modules; HTML 1.02 kB, CSS 15.87 kB, JS 507.92 kB |
| `npm run build:artifact:single:spike` | Pass; one HTML; 519,732 B; SHA-256 `af96ee2f774566ed175f1aeb9b35f3fc0d69b24045ecb23747b374198306b80e` |
| `npm run build` | Pass; 297 modules; initial Viewer JS 525.31 kB; editor lazy chunk 71.10 kB; ELK 1,436.40 kB; existing large-chunk warning only |
| ACM-MD strict fixture | Pass through repo-local `.venv`: `[OK] skills/acm-md/examples/valid-basic.acm.md` |
| Harness | Pass; governed profile, no missing/empty/content/config errors |
| Harness tests | Pass; 8/8 |
| Startup document budget | Pass; no attention or hard-limit trigger |
| `git diff --check` | Pass |
| Artifact bundle isolation scan | Pass; no editor-entry, storage, Tauri, or plugin-sql markers |

The Viewer uses only system font stacks; the App and Artifact HTML files no longer declare Google Fonts or another runtime CDN.

## Orca Embedded Browser Evidence

### Default App Viewer and explicit editor boundary

- URL: `http://127.0.0.1:4173/`
- Final clean reload: `f1d0603b-e3ba-4f12-8f1a-17b08c001b30`
- Initial resource eval: `d41015f9-1245-4f4e-bd85-08a33a627366`
  - Viewer state is `ready`
  - resources are only the initial local Viewer JS and CSS
  - `editorChunkLoaded=false`
  - `externalResources=[]`
- Initial accessibility snapshot: `085ddf19-0169-443c-bee6-ec577cb16166` — labeled `进入编辑器` action, type legend, canvas controls, MiniMap, PNG/SVG actions, and read-only Inspector are present.
- Read-only eval: `585f3b5e-15aa-4ff4-bdd5-709ef7330f1d`
  - `surface=app`, `readOnly=true`, `canonicalStable=true`, `validationErrors=0`
  - two nodes, zero draggable nodes, zero visible handles, no external resources
- Explicit editor click: `c049f214-f60d-4c57-9e57-8810ab63944b`
- Post-click eval: `ccdaadc0-b7f5-4111-bf67-cdf687068607`
  - Viewer surface is gone and the editor toolbar is present
  - exactly one additional resource, local `App-Dp-Qc2Pj.js`, is loaded
  - `editorChunkLoaded=true`
- Console after editor load: `82a74b09-fb69-4473-9a67-206e354ecbd8` — no messages.

### Strict Artifact surface over loopback

- URL: `http://127.0.0.1:4174/artifact.html`
- Final clean reload: `e0b6e545-8e20-49d6-83ad-5ca62b91e9b5`
- Resource eval: `dd13a869-82b5-481a-8ed2-4cab66cb39a7`
  - state is `ready`
  - resources are only local Artifact JS and CSS
  - `editorButtons=0`, `editorChunkLoaded=false`, `externalResources=[]`
- Read-only eval: `59cc06a8-4fed-4ca3-899d-ee651390c533`
  - `surface=artifact`, `editorEntry=none`, `validationErrors=0`
  - two nodes, zero draggable/connectable nodes, zero visible handles
- Accessibility snapshot: `70e9192a-5b7f-4624-a4f9-2e3996006618` — no editor action; only view/filter/navigation/export and read-only detail affordances.
- Node select, Delete key, and post-key eval: `d6d73dca-8526-4311-82f1-898e64448dd9` / `d14f3351-3991-4f6c-a9b1-dac085cf594b` / `1d4385c1-6bae-49f4-8940-78b5c339022c`
  - Inspector remains on `goal_validator_smoke`
  - node count remains two
  - `canonicalStable=true`; draggable/connectable node counts remain zero
- Console: `81be4329-7160-43cb-8716-384130199a26` — no messages.

### Offline and direct single-file evidence

- Loopback offline toggle/eval: `d344dcaa-6a00-4471-8785-57bc9c64590c` / `80a24b1b-2ffb-4060-b3fb-ee95fd108bdc`
  - `navigator.onLine=false`
  - Viewer remains ready with two nodes, `canonicalStable=true`, no draggable nodes or visible handles
- Single-file page: `5d1af1e5-a6cd-4b9f-8082-ea1e84fbfeb3`
- Direct `file://` eval: `26f65619-b45e-45d1-a159-303956ff4166`
  - `protocol=file:`, Viewer ready, two nodes, no editor entry
  - `validationErrors=0`, `canonicalStable=true`, zero draggable nodes/visible handles
  - `resources=[]`
- Single-file console: `c2fd1734-c484-4372-93a1-5391d4cdba74` — no messages.

The single-file result remains a Phase 0/1 feasibility artifact; Phase 3 owns supported-output hardening and formal reproducibility.

## Phase 1 Gate Assessment Before Independent Review

1. Artifact surface has no editor/write entry and excludes editor/storage/Tauri from its source and generated output graph: pass.
2. App defaults to Viewer and loads the preserved editor only after one explicit action: pass.
3. Viewer navigation, filter, node selection, Inspector and Delete-key checks leave canonical ACM-MD unchanged: pass.
4. Static directory opens through local preview with only local resources: pass.
5. Strict fixture, repo-local Python path, builds, harness, tests, startup budget and diff check: pass.

This is writer-collected evidence against the frozen source manifest. Independent acceptance reviews must reproduce the manifest and inspect the dependency/read-only boundaries before Phase 1 can be accepted.

## Independent Review Closeout

- Grok `review-010.md`: `approve/high`, no blocking or medium finding; independently reproduced all nine source hashes, the aggregate manifest and single-file output hash, then inspected source and generated dependency boundaries.
- AGY/Gemini `review-011.md`: `approve/high`, no blocking finding; independently inspected the Artifact/App import split, `readOnly` enforcement, Viewer state handling and Inspector coverage. It did not rerun hashes or native commands, and the review records that limit.
- A Claude fallback attempt returned no review because the local CLI account had reached its session limit; it is not counted toward acceptance.
- The only retained low-severity note is that the shared canvas bundle still contains guarded write machinery. Viewer and Artifact do not activate it: they set the explicit read-only contract and provide no write callbacks.

Both mandatory Phase 1 acceptance reviews approve the frozen implementation. Phase 1 Gates are accepted; Phase 2 may start from the eventual Phase 1 scoped local commit.
