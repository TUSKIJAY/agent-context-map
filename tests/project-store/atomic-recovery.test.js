import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectStore, SimulatedCrash, lockFileNameForKey } from "../../packages/project-store/src/index.js";
import { makeDoc, tempWorkspace } from "./helpers.js";

const cleanups = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()(); });

describe("safe replacement and recovery", () => {
  it("reports an expired dead-process OS lock without silently clearing it during inspection", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await store.initialize();
    const key = store.lockKey("acm_test_001");
    const directory = path.join(workspace.stateRoot, "project-locks");
    await fs.mkdir(directory, { recursive: true });
    const lockPath = path.join(directory, lockFileNameForKey(key));
    await fs.writeFile(lockPath, JSON.stringify({ key, pid: 999999, expiresAtMs: 0 }), "utf8");
    expect(await store.inspectRecovery()).toContainEqual(expect.objectContaining({
      code: "recovery_required",
      documentId: "acm_test_001",
      autoActionTaken: false,
    }));
    expect(await fs.readFile(lockPath, "utf8")).toContain("999999");
  });
  it("leaves the original valid after a crash before replace and reports recovery_required", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const baseStore = new ProjectStore(workspace);
    await baseStore.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "create-crash" });
    const before = await baseStore.readDocument("acm_test_001");
    const crashing = new ProjectStore({ ...workspace, faultInjector: (stage) => { if (stage === "after_temp_sync") throw new SimulatedCrash(stage); } });
    await expect(crashing.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc("acm_test_001", "New but not committed"),
      expectedRevision: before.documentRevision,
      clientMutationId: "crash-before-replace",
    })).rejects.toBeInstanceOf(SimulatedCrash);
    const after = await baseStore.readDocument("acm_test_001");
    expect(after.documentRevision).toBe(before.documentRevision);
    const recovery = await baseStore.inspectRecovery();
    expect(recovery).toHaveLength(1);
    expect(recovery[0]).toMatchObject({ code: "recovery_required", tempValid: true, targetValid: true, autoActionTaken: false });
  });

  it("leaves the complete new document after a crash immediately after replace", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const baseStore = new ProjectStore(workspace);
    await baseStore.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "create-post-replace" });
    const before = await baseStore.readDocument("acm_test_001");
    const crashing = new ProjectStore({ ...workspace, faultInjector: (stage) => { if (stage === "after_replace") throw new SimulatedCrash(stage); } });
    await expect(crashing.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc("acm_test_001", "Committed before crash", 77),
      expectedRevision: before.documentRevision,
      clientMutationId: "crash-after-replace",
    })).rejects.toBeInstanceOf(SimulatedCrash);
    const after = await baseStore.readDocument("acm_test_001");
    expect(after.doc.meta.title).toBe("Committed before crash");
    expect(after.rawText.length).toBeGreaterThan(20);
  });

  it("reports document_committed_index_stale without rolling the document back", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore({ ...workspace, indexFaultInjector: () => { throw new Error("index unavailable"); } });
    const result = await store.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "stale-index" });
    expect(result.status).toBe("document_committed_index_stale");
    expect((await store.readDocument("acm_test_001")).doc.doc_id).toBe("acm_test_001");
    const cleanStore = new ProjectStore(workspace);
    expect((await cleanStore.rebuildIndex()).status).toBe("index_rebuilt");
  });

  it("performs repeated same-volume replacements without empty or partial output", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await store.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "repeat-create" });
    for (let index = 0; index < 25; index += 1) {
      const current = await store.readDocument("acm_test_001");
      await store.writeDocument({
        documentId: "acm_test_001",
        document: makeDoc("acm_test_001", `Replacement ${index}`, index),
        expectedRevision: current.documentRevision,
        clientMutationId: `replace-${index}`,
      });
      const bytes = await fs.readFile(path.join(workspace.root, ".acm", "documents", "acm_test_001.acm.md"));
      expect(bytes.length).toBeGreaterThan(20);
      expect((await store.readDocument("acm_test_001")).doc.meta.title).toBe(`Replacement ${index}`);
    }
  });
});
