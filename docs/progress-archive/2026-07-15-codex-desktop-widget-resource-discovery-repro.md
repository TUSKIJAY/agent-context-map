# Codex Desktop does not read a valid MCP Apps UI resource after a successful tool call

Date: 2026-07-15

Classification: Codex Desktop host limitation / bug candidate

Repository product data included: no

## Summary

Codex Desktop discovered the `agent_context_map` MCP server and its 14 tool descriptors, then successfully called `open_agent_context_map`. The successful result referenced a newly versioned MCP Apps UI resource:

`ui://agent-context-map/widget-0.3.0-rc.4.html`

During the same fresh Desktop task, the MCP server received no `resources/list` request and no `resources/read` request. It therefore could not return the registered UI resource to the host. No Widget bootstrap or ready call arrived. The read-only graph operations succeeded and the fixture hash was unchanged.

This reproduces the issue after fixing a repository cache-key defect, installing an immutable rc.4 candidate, fully restarting Desktop, and using a new task and a new `openAttemptId`. The exact Desktop-internal reason for not requesting the resource is undocumented and remains unknown.

## Environment

| Item | Value |
| --- | --- |
| OS | Windows x64 |
| Codex Desktop | `26.707.9981.0` |
| Codex CLI | `0.144.2` |
| Plugin | `agent-context-map@agent-context-map-local` `0.3.0-rc.4`, installed and enabled |
| Candidate source commit | `00a2c74` |
| Candidate tree SHA-256 | `93ae0d2e7f789e908fa99d9822eac5cfc3bb24ebab2fe1b7f49731ece762038e` |
| Desktop process start | `2026-07-15T03:59:30Z` (local display: 11:59:30 UTC+8) |
| MCP process start | `2026-07-15T03:59:50.129Z` |
| Fresh Codex task | `019f63ee-3c6f-7841-a905-0c60541fd0e8` |

## Valid registered resource control

The packaged rc.4 server was independently exercised before the live Gate. Its descriptor, list response, and read response use the same URI. The direct packaged-server control passed with:

- descriptor `_meta.ui.resourceUri` and compatibility `_meta.openai/outputTemplate`: `ui://agent-context-map/widget-0.3.0-rc.4.html`;
- resource MIME: `text/html;profile=mcp-app`;
- read envelope: `contents[{uri,mimeType,text,_meta.ui.csp}]`;
- CSP: empty `connect_domains` and empty `resource_domains` for the self-contained bundle;
- resource size: `2,095,385` bytes;
- resource SHA-256: `d2a0fb44704dc608a9e5be888ab81bd00be0d101a58835f7be6d78ef29de21db`.

The candidate passed the full local Phase 7 Gate: 39 test files / 113 passed / 1 platform skip, Vite build (317 modules), fixed release, distribution, reproducibility, clean-room, isolated install/update/rollback/uninstall/reinstall, plugin validation, harness checks, and checksum verification.

Relevant public contract references:

- <https://developers.openai.com/apps-sdk/build/mcp-server#step-1--register-a-component-template>
- <https://developers.openai.com/apps-sdk/reference#_meta-fields-on-tool-descriptor>
- <https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields>
- <https://developers.openai.com/apps-sdk/build/mcp-server#troubleshooting>

The public documentation does not specify Codex Desktop's internal resource-discovery, iframe, or rejection logging behavior.

## Minimal reproduction

1. Install and enable the immutable rc.4 plugin candidate.
2. Fully exit and restart Codex Desktop.
3. Open a fresh task rooted at the Git workspace.
4. Confirm `agent_context_map_health` reports `0.3.0-rc.4` and a new MCP process instance.
5. Call `open_agent_context_map` once with a strict-valid read-only fixture.
6. Call health immediately after open and inspect process-memory lifecycle counters.
7. Perform bounded context and strict validation reads.
8. Call `await_agent_context_map_ready` exactly once for the new attempt.
9. Call health again and compare the fixture SHA-256 before and after.

No write, import, commit, send, retry, tag, release, or stable operation is part of this reproduction.

## Correlation ledger

| UTC | Operation | Correlation / attempt | Result |
| --- | --- | --- | --- |
| 03:59:50.136 | MCP initialize | instance `3e909e2c-9b4e-405b-8bcd-9011df856e87` | served |
| 03:59:50.138 | tool descriptor list | same instance | served; 14 tools visible in Desktop log |
| 04:04:32.565 | health | `8174001d-07f5-4f80-b327-c26d556a5b3e` | rc.4; resource list/read both 0 |
| 04:04:36.391 | open result | correlation `d165f0d0-a864-43ce-8f41-2a673d108e07`; attempt `c21d2772-dfb6-4f65-8393-2f3fcff2aa0d` | success; output template is versioned URI; `ready=false` |
| 04:04:41.010 | post-open health | `2c744fa6-4e3f-4654-b9dc-0acd54e14eb2` | `open_result=1`; resource list/read both 0 |
| 04:04:46.979 | bounded graph context | `0568b231-95d5-4192-a624-4361c764502d` | 2 nodes / 1 edge; not truncated |
| 04:04:51.376 | strict validation | `b85342cd-f6f5-4ae4-aa39-6cf513077822` | valid; no diagnostics; golden parity |
| 04:04:55.649 | one await-ready | `04569777-ce14-47db-8ed7-bab9a009990a` | `ready=false`; no instance, state, or transitions |
| 04:04:59.466 | final health | `93fda82e-273c-4942-8b1f-28a143c775df` | resource list/read/bootstrap/ready all 0 |

Final lifecycle counters:

```json
{
  "mcp_initialize": 1,
  "tool_descriptors_list": 1,
  "ui_resources_list": 0,
  "ui_resource_read": 0,
  "tool_call": 7,
  "open_result": 1,
  "widget_bootstrap_result": 0,
  "widget_ready_result": 0
}
```

The fixture SHA-256 before and after was:

`289653CFCFC2D333904D729942F4AF721E01EF30667F21F2FAAD3D4E36A1DA74`

The temporary fixture was deleted after the parent task independently verified the final hash.

## Layered result

| Layer | Status | Evidence boundary |
| --- | --- | --- |
| Tool descriptor | confirmed | Desktop log listed 14 server tools; server recorded `tool_descriptors_list=1`; open returned the versioned output template. |
| Resource discovery/read | falsified in the live run | Server counters stayed `0/0` from initial health through final health. Desktop logs also contained no `resources/list` or `resources/read` hit in the task window. |
| Resource response validity | confirmed by local control, not reached live | Packaged server list/read returned the registered URI, MIME, HTML, and CSP successfully. |
| Host URI/MIME/HTML/CSP acceptance | not reached; internal reason unknown | The host never requested the resource, so no accept/reject decision was observable. |
| iframe mount | not reached for this server-delivered resource; Desktop internals unknown | No resource was delivered and no iframe event is exposed in retained logs. |
| Widget JavaScript / `ui/initialize` | unknown | No first-script or initialize telemetry is exposed. |
| Server bootstrap | falsified | `widget_bootstrap_result=0`; no bootstrap tool call arrived. |
| React lifecycle | ready proof falsified; actual execution unknown | No Widget instance/state/transitions and `widget_ready_result=0`. |

## Expected and actual behavior

Expected: after the successful tool result references the registered MCP Apps resource, Codex Desktop should obtain that resource through the MCP resource mechanism and mount it, or expose an actionable rejection.

Actual: Desktop accepted and completed the tool call but never requested the registered resource. The first host-observable missing transition is resource discovery/read. Later iframe, JavaScript, bootstrap, and React stages cannot be attributed to a repository failure because the repository resource was never delivered.

## Evidence locations

- Structured tracked evidence: `plugins/agent-context-map/tests/evidence/phase8-canary.json`
- Raw local rollout (not committed): `rollout-2026-07-15T11-59-46-019f63ee-3c6f-7841-a905-0c60541fd0e8.jsonl`
- Desktop log source (not committed): local `logs_2.sqlite`

No raw workspace document content, user home path, credential, token, or remote service data is included in this report.
