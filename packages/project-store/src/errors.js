export class ProjectStoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProjectStoreError";
    this.code = code;
    this.details = details;
  }
}

export function asProjectStoreError(error, fallbackCode = "project_store_failed") {
  if (error instanceof ProjectStoreError) return error;
  return new ProjectStoreError(fallbackCode, error?.message || String(error), { cause: error });
}
