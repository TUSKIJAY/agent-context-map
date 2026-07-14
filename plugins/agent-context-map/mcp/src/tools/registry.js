import { randomUUID } from "node:crypto";
import { computeDocumentRevision, parseAcmMd, validateDoc } from "../../../../../packages/acm-core/src/index.js";
import { asControlPlaneError, McpControlPlaneError } from "../errors.js";

const MAX_ACM_MD_BYTES = 2 * 1024 * 1024;

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

export const MCP_TOOLS = [
  {
    name: "agent_context_map_health",
    title: "Agent Context Map health",
    description: "Return bundled stdio MCP health. Does not inspect or modify a project.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: envelopeSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "validate_acm_graph",
    title: "Validate ACM-MD graph",
    description: "Strictly validate ACM-MD text in the current host-bound workspace. No project file is written.",
    inputSchema: {
      type: "object",
      required: ["acmMdText"],
      properties: { acmMdText: { type: "string", minLength: 1, maxLength: MAX_ACM_MD_BYTES } },
      additionalProperties: false,
    },
    outputSchema: envelopeSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
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

function asToolResult(envelope) {
  return {
    content: [{ type: "text", text: JSON.stringify(envelope) }],
    structuredContent: envelope,
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
    data: {
      valid,
      diagnostics,
      normalizedPreviewRevision: revision,
      pythonStrictParity: "golden_verified",
    },
  };
}

export function createToolRegistry({ sessionService, instanceId, version }) {
  return {
    list() { return { tools: MCP_TOOLS }; },
    async call(params, { requestClient }) {
      const correlationId = randomUUID();
      let binding = null;
      try {
        if (params?.name === "agent_context_map_health") {
          assertExactKeys(params.arguments || {}, []);
          return asToolResult(responseEnvelope({
            correlationId,
            data: { server: "agent-context-map", version, instanceId, transport: "stdio", topology: "single_process" },
          }));
        }
        if (params?.name !== "validate_acm_graph") throw new McpControlPlaneError("unknown_tool", "The requested MCP tool is not registered.");
        assertExactKeys(params.arguments, ["acmMdText"], ["acmMdText"]);
        const text = params.arguments.acmMdText;
        if (typeof text !== "string" || text.length === 0 || Buffer.byteLength(text, "utf8") > MAX_ACM_MD_BYTES) {
          throw new McpControlPlaneError("invalid_arguments", "acmMdText must be non-empty and no larger than 2 MiB.");
        }
        binding = await sessionService.bind({ meta: params._meta || {}, requestClient });
        const validated = await validateAcmText(text);
        return asToolResult(responseEnvelope({
          binding,
          correlationId,
          documentId: validated.documentId,
          documentRevision: validated.revision,
          data: validated.data,
        }));
      } catch (error) {
        const normalized = asControlPlaneError(error);
        return asToolResult(responseEnvelope({ binding, correlationId, error: normalized }));
      }
    },
  };
}

export { MAX_ACM_MD_BYTES };
