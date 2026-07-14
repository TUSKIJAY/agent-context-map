import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { safeReplace } from "../../packages/project-store/src/index.js";
import { resolveContainedAcmDocument } from "../../plugins/agent-context-map/mcp/src/security/path-security.js";

const cleanups = [];
afterEach(async () => { while (cleanups.length) await cleanups.pop()(); });

async function tempRoot(prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  return root;
}

function lockFileExclusivelyOnWindows(file) {
  const command = [
    "$stream=[System.IO.File]::Open($env:ACM_LOCK_FILE,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None)",
    "[Console]::Out.WriteLine('locked')",
    "[Console]::Out.Flush()",
    "[Console]::In.ReadLine() | Out-Null",
    "$stream.Dispose()",
  ].join("; ");
  const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command], {
    env: { ...process.env, ACM_LOCK_FILE: file },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const ready = new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => reject(new Error(`Timed out acquiring Windows file lock: ${stderr}`)), 5000);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (chunk.includes("locked")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== 0) reject(new Error(`Windows lock helper exited ${code}: ${stderr}`));
    });
  });
  const release = async () => {
    if (child.exitCode !== null) return;
    child.stdin.end("\n");
    await new Promise((resolve) => child.once("exit", resolve));
  };
  return { ready, release };
}

describe("Phase 7 native filesystem semantics", () => {
  test.skipIf(process.platform !== "win32")("Windows rejects junction escape and preserves a locked destination", async () => {
    const base = await tempRoot("acm-win-filesystem-");
    const project = path.join(base, "project");
    const outside = path.join(base, "outside");
    await fs.mkdir(path.join(outside, "documents"), { recursive: true });
    await fs.mkdir(project, { recursive: true });
    await fs.writeFile(path.join(outside, "documents", "escape.acm.md"), "outside\n", "utf8");
    await fs.symlink(outside, path.join(project, ".acm"), "junction");
    await expect(resolveContainedAcmDocument(project, ".acm/documents/escape.acm.md")).rejects.toMatchObject({ code: "unsafe_project_path" });

    const target = path.join(base, "locked.acm.md");
    await fs.writeFile(target, "original\n", "utf8");
    const lock = lockFileExclusivelyOnWindows(target);
    await lock.ready;
    try {
      await expect(safeReplace(target, Buffer.from("replacement\n"))).rejects.toMatchObject({
        code: "atomic_replace_failed",
        details: { originalPreserved: true, replacementCommitted: false },
      });
    } finally {
      await lock.release();
    }
    expect(await fs.readFile(target, "utf8")).toBe("original\n");
    await safeReplace(target, Buffer.from("replacement\n"));
    expect(await fs.readFile(target, "utf8")).toBe("replacement\n");
  }, 15_000);

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("POSIX rejects symlink escape and preserves a permission-denied destination", async () => {
    const base = await tempRoot("acm-posix-filesystem-");
    const project = path.join(base, "project");
    const outside = path.join(base, "outside");
    const documents = path.join(project, ".acm", "documents");
    await fs.mkdir(documents, { recursive: true });
    await fs.mkdir(outside, { recursive: true });
    const external = path.join(outside, "escape.acm.md");
    const linked = path.join(documents, "linked.acm.md");
    await fs.writeFile(external, "outside\n", "utf8");
    await fs.symlink(external, linked, "file");
    await expect(resolveContainedAcmDocument(project, ".acm/documents/linked.acm.md")).rejects.toMatchObject({ code: "unsafe_project_path" });

    const target = path.join(documents, "locked.acm.md");
    await fs.writeFile(target, "original\n", "utf8");
    await fs.chmod(documents, 0o500);
    try {
      await expect(safeReplace(target, Buffer.from("replacement\n"))).rejects.toMatchObject({ code: "atomic_replace_failed" });
      expect(await fs.readFile(target, "utf8")).toBe("original\n");
    } finally {
      await fs.chmod(documents, 0o700);
    }
  });
});
