import fs from "node:fs/promises";
import path from "node:path";
import { McpControlPlaneError } from "../errors.js";

const SAFE_DOCUMENT_PATH = /^\.acm\/documents\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.acm\.md$/;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function lstatOrNull(target) {
  try { return await fs.lstat(target); } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function canonicalizeWorkspaceRoot(root) {
  if (typeof root !== "string" || !root.trim() || root.includes("\0")) {
    throw new McpControlPlaneError("no_trusted_workspace", "The host did not provide a usable workspace root.");
  }
  let canonical;
  try { canonical = await fs.realpath(path.resolve(root)); } catch {
    throw new McpControlPlaneError("no_trusted_workspace", "The host workspace root is unavailable.");
  }
  const stat = await fs.stat(canonical);
  if (!stat.isDirectory()) throw new McpControlPlaneError("no_trusted_workspace", "The host workspace root is not a directory.");
  return canonical;
}

export function assertAcmDocumentRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\0")) {
    throw new McpControlPlaneError("unsafe_project_path", "A normalized project-relative ACM-MD path is required.");
  }
  if (path.isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath) || relativePath.startsWith("\\\\")) {
    throw new McpControlPlaneError("unsafe_project_path", "Absolute paths are not accepted.");
  }
  const normalized = relativePath.replaceAll("\\", "/");
  const filename = normalized.split("/").at(-1) || "";
  if (!SAFE_DOCUMENT_PATH.test(normalized) || WINDOWS_RESERVED_NAME.test(filename) || normalized.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new McpControlPlaneError("unsafe_project_path", "Only normalized .acm/documents/*.acm.md paths are accepted.");
  }
  return normalized;
}

export async function resolveContainedAcmDocument(root, relativePath, { mustExist = true } = {}) {
  const canonicalRoot = await canonicalizeWorkspaceRoot(root);
  const normalized = assertAcmDocumentRelativePath(relativePath);
  const segments = normalized.split("/");
  const candidate = path.resolve(canonicalRoot, ...segments);
  if (!contained(canonicalRoot, candidate)) throw new McpControlPlaneError("unsafe_project_path", "The path escaped the trusted workspace.");

  let cursor = canonicalRoot;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    const stat = await lstatOrNull(cursor);
    if (!stat) {
      if (mustExist) throw new McpControlPlaneError("document_not_found", "The project ACM-MD document does not exist.");
      break;
    }
    if (stat.isSymbolicLink()) throw new McpControlPlaneError("unsafe_project_path", "Symlink and junction traversal is not accepted.");
  }

  const existing = await lstatOrNull(candidate);
  if (existing) {
    const canonicalCandidate = await fs.realpath(candidate);
    if (!contained(canonicalRoot, canonicalCandidate)) throw new McpControlPlaneError("unsafe_project_path", "The resolved path escaped the trusted workspace.");
    return canonicalCandidate;
  }
  return candidate;
}

export const SAFE_ACM_DOCUMENT_PATH_PATTERN = SAFE_DOCUMENT_PATH;
