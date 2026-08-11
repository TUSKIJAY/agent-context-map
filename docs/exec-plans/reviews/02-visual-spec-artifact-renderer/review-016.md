# Review 016 — Visual Spec Artifact Renderer Phase 4

- Review target: Git HEAD `b18dcbcba5c6ddcc3057ec354a38baf8b71b4c94` + Phase 4 source-manifest SHA-256 `a82faa7def7ce64e1f92756da3bdf5876d44a52174295620fdd88f63eeaeea2c` + tracked binary diff SHA-256 `e2ca976eb9dc4f6738921f1ad4a48666397650d49052196d81a94f404e6c6b9e`
- Reviewer: Grok CLI, session `019ff20f-f044-78c2-9e23-eabf2542c169`, through `agent-cli-bridge`, independent read-only review
- Review type: Phase acceptance
- Verdict: approve
- Confidence: high for frozen source and repeatable native Gates; live Orca/Browser evidence not independently replayed

## Scope Checked

- Active plan Phase 4, writer evidence, all eleven source-manifest paths and the complete tracked diff.
- Two real ACM-MD examples, strict validation, three-view projections and README Artifact-first walkthrough.
- Chinese search, contextual legend, filters, empty projection, invalid YAML/dangling edge and fail-closed missing-`nodes` build.
- Synthetic performance generator, 50–250 node baselines, 150/225 browser fixture packaging and published size boundary.
- Local-first, protocol and derived-view-state boundaries; absence of unrelated or remote work.
- Projection, experience, performance, Artifact, SVG, App, strict fixture, harness, unit-test, startup-budget and diff checks.

## Findings

| Severity | Location | Finding | Disposition |
| --- | --- | --- | --- |
| Minor | `phase-4-evidence-001.md` legend note | The missing 12th live `NODE_TYPES` value is `Page`, not `Resource`. The measured 11/12 coverage and non-fabrication intent remain correct. | Evidence-only wording corrected after review; non-blocking. |
| Minor | `skills/acm-md/examples/*` Markdown H1 | The headings use `Agent Context Map:` as a format/brand prefix, while ACM body, metadata and document IDs remain domain-only. | Non-blocking; the Specs are not tool self-descriptions. |
| Minor | `scripts/check-viewer-experience.mjs` | The Node check proves an empty projection and Chinese search, not the exact rendered canvas empty-state copy. `ViewerApp.jsx` contains the copy and live browser evidence exercises it. | Non-blocking; boundary is disclosed. |
| Info | 250-node performance case | This independent run measured about 702 ms versus the writer's approximately 630–680 ms range. | Expected local timing variance; published 150 comfortable / 250 extended boundary is unchanged. |
| Info | Orca screenshot channel | Writer correctly records receipt `007ddf0d…` as `tool_failed`, not a successful screenshot. | Fallback and primary eval/snapshot evidence are honestly separated. |

No blocking finding.

## Independent Gate Assessment

- Freeze: all eleven per-file hashes, aggregate source manifest and tracked binary diff reproduce exactly.
- Examples: retail 29/50 and payment 30/52 are strict-clean, Chinese, domain-real Specs with complete Structure trees and materially different Dependency/Inquiry subgraphs.
- Experience: `check:viewer-experience` passes 29/28, 19/15, 12/8 and 30/29, 15/12, 14/8 projections; legend is 11/12; Chinese search, empty projection, invalid YAML and dangling edge pass.
- Performance: `check:viewer-performance` passes; this run measured approximately 176 ms at 150/225 and 702 ms at 250/375. The stated boundary is conservative and explicitly not a cross-device SLA.
- Workflow: README commands produce both formats; fixed-time retail directory and payment single hashes/bytes match the evidence.
- Failure safety: missing `nodes` is rejected before `artifact.html` is emitted.
- Native checks: both real examples and the existing fixtures, all Node checks, main build, governed harness, 8/8 tests, startup budget and diff check pass.
- Boundaries: no backend, protocol change, view-state writeback, unrelated scope or remote Git action appears in the frozen change.

## Unverified Items

- The reviewer did not independently drive the live Orca Chromium pages, offline emulator, UI search/filter actions or screenshot fallback.
- Loopback and `file://` visual opening, the 150-node browser switch timings and pixel-level Chinese typography remain writer browser evidence.
- Cross-machine performance was not tested and is correctly not presented as an SLA.

## Verdict Rationale

The freeze is reproducible and all native Gates pass. The two examples demonstrate real, distinct product and architecture review questions; the README workflow and fail-closed build behavior are independently reproducible; the scale boundary is measured and appropriately qualified. The evidence label correction and two remaining minor observations do not violate a mandatory Phase 4 Gate. Phase 4 is approved.
