import fs from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import { parseAcmMd } from "../../../../packages/acm-core/src/index.js";
import { createPhase6Harness, openReady, suggestedNodeOperation } from "../helpers/phase6.js";

const fixtures = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((fixture) => fixture.close())); });

describe("Phase 6 proposal concurrency", () => {
  test("commits at most one of two proposals sharing a revision", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const make = (suffix) => fixture.harness.callTool("write_acm_graph", {
      documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId: `concurrent_${suffix}`,
      operations: [suggestedNodeOperation(suffix)], rationale: "Concurrent pending review.",
    }, fixture.meta);
    const [left, right] = await Promise.all([make("020"), make("021")]);
    const prepare = (proposal) => fixture.harness.callTool("agent_context_map_widget_api", { ...app, action: "prepare_commit", proposalId: proposal.result.structuredContent.data.proposalId, expectedRevision: app.revision }, fixture.meta);
    const [leftPreview, rightPreview] = await Promise.all([prepare(left), prepare(right)]);
    const commit = (proposal, preview) => fixture.harness.callTool("commit_acm_proposal", {
      ...app, proposalId: proposal.result.structuredContent.data.proposalId, expectedRevision: app.revision,
      previewDigest: preview.result.structuredContent.data.previewDigest, userGestureNonce: preview.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    const results = await Promise.all([commit(left, leftPreview), commit(right, rightPreview)]);
    expect(results.filter((result) => result.result.structuredContent.ok)).toHaveLength(1);
    expect(results.filter((result) => result.result.structuredContent.error?.code === "revision_conflict")).toHaveLength(1);
    const parsed = parseAcmMd(await fs.readFile(fixture.filePath, "utf8"), { mode: "strict" });
    expect(parsed.errors).toEqual([]);
    expect(parsed.doc.nodes.filter((node) => ["feature_020", "feature_021"].includes(node.id))).toHaveLength(1);
  });

  test("uses clientMutationId idempotently and rejects payload reuse", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const input = { documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId: "same_mutation", operations: [suggestedNodeOperation("030")], rationale: "Idempotent proposal." };
    const first = await fixture.harness.callTool("write_acm_graph", input, fixture.meta);
    const second = await fixture.harness.callTool("write_acm_graph", input, fixture.meta);
    expect(second.result.structuredContent.data.proposalId).toBe(first.result.structuredContent.data.proposalId);
    const conflict = await fixture.harness.callTool("write_acm_graph", { ...input, operations: [suggestedNodeOperation("031")] }, fixture.meta);
    expect(conflict.result.structuredContent.error.code).toBe("idempotency_conflict");
  });
});
