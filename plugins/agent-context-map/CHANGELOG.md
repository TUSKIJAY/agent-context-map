# Changelog

## 0.3.0-rc.3 — 2026-07-15

- Align the MCP Apps Widget handshake with protocol version `2026-01-26`.
- Consume standard `ui/notifications/tool-result` payloads directly from `params` while retaining the legacy nested shape.
- Preserve hidden Widget bootstrap data from the canonical compatibility tool-result envelope.

## 0.3.0-rc.2 — 2026-07-15

- Derive MCP and Widget runtime versions from the plugin manifest at build time.
- Verify that a packaged MCP server reports the same version as its release manifest.

## 0.3.0-rc.1 — 2026-07-14

- Add the self-contained MCP Apps editor with strict trusted-workspace binding.
- Add bounded read, validation, import/export, and pending proposal tools.
- Require a current Widget instance, preview, one-time user gesture, and locked revision recheck for commits.
- Add selected, related, and execution context previews with server-authored click-gated sending.
- Add deterministic release metadata, checksums, SBOM, and isolated install lifecycle gates.
- Enforce the pinned release toolchain and strip absolute JSX source metadata from production Widget bundles.

## 0.2.0 — 2026-07-14

- Establish the repo-local plugin manifest, bundled stdio MCP control plane, and read-only validation baseline.
