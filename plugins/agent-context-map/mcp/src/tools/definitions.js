import { WIDGET_RESOURCE_URI } from "../resources/widget-placeholder.js";

export const MAX_ACM_MD_BYTES = 2 * 1024 * 1024;
export const identifierSchema = { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" };
const documentIdSchema = { ...identifierSchema, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$" };
const revisionSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const nullableRevisionSchema = { oneOf: [revisionSchema, { type: "null" }] };
const readOnlyAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };
const appOnlyMeta = { ui: { visibility: ["app"] }, "openai/widgetAccessible": true };

export function strictObject(properties = {}, required = []) { return { type: "object", properties, required, additionalProperties: false }; }

const envelopeSchema = strictObject({
  ok: { type: "boolean" }, projectId: { type: ["string", "null"] }, documentId: { type: ["string", "null"] },
  documentRevision: { type: ["string", "null"] }, sessionId: { type: ["string", "null"] }, correlationId: { type: "string" },
  data: { type: ["object", "null"] },
  error: { oneOf: [strictObject({ code: { type: "string" }, message: { type: "string" }, retryable: { type: "boolean" }, details: { type: ["object", "null"] } }, ["code", "message", "retryable", "details"]), { type: "null" }] },
}, ["ok", "projectId", "documentId", "documentRevision", "sessionId", "correlationId", "data", "error"]);

const idArray = { type: "array", items: identifierSchema, maxItems: 100, uniqueItems: true };
const preconditions = strictObject({ nodeExists: idArray, nodeAbsent: idArray, edgeExists: idArray, edgeAbsent: idArray, noDanglingEdges: { type: "boolean" } });
const node = strictObject({
  id: identifierSchema, type: { type: "string" }, title: { type: "string", maxLength: 2000 }, status: { enum: ["suggested", "needs_validation", "deprecated", "confirmed"] },
  description: { type: "string", maxLength: 12000 }, priority: { type: "string" }, source: { type: "string", maxLength: 500 }, confidence: { type: "number", minimum: 0, maximum: 1 },
  tags: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 100 }, notes: { type: "string", maxLength: 12000 }, x: { type: "number" }, y: { type: "number" },
}, ["id", "type", "title", "status"]);
const edge = strictObject({
  id: identifierSchema, from: identifierSchema, to: identifierSchema, type: { type: "string" }, status: { enum: ["suggested", "needs_validation", "deprecated", "confirmed"] },
  reason: { type: "string", maxLength: 12000 }, source: { type: "string", maxLength: 500 }, confidence: { type: "number", minimum: 0, maximum: 1 },
}, ["id", "from", "to", "type", "status"]);
const nodeUpdateFields = strictObject({
  title: { type: "string", maxLength: 2000 }, status: { enum: ["suggested", "needs_validation", "deprecated", "confirmed"] }, description: { type: "string", maxLength: 12000 },
  priority: { type: "string" }, source: { type: "string", maxLength: 500 }, confidence: { type: "number", minimum: 0, maximum: 1 }, tags: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 100 }, notes: { type: "string", maxLength: 12000 },
});
const edgeUpdateFields = strictObject({
  type: { type: "string" }, status: { enum: ["suggested", "needs_validation", "deprecated", "confirmed"] }, reason: { type: "string", maxLength: 12000 },
  source: { type: "string", maxLength: 500 }, confidence: { type: "number", minimum: 0, maximum: 1 },
});
const common = { id: identifierSchema, preconditions, reason: { type: "string", maxLength: 4000 } };
const operation = { oneOf: [
  strictObject({ ...common, op: { const: "addNode" }, node }, ["id", "op", "node"]),
  strictObject({ ...common, op: { const: "updateNodeFields" }, nodeId: identifierSchema, fields: nodeUpdateFields }, ["id", "op", "nodeId", "fields"]),
  strictObject({ ...common, op: { const: "removeNode" }, nodeId: identifierSchema }, ["id", "op", "nodeId"]),
  strictObject({ ...common, op: { const: "addEdge" }, edge }, ["id", "op", "edge"]),
  strictObject({ ...common, op: { const: "updateEdgeFields" }, edgeId: identifierSchema, fields: edgeUpdateFields }, ["id", "op", "edgeId", "fields"]),
  strictObject({ ...common, op: { const: "removeEdge" }, edgeId: identifierSchema }, ["id", "op", "edgeId"]),
  strictObject({ ...common, op: { const: "setNodeLayout" }, nodeId: identifierSchema, layout: strictObject({ x: { type: "number" }, y: { type: "number" } }, ["x", "y"]) }, ["id", "op", "nodeId", "layout"]),
] };
const appBinding = { openAttemptId: identifierSchema, widgetInstanceId: identifierSchema, appSessionNonce: identifierSchema };

export const MCP_TOOLS = [
  { name: "agent_context_map_health", title: "Agent Context Map health", description: "Return bundled stdio MCP health without reading or modifying a project.", inputSchema: strictObject(), outputSchema: envelopeSchema, annotations: readOnlyAnnotations },
  {
    name: "open_agent_context_map", title: "Open Agent Context Map", description: "Open the native Widget for the current trusted project.",
    inputSchema: strictObject({ documentId: documentIdSchema, focusNodeIds: { ...idArray, maxItems: 20 }, mode: { enum: ["view", "edit"] } }), outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
    _meta: { ui: { resourceUri: WIDGET_RESOURCE_URI, visibility: ["model", "app"] }, "openai/outputTemplate": WIDGET_RESOURCE_URI, "openai/widgetAccessible": true, "openai/toolInvocation/invoking": "Opening Agent Context Map...", "openai/toolInvocation/invoked": "Agent Context Map opened" },
  },
  { name: "await_agent_context_map_ready", title: "Await Agent Context Map ready", description: "Check for the complete rendered Widget ready proof.", inputSchema: strictObject({ openAttemptId: identifierSchema, timeoutMs: { type: "integer", minimum: 0, maximum: 2000 } }, ["openAttemptId"]), outputSchema: envelopeSchema, annotations: readOnlyAnnotations, _meta: { ui: { visibility: ["model"] } } },
  {
    name: "get_acm_graph_context", title: "Get ACM graph context", description: "Read a bounded, revision-bound graph context from the current trusted project.",
    inputSchema: strictObject({ documentId: documentIdSchema, selector: strictObject({ type: { enum: ["all", "nodeIds", "query", "related"] }, nodeIds: idArray, query: { type: "string", minLength: 1, maxLength: 500 } }, ["type"]), relationPolicy: { enum: ["selected", "related_safe", "related_with_children"] }, maxNodes: { type: "integer", minimum: 1, maximum: 100 }, expectedRevision: revisionSchema }, ["documentId", "selector"]),
    outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
  },
  {
    name: "validate_acm_graph", title: "Validate ACM-MD graph", description: "Strictly validate a bound document or supplied ACM-MD text without writing.",
    inputSchema: strictObject({ documentId: documentIdSchema, expectedRevision: revisionSchema, acmMdText: { type: "string", minLength: 1, maxLength: MAX_ACM_MD_BYTES } }), outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
  },
  {
    name: "write_acm_graph", title: "Propose ACM graph operations", description: "Create an in-memory pending proposal. This tool never writes the formal project document.",
    inputSchema: strictObject({ documentId: documentIdSchema, expectedRevision: revisionSchema, clientMutationId: identifierSchema, operations: { type: "array", items: operation, minItems: 1, maxItems: 100 }, rationale: { type: "string", minLength: 1, maxLength: 8000 }, sourceContextId: identifierSchema }, ["documentId", "expectedRevision", "clientMutationId", "operations", "rationale"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "import_acm_md", title: "Preview ACM-MD import", description: "Parse ACM-MD into a pending import preview; no project file is written.",
    inputSchema: strictObject({ acmMdText: { type: "string", minLength: 1, maxLength: MAX_ACM_MD_BYTES }, projectRelativePath: { type: "string", minLength: 1, maxLength: 300 }, targetDocumentId: documentIdSchema, expectedRevision: nullableRevisionSchema, mode: { enum: ["create", "replace-preview"] } }, ["targetDocumentId", "mode"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false },
  },
  {
    name: "export_acm_md", title: "Export ACM-MD", description: "Return canonical ACM-MD text from the bound formal document without writing a path.",
    inputSchema: strictObject({ documentId: documentIdSchema, expectedRevision: revisionSchema, includeLayout: { type: "boolean" } }, ["documentId"]), outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
  },
  { name: "agent_context_map_widget_bootstrap", title: "Bootstrap Agent Context Map Widget", description: "App-only Widget instance binding.", inputSchema: strictObject({ openAttemptId: identifierSchema, clientMountId: identifierSchema, bootstrapNonce: identifierSchema }, ["openAttemptId", "clientMountId", "bootstrapNonce"]), outputSchema: envelopeSchema, annotations: readOnlyAnnotations, _meta: appOnlyMeta },
  { name: "agent_context_map_widget_ready", title: "Mark Agent Context Map Widget ready", description: "App-only rendered-canvas ready proof.", inputSchema: strictObject({ ...appBinding, proof: strictObject({ reactMounted: { const: true }, projectHydrated: { const: true }, canvasFirstFrame: { const: true }, documentId: documentIdSchema }, ["reactMounted", "projectHydrated", "canvasFirstFrame", "documentId"]) }, ["openAttemptId", "widgetInstanceId", "appSessionNonce", "proof"]), outputSchema: envelopeSchema, annotations: readOnlyAnnotations, _meta: appOnlyMeta },
  {
    name: "agent_context_map_widget_api", title: "Agent Context Map Widget API", description: "App-only proposal, preview, gesture, and refresh API.",
    inputSchema: strictObject({ ...appBinding, action: { enum: ["list_proposals", "prepare_commit", "preview_send", "authorize_send", "prepare_manual_commit", "refresh_document"] }, proposalId: identifierSchema, documentId: documentIdSchema, expectedRevision: revisionSchema, clientMutationId: identifierSchema, mode: { enum: ["selected_context", "related_subgraph", "execution_prompt"] }, selectedNodeIds: idArray, includeContains: { type: "boolean" }, userNote: { type: "string", maxLength: 2000 }, previewDigest: revisionSchema, document: { type: "object" } }, ["openAttemptId", "widgetInstanceId", "appSessionNonce", "action"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false }, _meta: appOnlyMeta,
  },
  {
    name: "commit_acm_proposal", title: "Commit ACM proposal", description: "App-only one-time user-gesture commit of a pending proposal.",
    inputSchema: strictObject({ ...appBinding, proposalId: identifierSchema, expectedRevision: nullableRevisionSchema, previewDigest: revisionSchema, userGestureNonce: identifierSchema }, ["openAttemptId", "widgetInstanceId", "appSessionNonce", "proposalId", "expectedRevision", "previewDigest", "userGestureNonce"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false, idempotentHint: true }, _meta: appOnlyMeta,
  },
  {
    name: "commit_manual_edit", title: "Commit manual ACM edit", description: "App-only one-time user-gesture commit of the Widget working copy.",
    inputSchema: strictObject({ ...appBinding, documentId: documentIdSchema, expectedRevision: revisionSchema, clientMutationId: identifierSchema, previewDigest: revisionSchema, userGestureNonce: identifierSchema, document: { type: "object" } }, ["openAttemptId", "widgetInstanceId", "appSessionNonce", "documentId", "expectedRevision", "clientMutationId", "previewDigest", "userGestureNonce", "document"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false, idempotentHint: true }, _meta: appOnlyMeta,
  },
  {
    name: "send_acm_context", title: "Authorize ACM context send", description: "App-only click-gated send authorization; the server rebuilds and verifies the final message.",
    inputSchema: strictObject({ ...appBinding, mode: { enum: ["selected_context", "related_subgraph", "execution_prompt"] }, documentId: documentIdSchema, expectedRevision: revisionSchema, selectedNodeIds: idArray, includeContains: { type: "boolean" }, userNote: { type: "string", maxLength: 2000 }, previewDigest: revisionSchema, userGestureNonce: identifierSchema }, ["openAttemptId", "widgetInstanceId", "appSessionNonce", "mode", "documentId", "expectedRevision", "selectedNodeIds", "previewDigest", "userGestureNonce"]),
    outputSchema: envelopeSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false, idempotentHint: false }, _meta: appOnlyMeta,
  },
];

export { envelopeSchema, appOnlyMeta, readOnlyAnnotations, documentIdSchema, revisionSchema };
