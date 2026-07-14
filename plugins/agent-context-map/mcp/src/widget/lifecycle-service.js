import { randomUUID } from "node:crypto";
import { McpControlPlaneError } from "../errors.js";

const READY_STATES = ["initialized", "react_mounted", "project_hydrated", "canvas_first_frame", "ready"];

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new McpControlPlaneError("invalid_arguments", `${label} must be a normalized identifier.`);
  }
  return value;
}

export class WidgetLifecycleService {
  constructor() {
    this.attempts = new Map();
    this.activeAttemptByTask = new Map();
  }

  open(binding, snapshot) {
    const previousId = this.activeAttemptByTask.get(binding.taskFingerprint);
    if (previousId) this.supersedeAttempt(this.attempts.get(previousId));
    const attempt = {
      openAttemptId: randomUUID(),
      taskFingerprint: binding.taskFingerprint,
      rootFingerprint: binding.rootFingerprint,
      projectId: binding.projectId,
      sessionId: binding.sessionId,
      state: "tool_succeeded",
      activeInstanceId: null,
      instances: new Map(),
      snapshot,
    };
    this.attempts.set(attempt.openAttemptId, attempt);
    this.activeAttemptByTask.set(binding.taskFingerprint, attempt.openAttemptId);
    return this.snapshot(attempt);
  }

  supersedeAttempt(attempt) {
    if (!attempt || attempt.state === "superseded") return;
    attempt.state = "superseded";
    for (const instance of attempt.instances.values()) instance.state = "superseded";
  }

  requireAttempt(binding, openAttemptId) {
    const attempt = this.attempts.get(assertIdentifier(openAttemptId, "openAttemptId"));
    if (!attempt) throw new McpControlPlaneError("open_attempt_not_found", "The Widget open attempt is unavailable; open the Widget again.");
    if (attempt.taskFingerprint !== binding.taskFingerprint || attempt.rootFingerprint !== binding.rootFingerprint || attempt.projectId !== binding.projectId) {
      throw new McpControlPlaneError("open_attempt_scope_mismatch", "The open attempt belongs to a different task or project.");
    }
    if (attempt.state === "superseded") throw new McpControlPlaneError("open_attempt_superseded", "The Widget open attempt was superseded.");
    return attempt;
  }

  bootstrap(binding, { openAttemptId, clientMountId }) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    assertIdentifier(clientMountId, "clientMountId");
    if (attempt.activeInstanceId) {
      const previous = attempt.instances.get(attempt.activeInstanceId);
      if (previous) previous.state = "superseded";
    }
    const instance = {
      widgetInstanceId: randomUUID(),
      clientMountId,
      state: "initialized",
      transitions: ["initialized"],
    };
    attempt.instances.set(instance.widgetInstanceId, instance);
    attempt.activeInstanceId = instance.widgetInstanceId;
    attempt.state = "active";
    return this.snapshot(attempt);
  }

  requireActiveInstance(binding, { openAttemptId, widgetInstanceId }) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    const instance = attempt.instances.get(assertIdentifier(widgetInstanceId, "widgetInstanceId"));
    if (!instance) throw new McpControlPlaneError("widget_instance_not_found", "The Widget instance is unavailable.");
    if (attempt.activeInstanceId !== instance.widgetInstanceId || instance.state === "superseded") {
      throw new McpControlPlaneError("widget_instance_superseded", "The Widget instance is no longer active.");
    }
    return { attempt, instance };
  }

  ready(binding, { openAttemptId, widgetInstanceId, proof }) {
    const { attempt, instance } = this.requireActiveInstance(binding, { openAttemptId, widgetInstanceId });
    if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
      throw new McpControlPlaneError("invalid_ready_proof", "A complete Widget ready proof is required.");
    }
    const expectedKeys = ["canvasFirstFrame", "documentId", "projectHydrated", "reactMounted"];
    if (Object.keys(proof).sort().join("|") !== expectedKeys.sort().join("|")
      || proof.reactMounted !== true || proof.projectHydrated !== true || proof.canvasFirstFrame !== true) {
      throw new McpControlPlaneError("invalid_ready_proof", "Ready requires React mount, project hydration, and a rendered canvas frame.");
    }
    assertIdentifier(proof.documentId, "documentId");
    if (!attempt.snapshot.documents.some((record) => record.doc_id === proof.documentId)) {
      throw new McpControlPlaneError("ready_document_mismatch", "The rendered document is not part of the bound project snapshot.");
    }
    instance.transitions = [...READY_STATES];
    instance.state = "ready";
    instance.documentId = proof.documentId;
    return this.snapshot(attempt);
  }

  awaitReady(binding, { openAttemptId }) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    return this.snapshot(attempt);
  }

  gateReservedAction(binding, args, action) {
    this.requireActiveInstance(binding, args);
    throw new McpControlPlaneError("capability_not_enabled", `${action} is reserved for Phase 6 and cannot run from the Phase 5 Widget.`);
  }

  snapshot(attempt) {
    const instance = attempt.activeInstanceId ? attempt.instances.get(attempt.activeInstanceId) : null;
    return {
      openAttemptId: attempt.openAttemptId,
      projectId: attempt.projectId,
      sessionId: attempt.sessionId,
      attemptState: attempt.state,
      widgetInstanceId: instance?.widgetInstanceId || null,
      widgetState: instance?.state || null,
      transitions: instance ? [...instance.transitions] : [],
      documentId: instance?.documentId || null,
      ready: instance?.state === "ready",
    };
  }
}
