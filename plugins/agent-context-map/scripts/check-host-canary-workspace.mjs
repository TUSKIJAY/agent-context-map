import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const documentIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export class HostCanaryWorkspaceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HostCanaryWorkspaceError";
    this.code = code;
  }
}

function comparable(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

async function canonicalDirectory(value, code) {
  let canonical;
  try {
    canonical = await fs.realpath(path.resolve(value));
  } catch {
    throw new HostCanaryWorkspaceError(code, "The canary project root is unavailable.");
  }
  const stat = await fs.stat(canonical);
  if (!stat.isDirectory()) throw new HostCanaryWorkspaceError(code, "The canary project root is not a directory.");
  return canonical;
}

async function gitTopLevel(projectRoot) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", projectRoot, "rev-parse", "--show-toplevel"], {
      windowsHide: true,
      encoding: "utf8",
    });
    return stdout.trim();
  } catch {
    throw new HostCanaryWorkspaceError(
      "non_git_workspace",
      "The Phase 8 host canary must target a Git workspace recognized by Codex Desktop.",
    );
  }
}

export async function inspectHostCanaryWorkspace({ projectRoot, documentId }) {
  if (typeof projectRoot !== "string" || !projectRoot.trim()) {
    throw new HostCanaryWorkspaceError("invalid_project_root", "A canary project root is required.");
  }
  if (typeof documentId !== "string" || !documentIdPattern.test(documentId)) {
    throw new HostCanaryWorkspaceError("invalid_document_id", "The canary document id is invalid.");
  }

  const canonicalRoot = await canonicalDirectory(projectRoot, "invalid_project_root");
  const canonicalGitRoot = await canonicalDirectory(await gitTopLevel(canonicalRoot), "non_git_workspace");
  if (comparable(canonicalRoot) !== comparable(canonicalGitRoot)) {
    throw new HostCanaryWorkspaceError(
      "not_git_workspace_root",
      "The deep-link project path must equal the Git top-level workspace root.",
    );
  }

  const relativeDocument = path.join(".acm", "documents", `${documentId}.acm.md`);
  const documentPath = path.join(canonicalRoot, relativeDocument);
  let canonicalDocument;
  try {
    canonicalDocument = await fs.realpath(documentPath);
  } catch {
    throw new HostCanaryWorkspaceError("missing_canary_document", "The expected canary ACM-MD document is missing.");
  }
  const relative = path.relative(canonicalRoot, canonicalDocument);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new HostCanaryWorkspaceError("unsafe_canary_document", "The canary document escaped the Git workspace root.");
  }
  if (!(await fs.stat(canonicalDocument)).isFile()) {
    throw new HostCanaryWorkspaceError("missing_canary_document", "The expected canary ACM-MD document is not a file.");
  }

  return {
    ok: true,
    gitWorkspaceRootVerified: true,
    documentId,
    projectRelativeDocument: relativeDocument.replaceAll("\\", "/"),
  };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new HostCanaryWorkspaceError("invalid_arguments", "Use --project-root <path> --document-id <id>.");
    }
    values[key.slice(2)] = value;
  }
  return { projectRoot: values["project-root"], documentId: values["document-id"] };
}

async function main() {
  try {
    const result = await inspectHostCanaryWorkspace(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof HostCanaryWorkspaceError ? error.code : "host_canary_preflight_failed";
    process.stderr.write(`${JSON.stringify({ ok: false, error: { code, message: error.message } })}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) await main();
