export const WIDGET_RESOURCE_URI = "ui://agent-context-map/widget.html";

export const WIDGET_PLACEHOLDER_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Context Map</title></head>
<body><main id="root" data-phase="4"><h1>Agent Context Map</h1><p>The secure MCP control plane is ready. The interactive editor is enabled in Phase 5.</p></main></body>
</html>`;

export const WIDGET_HTML = globalThis.__ACM_WIDGET_HTML__ || WIDGET_PLACEHOLDER_HTML;

export function listUiResources() {
  return {
    resources: [{
      uri: WIDGET_RESOURCE_URI,
      name: "Agent Context Map Widget",
      description: "Local-only MCP Apps editor for the current trusted Agent Context Map project.",
      mimeType: "text/html;profile=mcp-app",
      _meta: { ui: { resourceUri: WIDGET_RESOURCE_URI, csp: { connectDomains: [], resourceDomains: ["data:", "blob:"] } } },
    }],
  };
}

export function readUiResource(uri) {
  if (uri !== WIDGET_RESOURCE_URI) return null;
  return {
    contents: [{
      uri: WIDGET_RESOURCE_URI,
      mimeType: "text/html;profile=mcp-app",
      text: WIDGET_HTML,
      _meta: { ui: { resourceUri: WIDGET_RESOURCE_URI, csp: { connectDomains: [], resourceDomains: ["data:", "blob:"] } } },
    }],
  };
}
