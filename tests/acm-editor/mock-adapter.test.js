import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AcmEditorShell, createMockEditorPlatform } from "../../packages/acm-editor/src/index.js";

describe("AcmEditorShell platform contract", () => {
  it("mounts its loading shell with a mock adapter and no runtime discovery", () => {
    const platform = createMockEditorPlatform();
    const html = renderToStaticMarkup(React.createElement(AcmEditorShell, { platform }));
    expect(html).toContain("正在载入工作现场");
  });
});
