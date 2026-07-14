import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { assertAcmDocumentRelativePath, canonicalizeWorkspaceRoot, resolveContainedAcmDocument } from "../../mcp/src/security/path-security.js";

let base;
let root;
let outside;

beforeEach(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), "acm-path-security-"));
  root = path.join(base, "project"); outside = path.join(base, "outside");
  await fs.mkdir(path.join(root, ".acm", "documents"), { recursive: true });
  await fs.mkdir(outside, { recursive: true });
  await fs.writeFile(path.join(root, ".acm", "documents", "safe.acm.md"), "safe\n");
  await fs.writeFile(path.join(outside, "escape.acm.md"), "outside\n");
});
afterEach(async () => { await fs.rm(base, { recursive: true, force: true }); });

describe("Phase 4 path containment", () => {
  test("canonicalizes a real workspace and resolves only contained ACM-MD documents", async () => {
    const canonical = await canonicalizeWorkspaceRoot(root);
    expect(await resolveContainedAcmDocument(canonical, ".acm/documents/safe.acm.md")).toBe(path.join(canonical, ".acm", "documents", "safe.acm.md"));
    expect(assertAcmDocumentRelativePath(".acm\\documents\\safe.acm.md")).toBe(".acm/documents/safe.acm.md");
  });

  test.each(["../escape.acm.md", ".acm/../escape.acm.md", "C:\\escape.acm.md", "\\\\server\\share\\escape.acm.md", ".acm/index.json", ".acm/documents/CON.acm.md", ".acm/documents/nUl.acm.md"])("rejects unsafe path %s", async (candidate) => {
    await expect(resolveContainedAcmDocument(root, candidate)).rejects.toMatchObject({ code: "unsafe_project_path" });
  });

  test("rejects a document symlink that points outside the trusted root", async () => {
    const link = path.join(root, ".acm", "documents", "linked.acm.md");
    await fs.symlink(path.join(outside, "escape.acm.md"), link, "file");
    await expect(resolveContainedAcmDocument(root, ".acm/documents/linked.acm.md")).rejects.toMatchObject({ code: "unsafe_project_path" });
  });

  test("rejects a junction or directory symlink in the .acm path", async () => {
    await fs.rm(path.join(root, ".acm"), { recursive: true, force: true });
    await fs.mkdir(path.join(outside, "documents"), { recursive: true });
    await fs.writeFile(path.join(outside, "documents", "escape.acm.md"), "outside\n");
    await fs.symlink(outside, path.join(root, ".acm"), process.platform === "win32" ? "junction" : "dir");
    await expect(resolveContainedAcmDocument(root, ".acm/documents/escape.acm.md")).rejects.toMatchObject({ code: "unsafe_project_path" });
  });
});
