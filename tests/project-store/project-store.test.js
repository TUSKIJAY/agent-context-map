import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectStore, defaultAgentStateRoot } from "../../packages/project-store/src/index.js";
import { copyFixtureProject, makeDoc, tempWorkspace } from "./helpers.js";

const cleanups = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()(); });

describe("project ACM-MD store", () => {
  it("uses the documented per-user state roots outside project business data", () => {
    expect(defaultAgentStateRoot({ platform: "win32", env: { LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local" } }))
      .toBe("C:\\Users\\tester\\AppData\\Local\\AgentContextMap");
    expect(defaultAgentStateRoot({ platform: "linux", env: { XDG_STATE_HOME: "/state" }, home: "/home/tester" }))
      .toBe("/state/agent-context-map");
  });
  it("scans documents as truth and rebuilds a stale or missing index", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    await copyFixtureProject(workspace.root);
    const store = new ProjectStore(workspace);
    const beforeBytes = await fs.readFile(path.join(workspace.root, ".acm", "documents", "acm_fixture_project.acm.md"));
    const result = await store.listDocuments();
    expect(result.documents.map((item) => item.documentId)).toEqual(["acm_fixture_project"]);
    expect(result.projectId).toBe("fixture-project-id");
    const index = JSON.parse(await fs.readFile(path.join(workspace.root, ".acm", "index.json"), "utf8"));
    expect(index.defaultDocumentId).toBe("acm_fixture_project");
    expect(index.documents.map((item) => item.id)).toEqual(["acm_fixture_project"]);
    expect(await fs.readFile(path.join(workspace.root, ".acm", "documents", "acm_fixture_project.acm.md"))).toEqual(beforeBytes);

    await fs.unlink(path.join(workspace.root, ".acm", "index.json"));
    const rebuilt = await store.listDocuments();
    expect(rebuilt.indexStatus).toBe("index_rebuilt");
    expect(rebuilt.documents).toHaveLength(1);
    expect(await fs.readFile(path.join(workspace.root, ".acm", "documents", "acm_fixture_project.acm.md"))).toEqual(beforeBytes);
  });

  it("creates, reads and replaces canonical ACM-MD with content revisions", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    const created = await store.writeDocument({
      documentId: "acm_test_001",
      document: makeDoc(),
      create: true,
      clientMutationId: "create-001",
    });
    expect(created.status).toBe("committed");
    expect(created.newRevision).toMatch(/^sha256:[0-9a-f]{64}$/);
    const first = await store.readDocument("acm_test_001");
    expect(first.documentRevision).toBe(created.newRevision);
    expect(first.rawText).toBe(first.canonicalText);

    const updatedDoc = makeDoc("acm_test_001", "Updated title", 44);
    const updated = await store.writeDocument({
      documentId: "acm_test_001",
      document: updatedDoc,
      expectedRevision: first.documentRevision,
      baseDocument: first.doc,
      clientMutationId: "update-001",
    });
    expect(updated.newRevision).not.toBe(first.documentRevision);
    expect((await store.readDocument("acm_test_001")).doc.meta.title).toBe("Updated title");
  });

  it("applies the canonical operation model and keeps idempotent mutations stable", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await store.writeDocument({ documentId: "acm_test_001", document: makeDoc(), create: true, clientMutationId: "create-ops" });
    const current = await store.readDocument("acm_test_001");
    const input = {
      documentId: "acm_test_001",
      expectedRevision: current.documentRevision,
      operations: [{ id: "op_001", op: "updateNodeFields", nodeId: "goal_001", fields: { title: "Changed by operation" } }],
      clientMutationId: "mutation-ops",
    };
    const first = await store.writeDocument(input);
    const repeated = await store.writeDocument(input);
    expect(repeated).toEqual(first);
    await expect(store.writeDocument({ ...input, operations: [{ ...input.operations[0], fields: { title: "Different" } }] }))
      .rejects.toMatchObject({ code: "idempotency_key_reused" });
    expect((await store.readDocument("acm_test_001")).doc.nodes[0].title).toBe("Changed by operation");
  });

  it("reports invalid project files and never lets the index overwrite them", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const documents = path.join(workspace.root, ".acm", "documents");
    await fs.mkdir(documents, { recursive: true });
    const invalidPath = path.join(documents, "broken.acm.md");
    await fs.writeFile(invalidPath, "not acm", "utf8");
    const store = new ProjectStore(workspace);
    const result = await store.listDocuments();
    expect(result.invalid).toHaveLength(1);
    expect(result.indexStatus).toBe("not_requested");
    expect(await fs.readFile(invalidPath, "utf8")).toBe("not acm");
  });

  it("rejects unsafe document IDs before resolving a path", async () => {
    const workspace = await tempWorkspace();
    cleanups.push(workspace.cleanup);
    const store = new ProjectStore(workspace);
    await expect(store.writeDocument({ documentId: "../escape", document: makeDoc("../escape"), create: true, clientMutationId: "escape" }))
      .rejects.toMatchObject({ code: "unsafe_document_id" });
  });
});
