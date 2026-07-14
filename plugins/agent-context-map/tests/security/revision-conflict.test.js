import fs from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import { parseAcmMd, toAcmMd } from "../../../../packages/acm-core/src/index.js";
import { createPhase6Harness, openReady, suggestedNodeOperation } from "../helpers/phase6.js";

const fixtures = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((fixture) => fixture.close())); });

describe("Phase 6 revision conflict", () => {
  test("revalidates expectedRevision under the document lock and never overwrites newer content", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const app = await openReady(fixture);
    const proposed = await fixture.harness.callTool("write_acm_graph", {
      documentId: fixture.documentId, expectedRevision: app.revision, clientMutationId: "stale_mutation",
      operations: [suggestedNodeOperation("010")], rationale: "Pending review.",
    }, fixture.meta);
    const proposalId = proposed.result.structuredContent.data.proposalId;
    const prepared = await fixture.harness.callTool("agent_context_map_widget_api", { ...app, action: "prepare_commit", proposalId, expectedRevision: app.revision }, fixture.meta);

    const current = parseAcmMd(await fs.readFile(fixture.filePath, "utf8"), { mode: "strict" }).doc;
    current.meta.title = "Concurrent writer won";
    await fs.writeFile(fixture.filePath, toAcmMd(current));
    const expectedBytes = await fs.readFile(fixture.filePath, "utf8");

    const committed = await fixture.harness.callTool("commit_acm_proposal", {
      ...app, proposalId, expectedRevision: app.revision,
      previewDigest: prepared.result.structuredContent.data.previewDigest,
      userGestureNonce: prepared.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    expect(committed.result.structuredContent.error).toMatchObject({ code: "revision_conflict", details: { expectedRevision: app.revision } });
    expect(await fs.readFile(fixture.filePath, "utf8")).toBe(expectedBytes);
  });
});
