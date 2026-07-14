import { diffDoc, toExportDoc } from "../../acm-core/src/index.js";

const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function classifyRevisionConflict(baseDocument, currentDocument) {
  if (!baseDocument || !currentDocument) return { conflictClass: "content", affectedIds: [] };
  const base = toExportDoc(baseDocument);
  const current = toExportDoc(currentDocument);
  const baseLayout = base.layout || { nodes: {} };
  const currentLayout = current.layout || { nodes: {} };
  delete base.layout;
  delete current.layout;
  const contentChanged = !equal(base, current);
  const layoutChanged = !equal(baseLayout, currentLayout);
  const diff = diffDoc(baseDocument, currentDocument);
  const affectedIds = new Set();
  for (const bucket of ["added_nodes", "removed_nodes", "modified_nodes", "added_edges", "removed_edges", "modified_edges", "layout_changes"]) {
    for (const entry of diff[bucket] || []) if (entry?.id) affectedIds.add(entry.id);
  }
  if (contentChanged && !affectedIds.size) affectedIds.add("meta");
  return {
    conflictClass: contentChanged && layoutChanged ? "mixed" : contentChanged ? "content" : "layout_only",
    affectedIds: [...affectedIds].sort(),
  };
}
