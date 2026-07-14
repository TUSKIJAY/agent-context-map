#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const SERVER_NAME = "codex-host-binding-spike";
const SERVER_VERSION = "0.1.0";
const instanceId = randomUUID();
const evidenceDir = join(tmpdir(), "agent-context-map-host-binding-spike");
const evidenceLog = join(evidenceDir, "evidence.ndjson");
const pendingClientRequests = new Map();
const initEvidence = {
  received: false,
  paramsShape: null,
  clientInfo: null,
  capabilitiesShape: null,
};
let requestSequence = 0;

const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const valueType = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

function sanitizedFieldName(key) {
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(key) || /^file:/i.test(key)) {
    return `<redacted-key:${sha256(key).slice(0, 16)}>`;
  }
  return key;
}

function shapeOf(value, depth = 0) {
  if (depth > 4) return { type: valueType(value), truncated: true };
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      itemTypes: [...new Set(value.map(valueType))].sort(),
    };
  }
  if (!value || typeof value !== "object") return { type: valueType(value) };
  return {
    type: "object",
    fields: Object.fromEntries(Object.keys(value).sort().map((key) => [sanitizedFieldName(key), shapeOf(value[key], depth + 1)])),
  };
}

function identityCandidates(value, prefix = "") {
  if (!value || typeof value !== "object") return [];
  const candidates = [];
  for (const [key, item] of Object.entries(value)) {
    const safeKey = sanitizedFieldName(key);
    const path = prefix ? `${prefix}.${safeKey}` : safeKey;
    if (/(task|thread|conversation|workspace|project|root|session)/i.test(key)) {
      candidates.push({
        path,
        type: valueType(item),
        valueHash: ["string", "number", "boolean"].includes(typeof item) ? sha256(item) : null,
      });
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      candidates.push(...identityCandidates(item, path));
    }
  }
  return candidates;
}

function environmentEvidence() {
  return Object.keys(process.env)
    .filter((key) => /(CODEX|TASK|THREAD|CONVERSATION|WORKSPACE|PROJECT|PWD|INIT_CWD)/i.test(key))
    .sort()
    .map((key) => ({
      name: key,
      type: valueType(process.env[key]),
      valueHash: process.env[key] == null ? null : sha256(process.env[key]),
    }));
}

function hostWorkspaceEvidence(callMeta) {
  const workspaces = callMeta?.["x-codex-turn-metadata"]?.workspaces;
  if (!workspaces || typeof workspaces !== "object" || Array.isArray(workspaces)) {
    return { supported: false, count: 0, roots: [] };
  }
  const roots = Object.entries(workspaces).map(([root, metadata]) => ({
    rootType: valueType(root),
    rootHash: sha256(root),
    pathStyle: /^[A-Za-z]:[\\/]/.test(root) ? "windows_absolute" : root.startsWith("/") ? "posix_absolute" : "other",
    metadataShape: shapeOf(metadata),
  }));
  return { supported: true, count: roots.length, roots };
}

async function recordEvidence(event) {
  await mkdir(evidenceDir, { recursive: true });
  await appendFile(evidenceLog, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function requestClient(method, params, timeoutMs = 1200) {
  const id = `server-${process.pid}-${++requestSequence}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingClientRequests.delete(id);
      resolve({ supported: false, reason: "timeout" });
    }, timeoutMs);
    pendingClientRequests.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) resolve({ supported: false, reason: "client_error", errorShape: shapeOf(message.error) });
      else resolve({ supported: true, result: message.result });
    });
    send({ jsonrpc: "2.0", id, method, params });
  });
}

async function collectRootsEvidence() {
  const response = await requestClient("roots/list", {});
  if (!response.supported) return response;
  const roots = Array.isArray(response.result?.roots) ? response.result.roots : [];
  return {
    supported: true,
    count: roots.length,
    roots: roots.map((root) => ({
      uriType: valueType(root?.uri),
      uriScheme: typeof root?.uri === "string" && root.uri.includes(":") ? root.uri.split(":", 1)[0] : null,
      uriHash: typeof root?.uri === "string" ? sha256(root.uri) : null,
      namePresent: typeof root?.name === "string" && root.name.length > 0,
      nameHash: typeof root?.name === "string" ? sha256(root.name) : null,
    })),
  };
}

const tools = [
  {
    name: "host_binding_spike_health",
    title: "Host binding spike health",
    description: "Return read-only process health and evidence schema version. Does not inspect project files.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: {
      type: "object",
      required: ["ok", "server", "version", "instanceId", "evidenceSchemaVersion"],
      properties: {
        ok: { type: "boolean" },
        server: { type: "string" },
        version: { type: "string" },
        instanceId: { type: "string" },
        evidenceSchemaVersion: { type: "string" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
  {
    name: "inspect_codex_host_identity",
    title: "Inspect Codex host identity evidence",
    description: "Read-only Phase 0B probe. Any identity-like tool arguments are recorded only as ignored untrusted keys and never authorize a project.",
    inputSchema: {
      type: "object",
      properties: {
        probeLabel: { type: "string", maxLength: 80 },
        projectPath: { type: "string", maxLength: 512 },
        workspaceRoot: { type: "string", maxLength: 512 },
        threadId: { type: "string", maxLength: 256 },
        taskId: { type: "string", maxLength: 256 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
];

async function callTool(params) {
  if (params?.name === "host_binding_spike_health") {
    const data = {
      ok: true,
      server: SERVER_NAME,
      version: SERVER_VERSION,
      instanceId,
      evidenceSchemaVersion: "host-binding-evidence/v1",
    };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
  }

  if (params?.name !== "inspect_codex_host_identity") {
    throw Object.assign(new Error(`Unknown tool: ${params?.name}`), { code: -32602 });
  }

  const rootsEvidence = await collectRootsEvidence();
  const callMeta = params?._meta && typeof params._meta === "object" ? params._meta : {};
  const workspacesEvidence = hostWorkspaceEvidence(callMeta);
  const hostMetaCandidates = identityCandidates(callMeta);
  const envCandidates = environmentEvidence();
  const argumentKeys = Object.keys(params?.arguments && typeof params.arguments === "object" ? params.arguments : {}).sort();
  const ignoredIdentityArgumentKeys = argumentKeys.filter((key) => /(path|root|task|thread|workspace|project)/i.test(key));
  const rootCandidateCount = workspacesEvidence.count > 0
    ? workspacesEvidence.count
    : rootsEvidence.supported === true ? rootsEvidence.count : 0;
  const trustedRootEvidence = rootCandidateCount > 0;
  const trustedTaskEvidence = hostMetaCandidates.some((candidate) => /(task|thread|conversation)/i.test(candidate.path));
  const conclusion = trustedRootEvidence && trustedTaskEvidence
    ? rootCandidateCount === 1 ? "trusted_host_identity" : "trusted_native_picker_required"
    : "unavailable";
  const correlationId = randomUUID();

  const evidence = {
    schemaVersion: "host-binding-evidence/v1",
    capturedAt: new Date().toISOString(),
    correlationId,
    instanceId,
    processId: process.pid,
    serverVersion: SERVER_VERSION,
    initialize: initEvidence,
    toolCall: {
      paramsShape: shapeOf(params),
      metaShape: shapeOf(callMeta),
      hostIdentityCandidates: hostMetaCandidates,
      argumentKeys,
      ignoredIdentityArgumentKeys,
    },
    clientRoots: rootsEvidence,
    hostWorkspaces: workspacesEvidence,
    processEnvironmentCandidates: envCandidates,
    processCwd: {
      basename: basename(process.cwd()),
      valueHash: sha256(process.cwd()),
      treatedAsAuthorization: false,
    },
    decision: {
      trustedRootEvidence,
      trustedTaskEvidence,
      rootCandidateCount,
      conclusion,
      modelArgumentsUsedForAuthorization: false,
    },
  };

  await recordEvidence(evidence);
  const result = {
    ok: true,
    correlationId,
    instanceId,
    conclusion,
    trustedRootEvidence,
    trustedTaskEvidence,
    rootCandidateCount,
    ignoredIdentityArgumentKeys,
    hostMetaFieldPaths: hostMetaCandidates.map((candidate) => candidate.path),
    clientRootCount: rootsEvidence.supported ? rootsEvidence.count : 0,
    hostWorkspaceCount: workspacesEvidence.count,
    hostWorkspaceRootHashes: workspacesEvidence.roots.map((root) => root.rootHash),
    modelArgumentsUsedForAuthorization: false,
  };
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
}

async function handleRequest(message) {
  if (message.method === "initialize") {
    initEvidence.received = true;
    initEvidence.paramsShape = shapeOf(message.params || {});
    initEvidence.clientInfo = message.params?.clientInfo ? shapeOf(message.params.clientInfo) : null;
    initEvidence.capabilitiesShape = message.params?.capabilities ? shapeOf(message.params.capabilities) : null;
    respond(message.id, {
      protocolVersion: message.params?.protocolVersion || "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions: "Read-only Phase 0B diagnostic. Never use tool arguments as project or task authorization.",
    });
    return;
  }
  if (message.method === "ping") {
    respond(message.id, {});
    return;
  }
  if (message.method === "tools/list") {
    respond(message.id, { tools });
    return;
  }
  if (message.method === "tools/call") {
    try {
      respond(message.id, await callTool(message.params || {}));
    } catch (error) {
      respondError(message.id, error.code || -32603, error.message || "Tool call failed");
    }
    return;
  }
  if (message.id !== undefined) respondError(message.id, -32601, `Method not found: ${message.method}`);
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.id !== undefined && !message.method && pendingClientRequests.has(String(message.id))) {
    const resolvePending = pendingClientRequests.get(String(message.id));
    pendingClientRequests.delete(String(message.id));
    resolvePending(message);
    return;
  }
  void handleRequest(message);
});
