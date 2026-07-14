import { describe, expect, test, vi } from "vitest";
import { createWidgetEditorPlatform } from "../../widget/src/platform/widget-platform.js";

function snapshot() {
  return {
    schemaVersion: "agent-context-map-widget-snapshot/v1",
    persistence: "ephemeral_working_copy",
    projectId: "project_test",
    diagnostics: { invalid: [], recovery: [], indexStatus: "read_only_scan" },
    documents: [{
      doc_id: "acm_test_001", title: "Test", domain_profile: "generic", dirty: false,
      body: { schema_version: "acm-md/0.1", doc_id: "acm_test_001", meta: { title: "Test" }, nodes: [], edges: [] },
      base_snapshot: { schema_version: "acm-md/0.1", doc_id: "acm_test_001", meta: { title: "Test" }, nodes: [], edges: [] },
    }],
  };
}

describe("Phase 5 Widget editor platform", () => {
  test("hydrates the current project into an ephemeral working copy without mutating the snapshot", async () => {
    const input = snapshot();
    const original = structuredClone(input);
    const ready = vi.fn();
    const hostWindow = { innerWidth: 1000, innerHeight: 700, confirm: vi.fn(() => false), alert: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const platform = createWidgetEditorPlatform({ snapshot: input, onCanvasFirstFrame: ready, hostWindow });
    expect(platform.store.persistenceMode).toBe("project");
    expect(platform.store.workingCopyMode).toBe("ephemeral");
    expect(await platform.store.getAppState("last_opened_doc_id")).toBe("acm_test_001");
    await platform.store.saveBody("acm_test_001", { body: { ...input.documents[0].body, nodes: [{ id: "goal_001" }] }, dirty: true });
    expect((await platform.store.getDocument("acm_test_001")).working_copy_only).toBe(true);
    expect(input).toEqual(original);
    platform.host.reportReady({ documentId: "acm_test_001" });
    expect(ready).toHaveBeenCalledWith({ documentId: "acm_test_001" });
    expect(platform.capabilities).toMatchObject({ projectTruth: false, ephemeralWorkingCopy: true });
  });
});
