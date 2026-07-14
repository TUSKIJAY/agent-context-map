import fs from "node:fs/promises";
import { afterEach, describe, expect, test } from "vitest";
import { createPhase6Harness, openReady } from "../helpers/phase6.js";

const fixtures = [];
afterEach(async () => { await Promise.all(fixtures.splice(0).map((fixture) => fixture.close())); });

describe("Phase 6 model-visible MCP tools", () => {
  test("gets bounded context, validates formal documents, and exports canonical text", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const { revision } = await openReady(fixture);
    const context = await fixture.harness.callTool("get_acm_graph_context", {
      documentId: fixture.documentId, selector: { type: "nodeIds", nodeIds: ["goal_001"] }, relationPolicy: "selected", expectedRevision: revision,
    }, fixture.meta);
    expect(context.result.structuredContent.data).toMatchObject({ documentRevision: revision, truncated: false, nodes: [{ id: "goal_001" }], edges: [] });
    const contextId = context.result.structuredContent.data.contextId;

    const validated = await fixture.harness.callTool("validate_acm_graph", { documentId: fixture.documentId, expectedRevision: revision }, fixture.meta);
    expect(validated.result.structuredContent.data).toMatchObject({ valid: true, normalizedPreviewRevision: revision });

    const exported = await fixture.harness.callTool("export_acm_md", { documentId: fixture.documentId, expectedRevision: revision, includeLayout: false }, fixture.meta);
    expect(exported.result.structuredContent.data.acmMdText).toContain("doc_id: acm_baseline_001");
    expect(exported.result.structuredContent.data.acmMdText).not.toContain("layout:");
    expect(contextId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("creates import previews from text or contained project paths without writing", async () => {
    const fixture = await createPhase6Harness(); fixtures.push(fixture);
    const before = await fs.readFile(fixture.filePath, "utf8");
    const importedText = before.replaceAll("acm_baseline_001", "acm_import_001");
    const preview = await fixture.harness.callTool("import_acm_md", { acmMdText: importedText, targetDocumentId: "acm_import_001", mode: "create" }, fixture.meta);
    expect(preview.result.structuredContent.data).toMatchObject({ requiresHumanAcceptance: true, parsedSummary: { nodeCount: 2, edgeCount: 1 } });
    await expect(fs.access(`${fixture.root}/.acm/documents/acm_import_001.acm.md`)).rejects.toMatchObject({ code: "ENOENT" });

    const contained = await fixture.harness.callTool("import_acm_md", {
      projectRelativePath: ".acm/documents/acm_baseline_001.acm.md", targetDocumentId: fixture.documentId,
      expectedRevision: (await openReady(fixture)).revision, mode: "replace-preview",
    }, fixture.meta);
    expect(contained.result.structuredContent.ok).toBe(true);
    expect(await fs.readFile(fixture.filePath, "utf8")).toBe(before);

    const escaped = await fixture.harness.callTool("import_acm_md", { projectRelativePath: "../secret.md", targetDocumentId: fixture.documentId, mode: "replace-preview" }, fixture.meta);
    expect(escaped.result.structuredContent.error.code).toBe("unsafe_project_path");
  });
});
