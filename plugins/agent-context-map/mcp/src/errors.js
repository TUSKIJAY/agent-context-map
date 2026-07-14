export class McpControlPlaneError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = "McpControlPlaneError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function asControlPlaneError(error) {
  if (error instanceof McpControlPlaneError) return error;
  return new McpControlPlaneError("internal_error", "The MCP control plane could not complete the request.", { retryable: true });
}
