import { randomUUID } from "node:crypto";
import { computeDocumentRevision, parseAcmMd, validateDoc } from "../../../../../packages/acm-core/src/index.js";
import { asControlPlaneError, McpControlPlaneError } from "../errors.js";
import { WIDGET_RESOURCE_URI } from "../resources/widget-placeholder.js";
import { readWidgetProjectSnapshot } from "../widget/project-reader.js";

const MAX_ACM_MD_BYTES = 2 * 1024 * 1024;
const identifierSchema = { type: "string", minLength: 1, maxLength: 128, pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" };
const readOnlyAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };
const appOnlyMeta = { ui: { visibility: ["app"] }, "openai/widgetAccessible": true };

const envelopeSchema = {
  type: "object",
  required: ["ok", "projectId", "documentId", "documentRevision", "sessionId", "correlationId", "data", "error"],
  properties: {
    ok: { type: "boolean" },
    projectId: { type: ["string", "null"] },
    documentId: { type: ["string", "null"] },
    documentRevision: { type: ["string", "null"] },
    sessionId: { type: ["string", "null"] },
    correlationId: { type: "string" },
    data: { type: ["object", "null"] },
    error: { type: ["object", "null"] },
  },
  additionalProperties: false,
};

function strictObject(properties = {}, required = []) {
  return { type: "object", properties, required, additionalProperties: false };
}

export const MCP_TOOLS = [
  {
    name: "agent_context_map_health",
    title: "Agent Context Map health",
    description: "Return bundled stdio MCP health. Does not inspect or modify a project.",
    inputSchema: strictObject(), outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
  },
  {
    name: "validate_acm_graph",
    title: "Validate ACM-MD graph",
    description: "Strictly validate ACM-MD text in the current host-bound workspace. No project file is written.",
    inputSchema: strictObject({ acmMdText: { type: "string", minLength: 1, maxLength: MAX_ACM_MD_BYTES } }, ["acmMdText"]),
    outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
  },
  {
    name: "open_agent_context_map",
    title: "Open Agent Context Map",
    description: "Open the native Agent Context Map Widget for the current trusted project using a read-only project snapshot.",
    inputSchema: strictObject(), outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
    _meta: {
      ui: { resourceUri: WIDGET_RESOURCE_URI, visibility: ["model", "app"] },
      "openai/outputTemplate": WIDGET_RESOURCE_URI,
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Opening Agent Context Map...",
      "openai/toolInvocation/invoked": "Agent Context Map opened",
    },
  },
  {
    name: "await_agent_context_map_ready",
    title: "Await Agent Context Map ready",
    description: "Check whether the active Widget has mounted React, hydrated the bound project, and rendered its first canvas frame.",
    inputSchema: strictObject({ openAttemptId: identifierSchema }, ["openAttemptId"]),
    outputSchema: envelopeSchema, annotations: readOnlyAnnotations,
    _meta: { ui: { visibility: ["model"] } },
  },
  {
    name: "agent_context_map_widget_bootstrap",
    title: "Bootstrap Agent Context Map Widget",
    description: "App-only lifecycle method that binds a mounted Widget instance to an active open attempt.",
    inputSchema: strictObject({ openAttemptId: identifierSchema, clientMountId: identifierSchema }, ["openAttemptId", "clientMountId"]),
    outputSchema: envelopeSchema, annotations: readOnlyAnnotations, _meta: appOnlyMeta,
  },
  {
    name: "agent_context_map_widget_ready",
    title: "Mark Agent Context Map Widget ready",
    description: "App-only lifecycle method that submits the final rendered-canvas ready proof.",
    inputSchema: strictObject({
      openAttemptId: identifierSchema,
      widgetInstanceId: identifierSchema,
      proof: strictObject({
        reactMounted: { type: "boolean", const: true },
        projectHydrated: { type: "boolean", const: true },
        canvasFirstFrame: { type: "boolean", const: true },
        documentId: identifierSchema,
      }, ["reactMounted", "projectHydrated", "canvasFirstFrame", "documentId"]),
    }, ["openAttemptId", "widgetInstanceId", "proof"]),
    outputSchema: envelopeSchema, annotations: readOnlyAnnotations, _meta: appOnlyMeta,
  },
  ...["commit", "send"].map((action) => ({
    name: `agent_context_map_widget_${action}`,
    title: `${action === "commit" ? "Commit" : "Send"} Agent Context Map Widget`,
    description: `Reserved app-only ${action} lifecycle endpoint. Phase 5 verifies stale-instance rejection; the capability remains disabled until Phase 6.`,
    inputSchema: strictObject({ openAttemptId: identifierSchema, widgetInstanceId: identifierSchema }, ["openAttemptId", "widgetInstanceId"]),
    outputSchema: envelopeSchema,
    annotations: { readOnlyHint: false, destructiveHint: action === "commit", openWorldHint: false, idempotentHint: false },
    _meta: appOnlyMeta,
  })),
];

function assertExactKeys(value, allowed, required = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new McpControlPlaneError("invalid_arguments", "Tool arguments must be an object.");
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key)) || required.some((key) => !keys.includes(key))) {
    throw new McpControlPlaneError("invalid_arguments", "Tool arguments do not match the strict input schema.");
  }
}

function responseEnvelope({ binding = null, data = null, error = null, documentId = null, documentRevision = null, correlationId = randomUUID() } = {}) {
  return {
    ok: error == null,
    projectId: binding?.projectId || null,
    documentId,
    documentRevision,
    sessionId: binding?.sessionId || null,
    correlationId,
    data,
    error: error == null ? null : { code: error.code, message: error.message, retryable: error.retryable === true },
  };
}

function asToolResult(envelope, metadata = null) {
  return {
    content: [{ type: "text", text: JSON.stringify(envelope) }],
    structuredContent: envelope,
    ...(metadata ? { _meta: metadata } : {}),
    ...(envelope.ok ? {} : { isError: true }),
  };
}

function diagnostic(code, severity, message, path = null) {
  return { code, severity, path, message };
}

async function validateAcmText(text) {
  const parsed = parseAcmMd(text, { mode: "strict" });
  const diagnostics = [
    ...parsed.errors.map((message) => diagnostic("parse_error", "error", message)),
    ...parsed.warnings.map((message) => diagnostic("parse_warning", "warning", message)),
  ];
  if (parsed.doc) {
    diagnostics.push(...validateDoc(parsed.doc, { mode: "strict" }).map((issue) => diagnostic(
      issue.code || "validation_issue",
      issue.level === "error" ? "error" : "warning",
      issue.message,
      issue.path || null,
    )));
  }
  const valid = Boolean(parsed.doc) && !diagnostics.some((item) => item.severity === "error");
  const revision = valid ? await computeDocumentRevision(parsed.doc) : null;
  return {
    documentId: parsed.doc?.doc_id || null,
    revision,
    data: { valid, diagnostics, normalizedPreviewRevision: revision, pythonStrictParity: "golden_verified" },
  };
}

export function createToolRegistry({ sessionService, widgetLifecycle, instanceId, version }) {
  return {
    list() { return { tools: MCP_TOOLS }; },
    async call(params, { requestClient }) {
      const correlationId = randomUUID();
      let binding = null;
      try {
        const args = params?.arguments || {};
        if (params?.name === "agent_context_map_health") {
          assertExactKeys(args, []);
          return asToolResult(responseEnvelope({
            correlationId,
            data: { server: "agent-context-map", version, instanceId, transport: "stdio", topology: "single_process" },
          }));
        }
        if (params?.name === "validate_acm_graph") {
          assertExactKeys(params.arguments, ["acmMdText"], ["acmMdText"]);
          const text = params.arguments.acmMdText;
          if (typeof text !== "string" || text.length === 0 || Buffer.byteLength(text, "utf8") > MAX_ACM_MD_BYTES) {
            throw new McpControlPlaneError("invalid_arguments", "acmMdText must be non-empty and no larger than 2 MiB.");
          }
          binding = await sessionService.bind({ meta: params._meta || {}, requestClient });
          const validated = await validateAcmText(text);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: validated.documentId, documentRevision: validated.revision, data: validated.data }));
        }

        binding = await sessionService.bind({ meta: params?._meta || {}, requestClient });
        if (params?.name === "open_agent_context_map") {
          assertExactKeys(args, []);
          const project = await readWidgetProjectSnapshot(binding);
          const lifecycle = widgetLifecycle.open(binding, project);
          const first = project.documents[0] || null;
          return asToolResult(responseEnvelope({
            binding, correlationId, documentId: first?.doc_id || null, documentRevision: first?.document_revision || null,
            data: { ...lifecycle, documentCount: project.documents.length, invalidDocumentCount: project.diagnostics.invalid.length, persistence: project.persistence },
          }), {
            "openai/outputTemplate": WIDGET_RESOURCE_URI,
            widgetData: { ...project, ...lifecycle },
          });
        }
        if (params?.name === "await_agent_context_map_ready") {
          assertExactKeys(args, ["openAttemptId"], ["openAttemptId"]);
          const lifecycle = widgetLifecycle.awaitReady(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: lifecycle.documentId, data: lifecycle }));
        }
        if (params?.name === "agent_context_map_widget_bootstrap") {
          assertExactKeys(args, ["openAttemptId", "clientMountId"], ["openAttemptId", "clientMountId"]);
          const lifecycle = widgetLifecycle.bootstrap(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, data: lifecycle }), { widgetData: lifecycle });
        }
        if (params?.name === "agent_context_map_widget_ready") {
          assertExactKeys(args, ["openAttemptId", "widgetInstanceId", "proof"], ["openAttemptId", "widgetInstanceId", "proof"]);
          const lifecycle = widgetLifecycle.ready(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: lifecycle.documentId, data: lifecycle }), { widgetData: lifecycle });
        }
        if (params?.name === "agent_context_map_widget_commit" || params?.name === "agent_context_map_widget_send") {
          assertExactKeys(args, ["openAttemptId", "widgetInstanceId"], ["openAttemptId", "widgetInstanceId"]);
          const action = params.name.endsWith("commit") ? "commit" : "send";
          widgetLifecycle.gateReservedAction(binding, args, action);
        }
        throw new McpControlPlaneError("unknown_tool", "The requested MCP tool is not registered.");
      } catch (error) {
        const normalized = asControlPlaneError(error);
        return asToolResult(responseEnvelope({ binding, correlationId, error: normalized }));
      }
    },
  };
}

export { MAX_ACM_MD_BYTES };
