import fs from "node:fs/promises";
import { beforeAll, describe, expect, test } from "vitest";
import { buildWidget, widgetDist } from "../../scripts/build-widget.mjs";

let html;

beforeAll(async () => {
  const result = await buildWidget();
  html = result.html;
});

describe("Phase 5 Widget bundle policy", () => {
  test("emits one self-contained local-only HTML resource", async () => {
    expect(await fs.readdir(widgetDist)).toEqual(["widget.html"]);
    expect(html).toContain("ui/initialize");
    expect(html).toContain("tools/call");
    expect(html).toContain("data-acm-widget-state");
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=/i);
    expect(html).not.toMatch(/(?:fetch\(|XMLHttpRequest|WebSocket|EventSource)/);
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//i);
    expect(html).not.toMatch(/\bprocess\.env\b/);
    expect(html).not.toMatch(/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)/i);
    expect(html).not.toMatch(/@tauri-apps|plugin-sql|localStorage|D:\\Code\\agent-context-map/i);
  });
});
