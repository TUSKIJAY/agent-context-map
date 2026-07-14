import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { normalizeLegacyAgentPatchForDiagnostics } from "../../src/acm/agentClient.js";
import { sampleDoc } from "../../src/acm/data.js";

describe("existing pending Agent boundary", () => {
  test("downgrades an inferred confirmed node before it becomes a pending proposal", () => {
    const raw = JSON.parse(readFileSync(resolve("tests/fixtures/agent/confirmed-inference.json"), "utf8"));
    const { patch, diagnostics } = normalizeLegacyAgentPatchForDiagnostics(raw, { doc: sampleDoc(), baseNodeId: null, prompt: "baseline" });
    const operation = patch.operations.find((item) => item.id === "op_confirmed_inference");

    expect(diagnostics).toContainEqual(expect.objectContaining({ code: "legacy_operation_kind" }));
    expect(operation.status).toBe("pending");
    expect(operation.node.status).toBe("suggested");
  });
});
