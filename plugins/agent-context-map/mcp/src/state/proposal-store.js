import { createHash, randomUUID } from "node:crypto";
import { buildChangeSet, diffDoc } from "../../../../../packages/acm-core/src/index.js";
import { McpControlPlaneError } from "../errors.js";
import { normalizeModelOperations } from "../tools/operation-policy.js";

const PROPOSAL_TTL_MS = 15 * 60 * 1000;

function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function publicProposal(proposal) {
  return {
    proposalId: proposal.proposalId,
    type: proposal.type,
    documentId: proposal.documentId,
    baseRevision: proposal.baseRevision,
    normalizedOperations: proposal.operations ? structuredClone(proposal.operations) : null,
    previewDiff: structuredClone(proposal.previewDiff),
    diagnostics: structuredClone(proposal.diagnostics || []),
    rationale: proposal.rationale || "",
    expiresAt: new Date(proposal.expiresAtMs).toISOString(),
    requiresHumanAcceptance: true,
    state: proposal.state,
  };
}

export class ProposalStore {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.proposals = new Map();
    this.mutations = new Map();
  }

  bindingKey(binding) { return `${binding.taskFingerprint}\u0000${binding.projectId}`; }

  createOperations(binding, record, input) {
    if (record.documentRevision !== input.expectedRevision) {
      throw new McpControlPlaneError("revision_conflict", "The document revision changed before proposal creation.", { details: { documentId: record.documentId, expectedRevision: input.expectedRevision, currentRevision: record.documentRevision } });
    }
    const mutationKey = `${this.bindingKey(binding)}\u0000${input.clientMutationId}`;
    const mutationDigest = digest({ documentId: record.documentId, expectedRevision: input.expectedRevision, operations: input.operations, rationale: input.rationale, sourceContextId: input.sourceContextId || null });
    const prior = this.mutations.get(mutationKey);
    if (prior) {
      if (prior.digest !== mutationDigest) throw new McpControlPlaneError("idempotency_conflict", "clientMutationId was already used with different proposal content.");
      return publicProposal(this.proposals.get(prior.proposalId));
    }
    const normalized = normalizeModelOperations(record.doc, input.operations);
    const proposal = {
      proposalId: randomUUID(), type: "operations", taskFingerprint: binding.taskFingerprint,
      projectId: binding.projectId, sessionId: binding.sessionId, documentId: record.documentId,
      baseRevision: record.documentRevision, baseDocument: structuredClone(record.doc), operations: normalized.operations,
      previewDocument: normalized.nextDocument, previewDiff: normalized.previewDiff, diagnostics: normalized.diagnostics,
      rationale: input.rationale, createdAtMs: this.now(), expiresAtMs: this.now() + PROPOSAL_TTL_MS, state: "pending",
    };
    this.proposals.set(proposal.proposalId, proposal);
    this.mutations.set(mutationKey, { digest: mutationDigest, proposalId: proposal.proposalId });
    return publicProposal(proposal);
  }

  createImport(binding, { documentId, expectedRevision, document, currentRecord = null, mode, diagnostics = [] }) {
    const base = currentRecord?.doc || { schema_version: document.schema_version, doc_id: documentId, meta: { title: "" }, nodes: [], edges: [] };
    const proposal = {
      proposalId: randomUUID(), type: mode === "create" ? "import_create" : "import_replace",
      taskFingerprint: binding.taskFingerprint, projectId: binding.projectId, sessionId: binding.sessionId,
      documentId, baseRevision: expectedRevision, baseDocument: currentRecord?.doc || null,
      previewDocument: structuredClone(document), operations: null,
      previewDiff: buildChangeSet(base, document, diffDoc(base, document)), diagnostics,
      rationale: "ACM-MD import preview", createdAtMs: this.now(), expiresAtMs: this.now() + PROPOSAL_TTL_MS, state: "pending",
    };
    this.proposals.set(proposal.proposalId, proposal);
    return publicProposal(proposal);
  }

  require(binding, proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new McpControlPlaneError("proposal_expired", "The proposal is unavailable or expired.");
    if (proposal.taskFingerprint !== binding.taskFingerprint || proposal.projectId !== binding.projectId || proposal.sessionId !== binding.sessionId) {
      throw new McpControlPlaneError("proposal_binding_mismatch", "The proposal belongs to a different task, project, or session.");
    }
    if (proposal.expiresAtMs <= this.now() || proposal.state !== "pending") throw new McpControlPlaneError("proposal_expired", "The proposal is no longer pending.");
    return proposal;
  }

  list(binding, documentId = null) {
    return [...this.proposals.values()].filter((proposal) => proposal.taskFingerprint === binding.taskFingerprint
      && proposal.projectId === binding.projectId && proposal.sessionId === binding.sessionId
      && proposal.state === "pending" && proposal.expiresAtMs > this.now()
      && (!documentId || proposal.documentId === documentId)).map(publicProposal);
  }

  markCommitted(proposal) { proposal.state = "committed"; return publicProposal(proposal); }
}

export { publicProposal as toPublicProposal };
