import os from "node:os";
import path from "node:path";
import { ProjectStore } from "../../../../../packages/project-store/src/index.js";

export class BoundProjectService {
  constructor({ stateRoot = path.join(os.tmpdir(), "agent-context-map-mcp-state") } = {}) {
    this.stateRoot = stateRoot;
    this.stores = new Map();
  }

  store(binding) {
    const key = binding.rootFingerprint;
    if (!this.stores.has(key)) {
      this.stores.set(key, new ProjectStore({ root: binding.root, stateRoot: path.join(this.stateRoot, key) }));
    }
    return this.stores.get(key);
  }

  async read(binding, documentId) {
    const record = await this.store(binding).readDocument(documentId);
    if (!record) {
      const error = new Error("The requested ACM-MD document does not exist.");
      error.code = "document_not_found";
      throw error;
    }
    return record;
  }
}
