import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import {
  buildChangeSet,
  computeDocumentRevision,
  detectPromptInjection,
  diffDoc,
  parseAcmMd,
  toAcmMd,
  toExportDoc,
  toYaml,
  validateDoc,
} from "../../../../../packages/acm-core/src/index.js";
import { asControlPlaneError, McpControlPlaneError } from "../errors.js";
import { WIDGET_RESOURCE_URI } from "../resources/widget-placeholder.js";
import { resolveContainedAcmDocument } from "../security/path-security.js";
import { readWidgetProjectSnapshot } from "../widget/project-reader.js";
import { MAX_ACM_MD_BYTES, MCP_TOOLS } from "./definitions.js";
import { validateManualDocument } from "./operation-policy.js";

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
    error: error == null ? null : { code: error.code, message: error.message, retryable: error.retryable === true, details: error.details || null },
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

function diagnostic(code, severity, message, path = null) { return { code, severity, path, message }; }
function sha256(value) { return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }

async function validateAcmText(text) {
  if (typeof text !== "string" || text.length === 0 || Buffer.byteLength(text, "utf8") > MAX_ACM_MD_BYTES) {
    throw new McpControlPlaneError("invalid_arguments", "acmMdText must be non-empty and no larger than 2 MiB.");
  }
  const parsed = parseAcmMd(text, { mode: "strict" });
  const diagnostics = [
    ...parsed.errors.map((message) => diagnostic("parse_error", "error", message)),
    ...parsed.warnings.map((message) => diagnostic("parse_warning", "warning", message)),
  ];
  if (parsed.doc) diagnostics.push(...validateDoc(parsed.doc, { mode: "strict" }).map((issue) => diagnostic(
    issue.code || "validation_issue", issue.level === "error" ? "error" : "warning", issue.message, issue.path || null,
  )));
  const valid = Boolean(parsed.doc) && !diagnostics.some((item) => item.severity === "error");
  const revision = valid ? await computeDocumentRevision(parsed.doc) : null;
  return { documentId: parsed.doc?.doc_id || null, revision, doc: valid ? parsed.doc : null, data: { valid, diagnostics, normalizedPreviewRevision: revision, pythonStrictParity: "golden_verified" } };
}

function assertRevision(record, expectedRevision) {
  if (expectedRevision && expectedRevision !== record.documentRevision) {
    throw new McpControlPlaneError("revision_conflict", "The requested document revision is stale.", { details: { documentId: record.documentId, expectedRevision, currentRevision: record.documentRevision } });
  }
}

function publicProposalDigest(proposal) {
  return sha256({ proposalId: proposal.proposalId, documentId: proposal.documentId, baseRevision: proposal.baseRevision, normalizedOperations: proposal.normalizedOperations, previewDiff: proposal.previewDiff });
}

function appBaseKeys() { return ["openAttemptId", "widgetInstanceId", "appSessionNonce"]; }
function asWidgetRecord(record) {
  return {
    doc_id: record.documentId, title: record.doc.meta?.title || record.documentId, domain_profile: "generic",
    body: record.doc, base_snapshot: record.doc, source_path: record.relativePath, dirty: false,
    document_revision: record.documentRevision, modified_at: record.modifiedAt,
  };
}

export function createToolRegistry({ sessionService, widgetLifecycle, projectService, proposalStore, contextStore, sendService, instanceId, version }) {
  async function handleWidgetApi(binding, args) {
    const activeWidget = widgetLifecycle.requireReadyInstance(binding, args);
    const base = [...appBaseKeys(), "action"];
    if (args.action === "list_proposals") {
      assertExactKeys(args, [...base, "documentId"], base);
      return { proposals: proposalStore.list(binding, args.documentId || null) };
    }
    if (args.action === "prepare_commit") {
      assertExactKeys(args, [...base, "proposalId", "expectedRevision"], [...base, "proposalId"]);
      const proposal = proposalStore.require(binding, args.proposalId);
      if (proposal.type !== "import_create" && proposal.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("proposal_binding_mismatch", "The proposal belongs to a different Widget document.");
      if ((args.expectedRevision ?? null) !== (proposal.baseRevision ?? null)) throw new McpControlPlaneError("revision_conflict", "The proposal preview revision is stale.");
      const previewDigest = publicProposalDigest({
        proposalId: proposal.proposalId, documentId: proposal.documentId, baseRevision: proposal.baseRevision,
        normalizedOperations: proposal.operations, previewDiff: proposal.previewDiff,
      });
      const gesture = widgetLifecycle.issueUserGesture(binding, args, { purpose: `commit:${proposal.proposalId}`, digest: previewDigest });
      return { proposal: proposalStore.list(binding, proposal.documentId).find((item) => item.proposalId === proposal.proposalId), previewDigest, ...gesture };
    }
    if (["preview_send", "authorize_send"].includes(args.action)) {
      const sendKeys = [...base, "documentId", "expectedRevision", "mode", "selectedNodeIds", "includeContains", "userNote"];
      assertExactKeys(args, [...sendKeys, "previewDigest"], [...base, "documentId", "expectedRevision", "mode", "selectedNodeIds"]);
      const record = await projectService.read(binding, args.documentId);
      if (record.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("widget_document_mismatch", "The Widget is bound to a different document.");
      assertRevision(record, args.expectedRevision);
      const preview = sendService.build(record, args);
      if (args.action === "preview_send") return preview;
      if (args.previewDigest !== preview.previewDigest) throw new McpControlPlaneError("payload_digest_mismatch", "The send preview changed; review it again before sending.");
      return { ...preview, ...widgetLifecycle.issueUserGesture(binding, args, { purpose: "send", digest: preview.previewDigest }) };
    }
    if (args.action === "prepare_manual_commit") {
      assertExactKeys(args, [...base, "documentId", "expectedRevision", "clientMutationId", "document"], [...base, "documentId", "expectedRevision", "clientMutationId", "document"]);
      const record = await projectService.read(binding, args.documentId);
      if (record.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("widget_document_mismatch", "The Widget is bound to a different document.");
      assertRevision(record, args.expectedRevision);
      const document = validateManualDocument(args.documentId, args.document);
      const previewDiff = buildChangeSet(record.doc, document, diffDoc(record.doc, document));
      const previewDigest = sha256(toAcmMd(document));
      return { documentId: record.documentId, baseRevision: record.documentRevision, previewDiff, previewDigest, ...widgetLifecycle.issueUserGesture(binding, args, { purpose: `manual:${record.documentId}`, digest: previewDigest }) };
    }
    if (args.action === "refresh_document") {
      assertExactKeys(args, [...base, "documentId"], [...base, "documentId"]);
      return { record: asWidgetRecord(await projectService.read(binding, args.documentId)) };
    }
    throw new McpControlPlaneError("invalid_arguments", "Unsupported Widget API action.");
  }

  return {
    list() { return { tools: MCP_TOOLS }; },
    async call(params, { requestClient }) {
      const correlationId = randomUUID();
      let binding = null;
      try {
        const args = params?.arguments || {};
        if (params?.name === "agent_context_map_health") {
          assertExactKeys(args, []);
          return asToolResult(responseEnvelope({ correlationId, data: { server: "agent-context-map", version, instanceId, transport: "stdio", topology: "single_process" } }));
        }
        if (params?.name === "validate_acm_graph") {
          assertExactKeys(args, ["documentId", "expectedRevision", "acmMdText"]);
          if (Boolean(args.documentId) === Boolean(args.acmMdText)) throw new McpControlPlaneError("invalid_arguments", "Provide exactly one of documentId or acmMdText.");
        }
        binding = await sessionService.bind({ meta: params?._meta || {}, requestClient });

        if (params?.name === "open_agent_context_map") {
          assertExactKeys(args, ["documentId", "focusNodeIds", "mode"]);
          if (args.focusNodeIds && (!Array.isArray(args.focusNodeIds) || args.focusNodeIds.length > 20)) throw new McpControlPlaneError("invalid_arguments", "focusNodeIds is limited to 20 IDs.");
          const project = await readWidgetProjectSnapshot(binding);
          if (args.documentId) {
            const index = project.documents.findIndex((record) => record.doc_id === args.documentId);
            if (index < 0) throw new McpControlPlaneError("document_not_found", "The requested document does not exist.");
            project.documents.unshift(...project.documents.splice(index, 1));
          }
          project.focusNodeIds = args.focusNodeIds || [];
          project.mode = args.mode || "view";
          const lifecycle = widgetLifecycle.open(binding, project);
          const appOpen = widgetLifecycle.appOpenMetadata(binding, lifecycle.openAttemptId);
          const first = project.documents[0] || null;
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: first?.doc_id || null, documentRevision: first?.document_revision || null, data: { ...lifecycle, documentCount: project.documents.length, invalidDocumentCount: project.diagnostics.invalid.length, persistence: project.persistence } }), { "openai/outputTemplate": WIDGET_RESOURCE_URI, widgetData: { ...project, ...lifecycle, ...appOpen } });
        }
        if (params?.name === "await_agent_context_map_ready") {
          assertExactKeys(args, ["openAttemptId", "timeoutMs"], ["openAttemptId"]);
          const lifecycle = widgetLifecycle.awaitReady(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: lifecycle.documentId, documentRevision: lifecycle.documentRevision, data: lifecycle }));
        }
        if (params?.name === "get_acm_graph_context") {
          assertExactKeys(args, ["documentId", "selector", "relationPolicy", "maxNodes", "expectedRevision"], ["documentId", "selector"]);
          const record = await projectService.read(binding, args.documentId);
          assertRevision(record, args.expectedRevision);
          const context = contextStore.create(binding, record, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: record.documentId, documentRevision: record.documentRevision, data: context }));
        }
        if (params?.name === "validate_acm_graph") {
          assertExactKeys(args, ["documentId", "expectedRevision", "acmMdText"]);
          if (Boolean(args.documentId) === Boolean(args.acmMdText)) throw new McpControlPlaneError("invalid_arguments", "Provide exactly one of documentId or acmMdText.");
          if (args.documentId) {
            const record = await projectService.read(binding, args.documentId);
            assertRevision(record, args.expectedRevision);
            const validated = await validateAcmText(record.rawText);
            return asToolResult(responseEnvelope({ binding, correlationId, documentId: record.documentId, documentRevision: record.documentRevision, data: validated.data }));
          }
          const validated = await validateAcmText(args.acmMdText);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: validated.documentId, documentRevision: validated.revision, data: validated.data }));
        }
        if (params?.name === "write_acm_graph") {
          assertExactKeys(args, ["documentId", "expectedRevision", "clientMutationId", "operations", "rationale", "sourceContextId"], ["documentId", "expectedRevision", "clientMutationId", "operations", "rationale"]);
          if (typeof args.rationale !== "string" || !args.rationale.trim() || args.rationale.length > 8000 || detectPromptInjection(args.rationale)) throw new McpControlPlaneError("prompt_injection_detected", "The proposal rationale is invalid or instruction-like.");
          const record = await projectService.read(binding, args.documentId);
          if (args.sourceContextId) contextStore.require(binding, args.sourceContextId, record.documentId, args.expectedRevision);
          const proposal = proposalStore.createOperations(binding, record, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: record.documentId, documentRevision: record.documentRevision, data: proposal }));
        }
        if (params?.name === "import_acm_md") {
          assertExactKeys(args, ["acmMdText", "projectRelativePath", "targetDocumentId", "expectedRevision", "mode"], ["targetDocumentId", "mode"]);
          if (Boolean(args.acmMdText) === Boolean(args.projectRelativePath)) throw new McpControlPlaneError("invalid_arguments", "Provide exactly one import source.");
          const text = args.acmMdText || await fs.readFile(await resolveContainedAcmDocument(binding.root, args.projectRelativePath), "utf8");
          const validated = await validateAcmText(text);
          if (!validated.doc) throw new McpControlPlaneError("validation_failed", "Invalid ACM-MD cannot create an import proposal.");
          if (validated.doc.doc_id !== args.targetDocumentId) throw new McpControlPlaneError("document_id_mismatch", "targetDocumentId must match the imported doc_id.");
          let currentRecord = null;
          try { currentRecord = await projectService.read(binding, args.targetDocumentId); } catch (error) { if (error.code !== "document_not_found") throw error; }
          if (args.mode === "create" && (currentRecord || args.expectedRevision != null)) throw new McpControlPlaneError("document_already_exists", "Create import requires a missing document and no expectedRevision.");
          if (args.mode === "replace-preview") {
            if (!currentRecord) throw new McpControlPlaneError("document_not_found", "Replace preview requires an existing document.");
            assertRevision(currentRecord, args.expectedRevision);
            if (!args.expectedRevision) throw new McpControlPlaneError("missing_expected_revision", "Replace preview requires expectedRevision.");
          }
          const proposal = proposalStore.createImport(binding, { documentId: args.targetDocumentId, expectedRevision: args.expectedRevision || null, document: validated.doc, currentRecord, mode: args.mode, diagnostics: validated.data.diagnostics });
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: args.targetDocumentId, documentRevision: currentRecord?.documentRevision || null, data: { importProposalId: proposal.proposalId, ...proposal, parsedSummary: { nodeCount: validated.doc.nodes.length, edgeCount: validated.doc.edges.length }, previewRevision: validated.revision } }));
        }
        if (params?.name === "export_acm_md") {
          assertExactKeys(args, ["documentId", "expectedRevision", "includeLayout"], ["documentId"]);
          const record = await projectService.read(binding, args.documentId);
          assertRevision(record, args.expectedRevision);
          const document = structuredClone(record.doc);
          if (args.includeLayout === false) { delete document.layout; for (const node of document.nodes || []) { delete node.x; delete node.y; } }
          const text = args.includeLayout === false
            ? `\`\`\`acm\n${toYaml(Object.fromEntries(Object.entries(toExportDoc(document)).filter(([key]) => key !== "layout")))}\n\`\`\`\n`
            : toAcmMd(document);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: record.documentId, documentRevision: record.documentRevision, data: { fileName: `${record.documentId}.acm.md`, mimeType: "text/markdown", acmMdText: text, sha256: sha256(text), includeLayout: args.includeLayout !== false } }));
        }
        if (params?.name === "agent_context_map_widget_bootstrap") {
          assertExactKeys(args, ["openAttemptId", "clientMountId", "bootstrapNonce"], ["openAttemptId", "clientMountId", "bootstrapNonce"]);
          const lifecycle = widgetLifecycle.bootstrap(binding, args);
          const app = widgetLifecycle.appMetadata(binding, { openAttemptId: args.openAttemptId, widgetInstanceId: lifecycle.widgetInstanceId });
          return asToolResult(responseEnvelope({ binding, correlationId, data: lifecycle }), { widgetData: { ...lifecycle, ...app } });
        }
        if (params?.name === "agent_context_map_widget_ready") {
          assertExactKeys(args, [...appBaseKeys(), "proof"], [...appBaseKeys(), "proof"]);
          const lifecycle = widgetLifecycle.ready(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: lifecycle.documentId, documentRevision: lifecycle.documentRevision, data: lifecycle }));
        }
        if (params?.name === "agent_context_map_widget_api") {
          const data = await handleWidgetApi(binding, args);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: data.documentId || args.documentId || null, documentRevision: data.documentRevision || null, data }));
        }
        if (params?.name === "commit_acm_proposal") {
          assertExactKeys(args, [...appBaseKeys(), "proposalId", "expectedRevision", "previewDigest", "userGestureNonce"], [...appBaseKeys(), "proposalId", "expectedRevision", "previewDigest", "userGestureNonce"]);
          const proposal = proposalStore.require(binding, args.proposalId);
          const activeWidget = widgetLifecycle.requireReadyInstance(binding, args);
          if (proposal.type !== "import_create" && proposal.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("proposal_binding_mismatch", "The proposal belongs to a different Widget document.");
          const publicDigest = publicProposalDigest({ proposalId: proposal.proposalId, documentId: proposal.documentId, baseRevision: proposal.baseRevision, normalizedOperations: proposal.operations, previewDiff: proposal.previewDiff });
          if (args.previewDigest !== publicDigest || (args.expectedRevision ?? null) !== (proposal.baseRevision ?? null)) throw new McpControlPlaneError("payload_digest_mismatch", "The proposal preview changed; review it again.");
          widgetLifecycle.consumeUserGesture(binding, args, { purpose: `commit:${proposal.proposalId}`, digest: publicDigest });
          const store = projectService.store(binding);
          const result = proposal.type === "operations"
            ? await store.writeDocument({ documentId: proposal.documentId, expectedRevision: proposal.baseRevision, operations: proposal.operations, baseDocument: proposal.baseDocument, clientMutationId: `proposal:${proposal.proposalId}` })
            : await store.writeDocument({ documentId: proposal.documentId, expectedRevision: proposal.baseRevision, document: proposal.previewDocument, create: proposal.type === "import_create", clientMutationId: `proposal:${proposal.proposalId}` });
          proposalStore.markCommitted(proposal);
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: proposal.documentId, documentRevision: result.newRevision, data: { newRevision: result.newRevision, committedOperationIds: result.appliedOperationIds, indexUpdateStatus: result.indexUpdateStatus } }));
        }
        if (params?.name === "commit_manual_edit") {
          assertExactKeys(args, [...appBaseKeys(), "documentId", "expectedRevision", "clientMutationId", "previewDigest", "userGestureNonce", "document"], [...appBaseKeys(), "documentId", "expectedRevision", "clientMutationId", "previewDigest", "userGestureNonce", "document"]);
          const document = validateManualDocument(args.documentId, args.document);
          const activeWidget = widgetLifecycle.requireReadyInstance(binding, args);
          if (args.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("widget_document_mismatch", "The Widget is bound to a different document.");
          const current = await projectService.read(binding, args.documentId); assertRevision(current, args.expectedRevision);
          const previewDigest = sha256(toAcmMd(document));
          if (args.previewDigest !== previewDigest) throw new McpControlPlaneError("payload_digest_mismatch", "The manual edit changed after preview.");
          widgetLifecycle.consumeUserGesture(binding, args, { purpose: `manual:${args.documentId}`, digest: previewDigest });
          const result = await projectService.store(binding).writeDocument({ documentId: args.documentId, expectedRevision: args.expectedRevision, document, baseDocument: current.doc, clientMutationId: args.clientMutationId });
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: args.documentId, documentRevision: result.newRevision, data: { newRevision: result.newRevision, indexUpdateStatus: result.indexUpdateStatus } }));
        }
        if (params?.name === "send_acm_context") {
          assertExactKeys(args, [...appBaseKeys(), "mode", "documentId", "expectedRevision", "selectedNodeIds", "includeContains", "userNote", "previewDigest", "userGestureNonce"], [...appBaseKeys(), "mode", "documentId", "expectedRevision", "selectedNodeIds", "previewDigest", "userGestureNonce"]);
          const record = await projectService.read(binding, args.documentId); assertRevision(record, args.expectedRevision);
          const activeWidget = widgetLifecycle.requireReadyInstance(binding, args);
          if (record.documentId !== activeWidget.instance.documentId) throw new McpControlPlaneError("widget_document_mismatch", "The Widget is bound to a different document.");
          const rebuilt = sendService.build(record, args);
          if (rebuilt.previewDigest !== args.previewDigest) throw new McpControlPlaneError("payload_digest_mismatch", "The send payload changed after preview.");
          widgetLifecycle.consumeUserGesture(binding, args, { purpose: "send", digest: rebuilt.previewDigest });
          return asToolResult(responseEnvelope({ binding, correlationId, documentId: record.documentId, documentRevision: record.documentRevision, data: { ...rebuilt, authorized: true } }));
        }
        throw new McpControlPlaneError("unknown_tool", "The requested MCP tool is not registered.");
      } catch (error) {
        const normalized = asControlPlaneError(error);
        return asToolResult(responseEnvelope({ binding, correlationId, error: normalized }));
      }
    },
  };
}

export { MCP_TOOLS, MAX_ACM_MD_BYTES };
