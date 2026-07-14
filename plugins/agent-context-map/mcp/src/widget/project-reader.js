import os from "node:os";
import path from "node:path";
import { ProjectStore } from "../../../../../packages/project-store/src/index.js";

export async function readWidgetProjectSnapshot(binding) {
  const store = new ProjectStore({
    root: binding.root,
    stateRoot: path.join(os.tmpdir(), "agent-context-map-mcp-read-state"),
  });
  const scan = await store.scanDocuments();
  return {
    schemaVersion: "agent-context-map-widget-snapshot/v1",
    persistence: "ephemeral_working_copy",
    projectId: binding.projectId,
    documents: scan.documents.map((record) => ({
      doc_id: record.documentId,
      title: record.doc.meta?.title || record.documentId,
      domain_profile: "generic",
      body: record.doc,
      base_snapshot: record.doc,
      source_path: record.relativePath,
      dirty: false,
      document_revision: record.documentRevision,
      modified_at: record.modifiedAt,
    })),
    diagnostics: {
      invalid: scan.invalid,
      recovery: [],
      indexStatus: "read_only_scan",
    },
  };
}
