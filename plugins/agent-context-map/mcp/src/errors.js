export class McpControlPlaneError extends Error {
  constructor(code, message, { retryable = false, details = null } = {}) {
    super(message);
    this.name = "McpControlPlaneError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function asControlPlaneError(error) {
  if (error instanceof McpControlPlaneError) return error;
  if (error && typeof error.code === "string" && /^[a-z][a-z0-9_]{1,63}$/.test(error.code)) {
    const safeDetails = error.details && typeof error.details === "object" ? Object.fromEntries(
      Object.entries(error.details).filter(([key]) => [
        "documentId", "expectedRevision", "currentRevision", "conflictClass", "affectedIds",
        "operationIds", "proposalId", "expiresAt", "indexUpdateStatus",
      ].includes(key)),
    ) : null;
    return new McpControlPlaneError(error.code, error.message || "The request could not be completed.", { details: safeDetails });
  }
  return new McpControlPlaneError("internal_error", "The MCP control plane could not complete the request.", { retryable: true });
}
