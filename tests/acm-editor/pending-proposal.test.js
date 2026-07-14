import { describe, expect, it } from "vitest";
import { applyAgentPatchOperations, createMockAgentPatch } from "../../packages/acm-editor/src/data.js";

const document = {
  schema_version: "acm-md/0.1",
  doc_id: "acm_pending_proposal",
  meta: { title: "Pending" },
  nodes: [{ id: "goal_001", type: "Goal", title: "Goal", status: "confirmed", x: 0, y: 0 }],
  edges: [],
};

describe("pending proposal boundary", () => {
  it("uses canonical camelCase operations and changes the document only after acceptance", () => {
    const proposal = createMockAgentPatch(document, "goal_001", "expand", { timestamp: 1 });
    expect(proposal.operations.every((operation) => ["addNode", "addEdge", "updateNodeFields"].includes(operation.op))).toBe(true);
    expect(document.nodes).toHaveLength(1);

    const accepted = applyAgentPatchOperations(document, proposal, proposal.operations.map((operation) => operation.id));
    expect(accepted.appliedIds.length).toBeGreaterThan(0);
    expect(accepted.doc.nodes.length).toBeGreaterThan(document.nodes.length);
    expect(document.nodes).toHaveLength(1);
  });
});
