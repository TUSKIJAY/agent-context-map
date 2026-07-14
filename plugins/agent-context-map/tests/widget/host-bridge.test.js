import { describe, expect, test, vi } from "vitest";
import { WidgetHostAdapter, widgetDataFromToolResult } from "../../widget/src/platform/WidgetHostAdapter.js";

function fakeHost({ standard = true } = {}) {
  const listeners = new Set();
  const currentWindow = {
    openai: standard ? null : { hostContext: { displayMode: "inline" }, callTool: vi.fn(async (name, args) => ({ name, args })) },
    addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
    document: { documentElement: {}, body: {} },
    innerWidth: 900,
  };
  const parentWindow = {
    postMessage(message) {
      if (!standard) return;
      queueMicrotask(() => {
        let result = {};
        if (message.method === "ui/initialize") result = { hostContext: { displayMode: "inline" }, hostCapabilities: {} };
        if (message.method === "tools/call") result = { structuredContent: { ok: true, data: message.params } };
        if (message.id) for (const listener of listeners) listener({ source: parentWindow, data: { jsonrpc: "2.0", id: message.id, result } });
      });
    },
  };
  return { currentWindow, parentWindow, emit(data) { for (const listener of listeners) listener({ source: parentWindow, data }); } };
}

describe("Phase 5 MCP Apps host bridge", () => {
  test("uses standard ui/initialize and tools/call before compatibility globals", async () => {
    const host = fakeHost();
    const bridge = new WidgetHostAdapter({ ...host, timeoutMs: 100 });
    await expect(bridge.connect()).resolves.toMatchObject({ displayMode: "inline" });
    await expect(bridge.callServerTool("widget_test", { value: 1 })).resolves.toMatchObject({ structuredContent: { ok: true } });
    host.emit({ method: "ui/notifications/tool-result", params: { result: { _meta: { widgetData: { schemaVersion: "test/v1" } } } } });
    const result = await bridge.waitForToolResult();
    expect(widgetDataFromToolResult(result)).toEqual({ schemaVersion: "test/v1" });
    bridge.close();
  });

  test("uses window.openai.callTool only when the standard handshake is unavailable", async () => {
    const host = fakeHost({ standard: false });
    const bridge = new WidgetHostAdapter({ ...host, timeoutMs: 20 });
    await bridge.connect();
    expect(bridge.compatibilityMode).toBe(true);
    await expect(bridge.callServerTool("fallback", { value: 2 })).resolves.toEqual({ name: "fallback", args: { value: 2 } });
    bridge.close();
  });
});
