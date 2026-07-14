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
    const first = service.bootstrap(binding(), { openAttemptId: opened.openAttemptId, clientMountId: "mount_a" });
    const second = service.bootstrap(binding(), { openAttemptId: opened.openAttemptId, clientMountId: "mount_b" });
    const stale = { openAttemptId: opened.openAttemptId, widgetInstanceId: first.widgetInstanceId };
    expect(errorCode(() => service.ready(binding(), { ...stale, proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: true, documentId: "acm_test_001" } }))).toBe("widget_instance_superseded");
    expect(errorCode(() => service.gateReservedAction(binding(), stale, "commit"))).toBe("widget_instance_superseded");
    expect(errorCode(() => service.gateReservedAction(binding(), stale, "send"))).toBe("widget_instance_superseded");
    expect(errorCode(() => service.gateReservedAction(binding(), { openAttemptId: opened.openAttemptId, widgetInstanceId: second.widgetInstanceId }, "commit"))).toBe("capability_not_enabled");
  });

  test("keeps attempts task/project scoped and supersedes an older open attempt", () => {
    const service = new WidgetLifecycleService();
    const first = service.open(binding(), snapshot);
    expect(errorCode(() => service.awaitReady(binding("task-b"), { openAttemptId: first.openAttemptId }))).toBe("open_attempt_scope_mismatch");
    service.open(binding(), snapshot);
    expect(errorCode(() => service.awaitReady(binding(), { openAttemptId: first.openAttemptId }))).toBe("open_attempt_superseded");
  });
});
