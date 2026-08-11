# Phase 0 Evidence 001 — Artifact Build Spike

- Plan: `docs/exec-plans/completed/02-visual-spec-artifact-renderer.md`
- Phase: 0 — Minimum Artifact build spike
- Evidence date: 2026-08-12 (Asia/Shanghai)
- Frozen Git HEAD: `f88b0c3a1b5453a1d08b93f14078ca3f31edb5b9`
- Frozen source-manifest SHA-256: `2e05af54a090b42a0ab7aba9fdb73c3ba64e0ba45d5b6350c5ec9a26006d9d23`
- Orca runtime: `1.4.180`
- Browser runtime: Chromium `150.0.7871.47` on macOS

## Scope And Frozen Source Manifest

Phase 0 adds a parallel, disposable browser-only build path. It does not replace the editor entry, import storage/Tauri/MCP code, change ACM-MD v0.1, or add runtime network dependencies.

| Path | SHA-256 |
| --- | --- |
| `.gitignore` | `4cc4bf40af3aa6b7fd3b96a1c8bd587470b09af050e0346fd79bfb26f28fbeb3` |
| `package.json` | `fb0fbb239dad5543e3c7720fc5ad98f09e35511311b16a4c41d388113ee7e9af` |
| `artifact.html` | `4084d03df03634849ea63717ed44c8d6e7ebd58a1e7f2830a78528b2718d298d` |
| `vite.artifact.config.js` | `5a6a62a135ea4f13c7b875ef2ac193a70394b38a0176f10bcb90aabd2ae9e8c5` |
| `src/artifact/main.jsx` | `8e8a3a8561e59b8ceb93341ee75d44a554612fe0ce6bf5795dc1ea002d2b29b8` |
| `scripts/build-artifact-single-spike.mjs` | `e9d6820ce6894afd5e4a262f2b49484763f66cb32745d6cbee7bb938dc7b30e9` |

The aggregate is the SHA-256 of the ordered `shasum -a 256` lines shown above. Generated directories are ignored and are not part of the source manifest.

## Native Build And Validation Evidence

| Check | Result |
| --- | --- |
| `npm run build:artifact:spike` | Pass; Vite 5.4.21; 283 modules; HTML 1,008 B, CSS 15,869 B, JS 502,418 B; existing-style >500 kB warning only |
| `npm run build:artifact:single:spike` | Pass; one `artifact.html`; 512,471 B; SHA-256 `be427f277058bf9e7b8e4557b159dd5328d029a91d486026413c3d60a0adf48e` |
| `npm run build` | Pass; original editor path remains 294 modules; main JS 583.46 kB and ELK chunk 1,436.40 kB; existing large-chunk warning remains |
| ACM-MD strict fixture | Pass with repo-local `.venv`: `[OK] skills/acm-md/examples/valid-basic.acm.md` |
| Harness | Pass; governed profile, no missing/empty/content/config errors |
| Harness tests | Pass; 8/8 |
| Startup document budget | Pass; no attention or hard-limit trigger |
| `git diff --check` | Pass |
| Artifact source dependency scan | Pass; no storage, Tauri, plugin-sql, or project-store import |
| Generated bundle dependency scan | Pass; no Tauri, plugin-sql, project-store, or `elk.bundled` symbol |

The static directory contains only `artifact.html` plus one local CSS and one local JS asset. The single-file directory contains only `artifact.html`. Both use system font stacks; neither declares a CDN URL. The measured 512,471-byte single-file result is specifically a **dagre-only** Phase 0 feasibility result: ELK is not reachable from this entry and is tree-shaken. A later ELK import would change the size materially and needs an explicit Phase 3 assertion.

## Orca Embedded Browser Evidence

### Static directory over loopback

- URL: `http://127.0.0.1:4174/artifact.html`
- Final clean reload: `43bd49db-90ea-41a2-a29e-d3c16a61b90f`
- Snapshot: `ecdf9417-1763-4dab-bbbe-5b81e06288c3`
- Page eval: `a7f0dd92-bf16-4fa0-b001-757f3622c882`
  - `state=ready`
  - `nodeCount=2`
  - `validationErrors=0`
  - `externalResources=[]`
- Console: `ed7d376a-9cbf-4593-96ae-ac6c20996722` — no messages
- Network: `13ea68ec-e98c-49c4-a15b-2b3b3572b198` — exactly three successful loopback requests: HTML, local JS, local CSS; no external request
- Screenshot: `9616b08b-9074-409a-9fe9-66adb9fd4bc1`
- Offline toggle/eval: `bc298b58-3e9b-4ed0-a7b4-1207cb35e432` / `2eff24cd-e21e-457f-b24e-5bc4e602bc64` — `navigator.onLine=false`, graph remains `ready` with two nodes

### Static directory opened with `file://`

- Page: `c8c9234e-9c56-4c8e-9211-8cb951c9c2fc`
- Snapshot: `a5403f11-c09f-4cb6-9348-2cd4acc67eab`
- Page eval: `aba685fd-867d-4421-801e-9d4e24ffed88` — document complete and Artifact state `ready`
- Console: `c5461e71-9f47-47ac-aaca-f268a879577c` — no messages
- Screenshot: `e309d6ca-7028-4ddb-b2dc-a3fc1193335f`

This is supplementary Orca-specific evidence only. Standard Chromium policies may reject module scripts loaded from an opaque `file://` origin; the mandatory static-directory Gate uses the loopback path above. Phase 1 and Phase 3 must not rely on this supplementary result.

### Single-file HTML opened with `file://`

- Page: `a5eb8c53-6a50-431f-a996-69c798df34c5`
- Snapshot: `7f356484-1908-4316-a448-d483723203c8`
- Page eval: `11aa75e8-d10a-466b-8f40-2a61a1498ec4`
  - `state=ready`
  - two rendered nodes and one rendered edge
  - `validationErrors=0`
  - `externalResources=[]`
- Console: `3d102d6b-6b6f-4277-b804-adfbfe7b05a7` — no messages
- Offline toggle/eval: `42d1e47e-2ac4-4c7f-bb7d-893c7db6a64d` / `b6ccebe7-cdf0-476a-bb91-f33789c809ec` — graph remains ready with two rendered nodes
- Offline screenshot: `b94bd8f4-b34b-4ef2-8558-e70e420c8d90`
- Network evidence: `not_applicable` for an already self-contained `file://` document; page eval confirms no external resources.

## Defect Found During Spike

The first browser run exposed an implementation error: the spike treated `validateDoc()` as an object with an `errors` member, while the existing API returns an issue array. The writer corrected the call to filter issues by `level === "error"`, rebuilt both outputs, and repeated browser checks on fresh pages. The final clean receipts above exclude the accumulated console state from the pre-fix tab.

## Phase 0 Gate Assessment Before Independent Review

1. Sample fixture renders in the browser: pass.
2. No-CDN/offline critical resources: pass for the mandatory loopback static directory and single-file `file://`; directory `file://` is supplementary only.
3. Size and single-file feasibility recorded: pass; the single-file path is feasible at 512,471 B.
4. Original `npm run build`: pass.
5. Orca embedded-browser snapshot, screenshot, eval, console, network/offline evidence: pass.

This record was writer-collected native evidence. Independent review closeout follows.

## Independent Review Closeout

- Grok `review-008.md`: `approve/high`, no blocking finding; independently reproduced the source manifest and on-disk artifact sizes.
- Claude `review-009.md`: `approve/medium-high`, no blocking finding; independently checked the source import graph and isolated the `file://` and dagre-only assumptions recorded above.
- Optional Kimi review produced no result and was stopped after the two required reviews completed; it is not counted toward acceptance.
- Deferred Phase 3 hardening: add a bundle size/symbol assertion, formal static-output CSP, and case-insensitive inline `</script`/`</style` escaping before the single-file spike becomes a supported build.

Phase 0 mandatory Gates are accepted. The retained GraphCanvas write affordances are intentionally not promoted as a read-only product contract; Phase 1 must implement and prove that contract.
