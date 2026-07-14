# Agent Context Map Codex Plugin

This directory is the repo-local plugin source for Agent Context Map. Phase 4 provides a bundled stdio MCP control plane, strict host-owned workspace binding, path containment, ACM-MD validation, and an MCP Apps UI resource placeholder. The interactive editor is intentionally deferred to Phase 5.

Build the development bundle and clean release package from the repository root:

```powershell
npm run build:mcp
```

Generated `mcp/server.mjs`, the copied `skills/acm-md` release skill, and root `dist/` output are not Git-tracked. The server never accepts `projectPath`, `workspaceRoot`, `threadId`, or `taskId` tool arguments as authorization. Without exactly one host-owned workspace and a host-owned task identity, project-bound tools fail closed.

No marketplace file is created by this phase.
