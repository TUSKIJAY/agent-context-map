import { PLUGIN_VERSION } from "../../../src/plugin-version.js";

const DEFAULT_TIMEOUT_MS = 8000;

function asError(value, fallback) {
  if (value instanceof Error) return value;
  return new Error(String(value || fallback));
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), timeoutMs); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function widgetDataFromToolResult(result, compatibilityGlobal = null) {
  if (result?._meta?.widgetData) return result._meta.widgetData;
  if (compatibilityGlobal?.toolResponseMetadata?.widgetData) return compatibilityGlobal.toolResponseMetadata.widgetData;
  if (compatibilityGlobal?.rawToolResult?._meta?.widgetData) return compatibilityGlobal.rawToolResult._meta.widgetData;
  if (result?.structuredContent) return result.structuredContent;
  return compatibilityGlobal?.toolOutput || null;
}

export class WidgetHostAdapter {
  constructor({ currentWindow = globalThis.window, parentWindow = globalThis.window?.parent, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.currentWindow = currentWindow;
    this.parentWindow = parentWindow;
    this.timeoutMs = timeoutMs;
    this.sequence = 0;
    this.pending = new Map();
    this.toolResultWaiters = new Set();
    this.hostContext = null;
    this.connected = false;
    this.onMessage = this.onMessage.bind(this);
  }

  onMessage(event) {
    if (event.source && this.parentWindow && event.source !== this.parentWindow) return;
    const message = event.data;
    if (!message || typeof message !== "object") return;
    const waiter = message.id !== undefined ? this.pending.get(String(message.id)) : null;
    if (waiter) {
      this.pending.delete(String(message.id));
      if (message.error) waiter.reject(new Error(message.error.message || "MCP Apps host request failed."));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method === "ui/notifications/tool-result" && message.params?.result) {
      this.lastToolResult = message.params.result;
      for (const resolve of this.toolResultWaiters) resolve(message.params.result);
      this.toolResultWaiters.clear();
    }
    if (message.method === "ui/notifications/host-context-changed") {
      this.hostContext = { ...(this.hostContext || {}), ...(message.params || {}) };
    }
  }

  post(message) {
    if (!this.parentWindow || this.parentWindow === this.currentWindow) throw new Error("MCP Apps parent host is unavailable.");
    this.parentWindow.postMessage(message, "*");
  }

  request(method, params = {}, timeoutMs = this.timeoutMs) {
    const id = `acm-widget-${++this.sequence}`;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.post({ jsonrpc: "2.0", id, method, params });
    });
    return withTimeout(result, timeoutMs, `MCP Apps host timed out during ${method}.`).finally(() => this.pending.delete(id));
  }

  notify(method, params = {}) {
    this.post({ jsonrpc: "2.0", method, params });
  }

  async connect() {
    if (this.connected) return this.hostContext;
    this.currentWindow.addEventListener("message", this.onMessage);
    try {
      const initialized = await this.request("ui/initialize", {
        appInfo: { name: "agent-context-map-widget", version: PLUGIN_VERSION },
        appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
        protocolVersion: "2025-11-21",
      }, Math.min(4000, this.timeoutMs));
      this.hostContext = initialized?.hostContext || null;
      this.notify("ui/notifications/initialized", {});
      this.connected = true;
      return this.hostContext;
    } catch (standardError) {
      const compatibility = this.currentWindow.openai;
      if (typeof compatibility?.callTool !== "function") throw asError(standardError, "MCP Apps bridge is unavailable.");
      this.connected = true;
      this.compatibilityMode = true;
      this.hostContext = compatibility.hostContext || null;
      return this.hostContext;
    }
  }

  initialToolResult() {
    const compatibility = this.currentWindow.openai;
    return compatibility?.rawToolResult || (compatibility?.toolOutput ? {
      structuredContent: compatibility.toolOutput,
      _meta: compatibility.toolResponseMetadata || {},
    } : null);
  }

  async waitForToolResult(timeoutMs = this.timeoutMs) {
    const initial = this.initialToolResult();
    if (initial) return initial;
    if (this.lastToolResult) return this.lastToolResult;
    return withTimeout(new Promise((resolve) => this.toolResultWaiters.add(resolve)), timeoutMs, "The host did not hydrate the Widget tool result.");
  }

  async callServerTool(name, args = {}) {
    if (this.compatibilityMode) return this.currentWindow.openai.callTool(name, args);
    return this.request("tools/call", { name, arguments: args }, 12000);
  }

  async sendMessage(text) {
    if (typeof text !== "string" || !text.trim()) throw new Error("A non-empty reviewed message is required.");
    if (this.compatibilityMode) {
      const send = this.currentWindow.openai?.sendFollowUpMessage;
      if (typeof send !== "function") throw new Error("The compatibility host cannot send a follow-up message.");
      return send({ prompt: text });
    }
    return this.request("ui/message", { role: "user", content: [{ type: "text", text }] }, 12000);
  }

  sendSizeChanged() {
    if (!this.connected || this.compatibilityMode) return;
    const root = this.currentWindow.document?.documentElement;
    const body = this.currentWindow.document?.body;
    this.notify("ui/notifications/size-changed", {
      width: Math.ceil(this.currentWindow.innerWidth || root?.clientWidth || 0),
      height: Math.ceil(Math.max(root?.scrollHeight || 0, body?.scrollHeight || 0)),
    });
  }

  close() {
    this.currentWindow.removeEventListener("message", this.onMessage);
    for (const waiter of this.pending.values()) waiter.reject(new Error("Widget host bridge closed."));
    this.pending.clear();
    this.toolResultWaiters.clear();
  }
}
