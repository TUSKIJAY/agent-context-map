# Agent Context Map Codex Plugin

This directory is the repo-local plugin source for Agent Context Map. The release candidate provides a bundled stdio MCP control plane, strict host-owned workspace binding, path containment, ACM-MD validation, a self-contained MCP Apps editor, pending proposals, and explicit user-gated commit/send actions.

Build the development bundle and clean release package from the repository root:

```powershell
npm run build:plugin
```

The fixed candidate is written to `dist/agent-context-map-plugin/`. It includes `SHA256SUMS`, a deterministic release manifest, a dependency inventory, and a CycloneDX SBOM. Generated `mcp/server.mjs`, the copied `skills/acm-md` release skill, and root `dist/` output are not Git-tracked.

The server never accepts `projectPath`, `workspaceRoot`, `threadId`, or `taskId` tool arguments as authorization. Without exactly one host-owned workspace and a host-owned task identity, project-bound tools fail closed. Model-visible write/import tools only create expiring pending proposals; project writes and context sends require a current Widget instance and an explicit one-time user gesture.

Run the release candidate gates from the repository root:

```powershell
npm run test:all
npm run test:distribution
npm run test:mcp-bundle-repro
npm run test:install-upgrade-rollback
npm run test:uninstall-reinstall
```

These lifecycle tests use temporary isolated `CODEX_HOME`, `HOME`, and `USERPROFILE` directories. They never install into the user's real global environment. No marketplace file is created by this phase.
