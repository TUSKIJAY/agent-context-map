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
      bootstrapNonce: randomUUID(),
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

  appOpenMetadata(binding, openAttemptId) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    return { bootstrapNonce: attempt.bootstrapNonce };
  }

  bootstrap(binding, { openAttemptId, clientMountId, bootstrapNonce }) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    if (typeof bootstrapNonce !== "string" || bootstrapNonce !== attempt.bootstrapNonce) {
      throw new McpControlPlaneError("app_session_mismatch", "The app-only open proof is missing or invalid.");
    }
    assertIdentifier(clientMountId, "clientMountId");
    if (attempt.activeInstanceId) {
      const previous = attempt.instances.get(attempt.activeInstanceId);
      if (previous) previous.state = "superseded";
    }
    const instance = {
      widgetInstanceId: randomUUID(),
      appSessionNonce: randomUUID(),
      clientMountId,
      state: "initialized",
      transitions: ["initialized"],
      gestures: new Map(),
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
      throw new McpControlPlaneError("stale_widget_instance", "The Widget instance is no longer active.");
    }
    return { attempt, instance };
  }

  requireAppInstance(binding, args) {
    const active = this.requireActiveInstance(binding, args);
    if (typeof args.appSessionNonce !== "string" || args.appSessionNonce !== active.instance.appSessionNonce) {
      throw new McpControlPlaneError("app_session_mismatch", "The app-only Widget session proof is missing or invalid.");
    }
    return active;
  }

  appMetadata(binding, args) {
    const { instance } = this.requireActiveInstance(binding, args);
    return { appSessionNonce: instance.appSessionNonce };
  }

  ready(binding, { openAttemptId, widgetInstanceId, appSessionNonce, proof }) {
    const { attempt, instance } = this.requireAppInstance(binding, { openAttemptId, widgetInstanceId, appSessionNonce });
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
    instance.documentRevision = attempt.snapshot.documents.find((record) => record.doc_id === proof.documentId)?.document_revision || null;
    return this.snapshot(attempt);
  }

  awaitReady(binding, { openAttemptId }) {
    const attempt = this.requireAttempt(binding, openAttemptId);
    return this.snapshot(attempt);
  }

  requireReadyInstance(binding, args) {
    const active = this.requireAppInstance(binding, args);
    if (active.instance.state !== "ready") throw new McpControlPlaneError("widget_not_ready", "The active Widget has not completed its ready proof.");
    return active;
  }

  issueUserGesture(binding, args, { purpose, digest, ttlMs = 30_000 }) {
    const { instance } = this.requireReadyInstance(binding, args);
    if (typeof purpose !== "string" || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) {
      throw new McpControlPlaneError("invalid_arguments", "A normalized gesture purpose and SHA-256 preview digest are required.");
    }
    const userGestureNonce = randomUUID();
    instance.gestures.set(userGestureNonce, { purpose, digest, expiresAtMs: Date.now() + ttlMs, used: false });
    return { userGestureNonce, expiresAt: new Date(Date.now() + ttlMs).toISOString() };
  }

  consumeUserGesture(binding, args, { purpose, digest }) {
    const { instance } = this.requireReadyInstance(binding, args);
    const gesture = instance.gestures.get(args.userGestureNonce);
    if (!gesture || gesture.used || gesture.expiresAtMs <= Date.now() || gesture.purpose !== purpose || gesture.digest !== digest) {
      throw new McpControlPlaneError(purpose === "send" ? "send_not_user_initiated" : "commit_not_user_initiated", "A current one-time user gesture is required.");
    }
    gesture.used = true;
    return gesture;
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
      documentRevision: instance?.documentRevision || null,
      ready: instance?.state === "ready",
    };
  }
}
