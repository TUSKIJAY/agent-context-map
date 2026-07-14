import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDoc } from "./helpers.js";

const native = vi.hoisted(() => ({ documents: new Map(), indexText: null }));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (command, input = {}) => {
    if (command === "project_scan") {
      return [...native.documents.entries()].map(([documentId, text]) => ({
        relativePath: `.acm/documents/${documentId}.acm.md`,
        text,
        modifiedAtMs: Date.now(),
      }));
    }
    if (command === "project_scan_recovery") return { temps: [], locks: [], autoActionTaken: false };
    if (command === "project_read_index") return native.indexText;
    if (command === "project_write_index") {
      if (input.expectedText !== native.indexText) return { status: "revision_conflict", currentText: native.indexText };
      native.indexText = input.newText;
      return { status: "committed", currentText: null };
    }
    if (command === "project_write_document") {
      const current = native.documents.get(input.documentId) ?? null;
      if (input.create && (current != null || input.expectedText != null)) return { status: "document_already_exists", currentText: current };
      if (!input.create && current == null) return { status: "document_not_found", currentText: null };
      if (!input.create && current !== input.expectedText) return { status: "revision_conflict", currentText: current };
      native.documents.set(input.documentId, input.newText);
      return { status: "committed", currentText: null };
    }
    if (command === "project_delete_document") {
      const current = native.documents.get(input.documentId) ?? null;
      if (current !== input.expectedText) return { status: "revision_conflict", currentText: current };
      native.documents.delete(input.documentId);
      return { status: "deleted", currentText: null };
    }
    throw new Error(`unexpected command: ${command}`);
  }),
}));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

async function adapter() {
  vi.resetModules();
  globalThis.localStorage = memoryStorage();
  globalThis.localStorage.setItem("acm:selected-project-root", "D:\\fixture-project");
  return import("../../src/storage/tauriProjectStore.js");
}

beforeEach(() => {
  native.documents.clear();
  native.indexText = null;
});

describe("Tauri project-file adapter", () => {
  it("creates, scans, opens and saves project ACM-MD instead of SQLite", async () => {
    const { backend } = await adapter();
    await backend.upsertDocument({ doc_id: "acm_tauri_001", title: "Tauri", domain_profile: "generic", body: makeDoc("acm_tauri_001", "Tauri") });
    expect(native.documents.has("acm_tauri_001")).toBe(true);
    expect(JSON.parse(native.indexText).documents.map((entry) => entry.id)).toEqual(["acm_tauri_001"]);
    const opened = await backend.getDocument("acm_tauri_001");
    expect(opened.body.meta.title).toBe("Tauri");

    const updated = makeDoc("acm_tauri_001", "Saved through project adapter", 55);
    await backend.saveBody("acm_tauri_001", { domain_profile: "generic", body: updated, dirty: true });
    expect((await backend.getDocument("acm_tauri_001")).body.meta.title).toBe("Saved through project adapter");
  });

  it("returns a revision conflict and does not overwrite an external edit", async () => {
    const { backend } = await adapter();
    const { toAcmMd } = await import("../../packages/acm-core/src/index.js");
    await backend.upsertDocument({ doc_id: "acm_tauri_001", title: "Initial", domain_profile: "generic", body: makeDoc("acm_tauri_001", "Initial") });
    await backend.getDocument("acm_tauri_001");
    const externalText = toAcmMd(makeDoc("acm_tauri_001", "External edit", 88));
    native.documents.set("acm_tauri_001", externalText);
    await expect(backend.saveBody("acm_tauri_001", {
      domain_profile: "generic",
      body: makeDoc("acm_tauri_001", "Stale local edit", 11),
      dirty: true,
    })).rejects.toMatchObject({ code: "revision_conflict", details: { conflictClass: "mixed" } });
    expect(native.documents.get("acm_tauri_001")).toBe(externalText);
  });
});
