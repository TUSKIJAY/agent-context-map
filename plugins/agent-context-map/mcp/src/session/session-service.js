import { randomUUID } from "node:crypto";
import { McpControlPlaneError } from "../errors.js";
import { collectTrustedHostBinding } from "../security/host-binding.js";

export class SessionService {
  constructor() {
    this.sessionsByTask = new Map();
  }

  async bind({ meta, requestClient }) {
    const trusted = await collectTrustedHostBinding({ meta, requestClient });
    const existing = this.sessionsByTask.get(trusted.taskFingerprint);
    if (existing && existing.rootFingerprint !== trusted.rootFingerprint) {
      throw new McpControlPlaneError("project_binding_mismatch", "The current task cannot be rebound to a different project root.");
    }
    if (existing) return existing;
    const session = {
      sessionId: randomUUID(),
      projectId: `project_${trusted.rootFingerprint.slice(0, 24)}`,
      taskFingerprint: trusted.taskFingerprint,
      rootFingerprint: trusted.rootFingerprint,
      root: trusted.root,
    };
    this.sessionsByTask.set(trusted.taskFingerprint, session);
    return session;
  }
}
