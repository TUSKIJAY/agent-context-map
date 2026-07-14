import React from "react";
import { AcmEditorShell } from "../packages/acm-editor/src/index.js";
import { createDesktopPlatform } from "./platform/index.js";

const platform = createDesktopPlatform();

export default function DesktopApp() {
  return <AcmEditorShell platform={platform} />;
}
