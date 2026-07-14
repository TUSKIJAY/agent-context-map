import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { canonicalizeWorkspaceRoot } from "./path-security.js";
import { McpControlPlaneError } from "../errors.js";

const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");

function turnMetadata(meta) {
  const value = meta?.["x-codex-turn-metadata"];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function trustedTaskIdentity(meta) {
  const turn = turnMetadata(meta);
  const topLevelThread = typeof meta?.threadId === "string" ? meta.threadId : null;
  const turnThread = typeof turn.thread_id === "string" ? turn.thread_id : null;
  if (topLevelThread && turnThread && topLevelThread !== turnThread) {
    throw new McpControlPlaneError("task_binding_mismatch", "Host task identity fields disagree.");
  }
  const taskKey = topLevelThread || turnThread || (typeof turn.session_id === "string" ? turn.session_id : null);
  if (!taskKey) throw new McpControlPlaneError("no_trusted_workspace", "Host-owned task identity is unavailable.");
  return taskKey;
}

function hostWorkspaceCandidates(meta) {
  const workspaces = turnMetadata(meta).workspaces;
  if (!workspaces || typeof workspaces !== "object" || Array.isArray(workspaces)) return [];
  return Object.keys(workspaces);
}

async function clientRootCandidates(requestClient) {
  const response = await requestClient("roots/list", {});
  if (!response?.supported || !Array.isArray(response.result?.roots)) return [];
  return response.result.roots.flatMap((root) => {
    if (typeof root?.uri !== "string" || !root.uri.startsWith("file:")) return [];
    try { return [fileURLToPath(root.uri)]; } catch { return []; }
  });
}

async function canonicalCandidates(values) {
  const canonical = [];
  for (const value of values) canonical.push(await canonicalizeWorkspaceRoot(value));
  return [...new Set(canonical.map((root) => process.platform === "win32" ? root.toLowerCase() : root))];
}

export async function collectTrustedHostBinding({ meta = {}, requestClient }) {
  const taskKey = trustedTaskIdentity(meta);
  const hostRoots = await canonicalCandidates(hostWorkspaceCandidates(meta));
  const clientRoots = await canonicalCandidates(await clientRootCandidates(requestClient));
  const roots = hostRoots.length ? hostRoots : clientRoots;
  if (roots.length === 0) throw new McpControlPlaneError("no_trusted_workspace", "No host-owned workspace root is available.");
  if (roots.length !== 1) throw new McpControlPlaneError("trusted_native_picker_required", "Multiple host workspaces require a trusted native user selection.");
  if (hostRoots.length === 1 && clientRoots.length === 1 && hostRoots[0] !== clientRoots[0]) {
    throw new McpControlPlaneError("project_binding_mismatch", "Host workspace evidence does not agree with MCP client roots.");
  }
  return {
    taskKey,
    taskFingerprint: sha256(taskKey),
    root: roots[0],
    rootFingerprint: sha256(roots[0]),
  };
}
