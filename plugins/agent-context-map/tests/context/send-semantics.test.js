import { afterEach, describe, expect, test } from "vitest";
import { toAcmMd } from "../../../../packages/acm-core/src/index.js";
import { contextDocument } from "../helpers/context-document.js";
import { createPhase6Harness, openReady } from "../helpers/phase6.js";

const fixtures = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((fixture) => fixture.close())); });

describe("Phase 6 click-gated send semantics", () => {
  test("previews without sending, rebuilds digest, and consumes a one-time gesture", async () => {
    const fixture = await createPhase6Harness({ text: toAcmMd(contextDocument), documentId: contextDocument.doc_id }); fixtures.push(fixture);
    const app = await openReady(fixture);
    const preview = await fixture.harness.callTool("agent_context_map_widget_api", {
      ...app, action: "preview_send", documentId: fixture.documentId, expectedRevision: app.revision,
      mode: "execution_prompt", selectedNodeIds: ["task_001"], includeContains: false, userNote: "",
    }, fixture.meta);
    expect(preview.result.structuredContent.data).toMatchObject({ mode: "execution_prompt", selectedNodeIds: ["task_001"] });
    expect(preview.result.structuredContent.data.message).toContain("仅执行预览中列出的 Task，不自动沿图扩展");

    const unclicked = await fixture.harness.callTool("send_acm_context", {
      ...app, mode: "execution_prompt", documentId: fixture.documentId, expectedRevision: app.revision,
      selectedNodeIds: ["task_001"], previewDigest: preview.result.structuredContent.data.previewDigest, userGestureNonce: "not_a_click",
    }, fixture.meta);
    expect(unclicked.result.structuredContent.error.code).toBe("send_not_user_initiated");

    const wrong = await fixture.harness.callTool("agent_context_map_widget_api", {
      ...app, action: "authorize_send", documentId: fixture.documentId, expectedRevision: app.revision,
      mode: "execution_prompt", selectedNodeIds: ["task_001"], previewDigest: "0".repeat(64),
    }, fixture.meta);
    expect(wrong.result.structuredContent.error.code).toBe("payload_digest_mismatch");

    const authorized = await fixture.harness.callTool("agent_context_map_widget_api", {
      ...app, action: "authorize_send", documentId: fixture.documentId, expectedRevision: app.revision,
      mode: "execution_prompt", selectedNodeIds: ["task_001"], previewDigest: preview.result.structuredContent.data.previewDigest,
    }, fixture.meta);
    const sent = await fixture.harness.callTool("send_acm_context", {
      ...app, mode: "execution_prompt", documentId: fixture.documentId, expectedRevision: app.revision,
      selectedNodeIds: ["task_001"], previewDigest: preview.result.structuredContent.data.previewDigest,
      userGestureNonce: authorized.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    expect(sent.result.structuredContent.data).toMatchObject({ authorized: true, selectedNodeIds: ["task_001"] });
    const replay = await fixture.harness.callTool("send_acm_context", {
      ...app, mode: "execution_prompt", documentId: fixture.documentId, expectedRevision: app.revision,
      selectedNodeIds: ["task_001"], previewDigest: preview.result.structuredContent.data.previewDigest,
      userGestureNonce: authorized.result.structuredContent.data.userGestureNonce,
    }, fixture.meta);
    expect(replay.result.structuredContent.error.code).toBe("send_not_user_initiated");
  });
});
