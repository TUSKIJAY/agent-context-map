import { describe, expect, test } from "vitest";
import { WidgetLifecycleService } from "../../mcp/src/widget/lifecycle-service.js";

const binding = (task = "task-a", root = "root-a") => ({
  taskFingerprint: task, rootFingerprint: root, projectId: `project-${root}`, sessionId: `session-${task}`,
});
const snapshot = { documents: [{ doc_id: "acm_test_001" }] };

function errorCode(action) {
  try { action(); } catch (error) { return error.code; }
  return null;
}

describe("Phase 5 Widget rebind and supersede", () => {
  test("supersedes a reloaded instance and blocks stale ready, commit, and send", () => {
    const service = new WidgetLifecycleService();
    const opened = service.open(binding(), snapshot);
    const openApp = service.appOpenMetadata(binding(), opened.openAttemptId);
    const first = service.bootstrap(binding(), { openAttemptId: opened.openAttemptId, clientMountId: "mount_a", ...openApp });
    const firstApp = service.appMetadata(binding(), { openAttemptId: opened.openAttemptId, widgetInstanceId: first.widgetInstanceId });
    const second = service.bootstrap(binding(), { openAttemptId: opened.openAttemptId, clientMountId: "mount_b", ...openApp });
    const stale = { openAttemptId: opened.openAttemptId, widgetInstanceId: first.widgetInstanceId, ...firstApp };
    expect(errorCode(() => service.ready(binding(), { ...stale, proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: true, documentId: "acm_test_001" } }))).toBe("stale_widget_instance");
    expect(errorCode(() => service.requireReadyInstance(binding(), stale))).toBe("stale_widget_instance");
    expect(errorCode(() => service.requireReadyInstance(binding(), { openAttemptId: opened.openAttemptId, widgetInstanceId: second.widgetInstanceId, appSessionNonce: "forged" }))).toBe("app_session_mismatch");
  });

  test("keeps attempts task/project scoped and supersedes an older open attempt", () => {
    const service = new WidgetLifecycleService();
    const first = service.open(binding(), snapshot);
    expect(errorCode(() => service.awaitReady(binding("task-b"), { openAttemptId: first.openAttemptId }))).toBe("open_attempt_scope_mismatch");
    service.open(binding(), snapshot);
    expect(errorCode(() => service.awaitReady(binding(), { openAttemptId: first.openAttemptId }))).toBe("open_attempt_superseded");
  });
});
