import { describe, expect, it } from "vitest";
import { AcmDocumentController } from "../../packages/acm-editor/src/document-controller.js";

const document = () => ({
  schema_version: "acm-md/0.1",
  doc_id: "acm_editor_controller",
  meta: { title: "Controller" },
  nodes: [{ id: "goal_001", type: "Goal", title: "Goal", status: "confirmed", x: 0, y: 0 }],
  edges: [],
});

describe("AcmDocumentController", () => {
  it("owns edit, coalesced undo/redo, validation, diff and baseline state", () => {
    const controller = new AcmDocumentController(document());
    controller.commit((doc) => ({ ...doc, nodes: doc.nodes.map((node) => ({ ...node, title: "First" })) }), "node:goal_001:title");
    controller.commit((doc) => ({ ...doc, nodes: doc.nodes.map((node) => ({ ...node, title: "Second" })) }), "node:goal_001:title");

    expect(controller.document.nodes[0].title).toBe("Second");
    expect(controller.undoStack).toHaveLength(1);
    expect(controller.dirty).toBe(true);
    expect(controller.validation.filter((issue) => issue.level === "error")).toEqual([]);

    controller.undo();
    expect(controller.document.nodes[0].title).toBe("Goal");
    controller.redo();
    expect(controller.document.nodes[0].title).toBe("Second");
    controller.adoptBaseline();
    expect(controller.dirty).toBe(false);
  });
});
