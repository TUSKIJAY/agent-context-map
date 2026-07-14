import { describe, expect, test } from "vitest";
import { buildExecutionContext, buildRelatedContext, buildSelectedContext } from "../../../../packages/acm-core/src/index.js";
import { contextDocument } from "../helpers/context-document.js";

describe("Phase 6 context selection policy", () => {
  test("selected mode never traverses and related mode follows only the allowlist", () => {
    const selected = buildSelectedContext(contextDocument, ["task_001"]);
    expect(selected.nodes.map((node) => node.id)).toEqual(["task_001"]);
    expect(selected.edges).toEqual([]);
    const related = buildRelatedContext(contextDocument, ["task_001"]);
    expect(related.nodes.map((node) => node.id).sort()).toEqual(["constraint_001", "data_001", "task_001", "task_002"]);
    expect(related.nodes.map((node) => node.id)).not.toContain("feature_001");
    expect(related.edges.find((edge) => edge.id === "edge_ref").role).toBe("evidence");
  });

  test("execution context keeps only explicitly selected Tasks executable", () => {
    const execution = buildExecutionContext(contextDocument, ["task_001"]);
    expect(execution.ok).toBe(true);
    expect(execution.selectedTaskIds).toEqual(["task_001"]);
    expect(execution.tasks.map((task) => task.id)).toEqual(["task_001"]);
    expect(execution.prompt).toContain("仅执行预览中列出的 Task，不自动沿图扩展");
  });
});
