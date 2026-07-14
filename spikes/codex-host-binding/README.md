# Codex Host Binding Spike

This is the isolated Phase 0B repo-local plugin. It contains a dependency-free, read-only stdio MCP server with two tools:

- `host_binding_spike_health`
- `inspect_codex_host_identity`

The identity tool treats all model-visible arguments as untrusted, asks the MCP client for `roots/list`, inspects host-owned turn metadata, and records only field shapes and hashes. It returns `trusted_host_identity` only when host-owned task/thread evidence and exactly one host workspace candidate are present. Multiple candidates return `trusted_native_picker_required`; missing evidence returns `unavailable`.

It does not import application core/editor code, SQLite, Tauri, project-store code, or project `.acm` files. The fixture `.acm` tree is only hashed by the test harness before and after the server run.

## Local validation

```powershell
npm run test:host-binding-spike
python "$env:USERPROFILE\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py" spikes\codex-host-binding\plugins\codex-host-binding-spike
```

The test-only marketplace is `spikes/codex-host-binding/.agents/plugins/marketplace.json`. It is not the product marketplace and must not be copied into the final plugin.

The sanitized real-host result is recorded in `evidence/gate-report.json`. Raw temporary NDJSON is never committed.
