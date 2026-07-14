import { randomUUID } from "node:crypto";
import { buildRelatedContext, buildSelectedContext } from "../../../../../packages/acm-core/src/index.js";
import { McpControlPlaneError } from "../errors.js";

const CONTEXT_TTL_MS = 5 * 60 * 1000;

function summarizeAll(doc, maxNodes) {
  const nodes = (doc.nodes || []).slice(0, maxNodes);
  const ids = new Set(nodes.map((node) => node.id));
  const allEdges = (doc.edges || []).filter((edge) => ids.has(edge.from) && ids.has(edge.to));
  const edges = allEdges.slice(0, maxNodes * 2);
  return {
    ok: true, mode: "all", documentId: doc.doc_id, nodes: structuredClone(nodes), edges: structuredClone(edges),
    truncated: nodes.length < (doc.nodes || []).length || edges.length < allEdges.length,
    omittedNodeCount: Math.max(0, (doc.nodes || []).length - nodes.length),
    omittedEdgeCount: Math.max(0, allEdges.length - edges.length),
  };
}

export class ContextStore {
  constructor({ now = () => Date.now() } = {}) { this.now = now; this.contexts = new Map(); }

  create(binding, record, { selector, relationPolicy = "selected", maxNodes = 80 }) {
    if (!selector || typeof selector !== "object" || Array.isArray(selector)) throw new McpControlPlaneError("invalid_arguments", "selector is required.");
    const limit = Math.min(Math.max(Number(maxNodes) || 80, 1), 100);
    let context;
    if (selector.type === "all") context = summarizeAll(record.doc, limit);
    else if (selector.type === "nodeIds") context = buildSelectedContext(record.doc, selector.nodeIds, { maxNodes: Math.min(limit, 20) });
    else if (selector.type === "related") context = buildRelatedContext(record.doc, selector.nodeIds, { maxNodes: Math.min(limit, 40), includeContains: relationPolicy === "related_with_children" });
    else if (selector.type === "query") {
      const query = String(selector.query || "").trim().toLocaleLowerCase();
      if (!query) throw new McpControlPlaneError("invalid_arguments", "selector.query cannot be empty.");
      const ids = (record.doc.nodes || []).filter((node) => [node.id, node.title, node.description, node.notes].some((value) => String(value || "").toLocaleLowerCase().includes(query))).map((node) => node.id);
      context = buildSelectedContext(record.doc, ids, { maxNodes: Math.min(limit, 20) });
    } else throw new McpControlPlaneError("invalid_arguments", "selector.type is unsupported.");
    if (!context.ok) throw new McpControlPlaneError(context.error || "empty_context", "The selector did not produce a safe graph context.");
    const contextId = randomUUID();
    const expiresAtMs = this.now() + CONTEXT_TTL_MS;
    this.contexts.set(contextId, {
      contextId, taskFingerprint: binding.taskFingerprint, projectId: binding.projectId,
      documentId: record.documentId, documentRevision: record.documentRevision, expiresAtMs,
    });
    return { ...context, contextId, documentRevision: record.documentRevision, relationPolicy, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  require(binding, contextId, documentId, revision) {
    const context = this.contexts.get(contextId);
    if (!context || context.expiresAtMs <= this.now()) throw new McpControlPlaneError("source_context_expired", "The source context is unavailable or expired.");
    if (context.taskFingerprint !== binding.taskFingerprint || context.projectId !== binding.projectId || context.documentId !== documentId || context.documentRevision !== revision) {
      throw new McpControlPlaneError("source_context_mismatch", "The source context does not match this task, project, document, or revision.");
    }
    return context;
  }
}
