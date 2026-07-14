import { createInterface } from "node:readline";
import { readUiResource, listUiResources } from "./resources/widget-placeholder.js";

export function startStdioServer({ serverName, serverVersion, toolRegistry }) {
  const pendingClientRequests = new Map();
  let requestSequence = 0;

  const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
  const respond = (id, result) => send({ jsonrpc: "2.0", id, result });
  const respondError = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });
  const requestClient = (method, params, timeoutMs = 1200) => {
    const id = `server-${process.pid}-${++requestSequence}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingClientRequests.delete(id);
        resolve({ supported: false, reason: "timeout" });
      }, timeoutMs);
      pendingClientRequests.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) resolve({ supported: false, reason: "client_error" });
        else resolve({ supported: true, result: message.result });
      });
      send({ jsonrpc: "2.0", id, method, params });
    });
  };

  async function handleRequest(message) {
    if (message.method === "initialize") {
      respond(message.id, {
        protocolVersion: message.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
        serverInfo: { name: serverName, version: serverVersion },
        instructions: "Local-first ACM-MD control plane. Project authorization comes only from host-owned task and workspace metadata.",
      });
      return;
    }
    if (message.method === "ping") { respond(message.id, {}); return; }
    if (message.method === "tools/list") { respond(message.id, toolRegistry.list()); return; }
    if (message.method === "tools/call") { respond(message.id, await toolRegistry.call(message.params || {}, { requestClient })); return; }
    if (message.method === "resources/list") { respond(message.id, listUiResources()); return; }
    if (message.method === "resources/read") {
      const resource = readUiResource(message.params?.uri);
      if (!resource) respondError(message.id, -32602, "Unknown resource URI");
      else respond(message.id, resource);
      return;
    }
    if (message.id !== undefined) respondError(message.id, -32601, `Method not found: ${message.method}`);
  }

  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id !== undefined && !message.method && pendingClientRequests.has(String(message.id))) {
      const resolvePending = pendingClientRequests.get(String(message.id));
      pendingClientRequests.delete(String(message.id));
      resolvePending(message);
      return;
    }
    void handleRequest(message);
  });
  return { close: () => lines.close() };
}
