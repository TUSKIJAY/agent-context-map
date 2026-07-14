import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import { parseAcmMd } from "../../../../packages/acm-core/src/index.js";
import { createPhase6Harness, openReady, suggestedNodeOperation } from "../helpers/phase6.js";

const fixtures = [];
const hash = (value) => createHash("sha256").update(value).digest("hex");
afterEach(async () => { await Promise.all(fixtures.splice(0).map((fixture) => fixture.close())); });

describe("Phase 6 pending proposal boundary", () => {
  test("model write leaves project bytes unchanged until a current Widget click commits", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const before = await fs.readFile(fixture.filePath);
    const proposed = await fixture.harness.callTool("write_acm_graph", {
      documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId: "mutation_001",
      operations: [suggestedNodeOperation()], rationale: "Add a pending feature for human review.",
    }, fixture.meta);
    expect(proposed.result.structuredContent.data).toMatchObject({ requiresHumanAcceptance: true, baseRevision: app.revision, normalizedOperations: [{ op: "addNode" }] });
    expect(hash(await fs.readFile(fixture.filePath))).toBe(hash(before));

    const proposalId = proposed.result.structuredContent.data.proposalId;
    const prepared = await fixture.harness.callTool("agent_context_map_widget_api", { ...app, action: "prepare_commit", proposalId, expectedRevision: app.revision }, fixture.meta);
    expect(hash(await fs.readFile(fixture.filePath))).toBe(hash(before));
    const withoutGesture = await fixture.harness.callTool("commit_acm_proposal", {
      ...app, proposalId, expectedRevision: app.revision, previewDigest: prepared.result.structuredContent.data.previewDigest, userGestureNonce: "forged_nonce",
    }, fixture.meta);
    expect(withoutGesture.result.structuredContent.error.code).toBe("commit_not_user_initiated");
    expect(hash(await fs.readFile(fixture.filePath))).toBe(hash(before));

    const committed = await fixture.harness.callTool("commit_acm_proposal", {
      ...app, proposalId, expectedRevision: app.revision,
      previewDigest: prepared.result.structuredContent.data.previewDigest,
      userGestureNonce: prepared.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    expect(committed.result.structuredContent.ok).toBe(true);
    const parsed = parseAcmMd(await fs.readFile(fixture.filePath, "utf8"), { mode: "strict" });
    expect(parsed.doc.nodes.map((node) => node.id)).toContain("feature_002");
  });

  test("rejects legacy names, patchMeta, confirmed escalation, and oversized operations", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const call = (operations, id) => fixture.harness.callTool("write_acm_graph", { documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId: id, operations, rationale: "Human review required." }, fixture.meta);
    expect((await call([{ id: "legacy_1", op: "add_node", node: suggestedNodeOperation().node }], "legacy_mutation")).result.structuredContent.error.code).toBe("legacy_operation_rejected");
    expect((await call([{ ...suggestedNodeOperation("003"), patchMeta: { title: "no" } }], "meta_mutation")).result.structuredContent.error.code).toBe("invalid_operation");
    expect((await call([{ ...suggestedNodeOperation("004"), node: { ...suggestedNodeOperation("004").node, status: "confirmed" } }], "confirmed_mutation")).result.structuredContent.error.code).toBe("confirmed_escalation_rejected");
    expect((await call(Array.from({ length: 101 }, (_, index) => suggestedNodeOperation(String(index + 10))), "oversize_mutation")).result.structuredContent.error.code).toBe("invalid_operation");
  });

  test("manual working-copy commit also requires a preview and one-time user gesture", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const document = parseAcmMd(await fs.readFile(fixture.filePath, "utf8"), { mode: "strict" }).doc;
    document.meta.title = "Human reviewed title";
    const before = await fs.readFile(fixture.filePath);
    const clientMutationId = "manual_mutation_001";
    const prepared = await fixture.harness.callTool("agent_context_map_widget_api", {
      ...app, action: "prepare_manual_commit", documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId, document,
    }, fixture.meta);
    expect(hash(await fs.readFile(fixture.filePath))).toBe(hash(before));
    const committed = await fixture.harness.callTool("commit_manual_edit", {
      ...app, documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId, document,
      previewDigest: prepared.result.structuredContent.data.previewDigest, userGestureNonce: prepared.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    expect(committed.result.structuredContent.ok).toBe(true);
    expect(parseAcmMd(await fs.readFile(fixture.filePath, "utf8"), { mode: "strict" }).doc.meta.title).toBe("Human reviewed title");
  });
});
