import { afterEach, describe, expect, it } from "vitest";
import { ProjectStore, lockFileNameForKey } from "../../packages/project-store/src/index.js";
import { makeDoc, tempWorkspace } from "./helpers.js";

const cleanups = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()(); });

describe("project store concurrency", () => {
  it("uses the cross-runtime SHA-256 OS-lock filename contract", () => {
    expect(lockFileNameForKey(`d:\\code\\repo\u0000doc`)).toBe("1f3bf62a6923a1b4a974ac39720504b620b0f22e983aae308a267cdbaa48335d.lock");
  });
  it("commits exactly one concurrent writer and rejects every stale revision without mutation", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await store.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "create-concurrency" });
    const base = await store.readDocument("acm_test_001");
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => store.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc("acm_test_001", `Writer ${index}`, index + 100),
      expectedRevision: base.documentRevision,
      baseDocument: base.doc,
      clientMutationId: `writer-${index}`,
    })));
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(19);
    expect(rejected.every((result) => result.reason?.code === "revision_conflict")).toBe(true);
    const final = await store.readDocument("acm_test_001");
    expect(final.documentRevision).toBe(fulfilled[0].value.newRevision);
  });

  it("classifies layout-only and mixed conflicts without auto-rebase", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await store.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "create-classification" });
    const base = await store.readDocument("acm_test_001");
    await store.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc("acm_test_001", "Project store test", 99),
      expectedRevision: base.documentRevision,
      clientMutationId: "remote-layout",
    });
    await expect(store.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc("acm_test_001", "Local title", 10),
      baseDocument: base.doc,
      expectedRevision: base.documentRevision,
      clientMutationId: "stale-local",
    })).rejects.toMatchObject({ code: "revision_conflict", details: { conflictClass: "layout_only", affectedIds: ["goal_001"] } });
  });
});
