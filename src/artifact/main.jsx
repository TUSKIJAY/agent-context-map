import React from "react";
import { createRoot } from "react-dom/client";
import { ViewerApp } from "../acm/viewer/ViewerApp.jsx";

const specText = typeof __ACM_ARTIFACT_SPEC_TEXT__ === "string" ? __ACM_ARTIFACT_SPEC_TEXT__ : null;
const artifactMetadata = typeof __ACM_ARTIFACT_BUILD_META__ === "object" ? __ACM_ARTIFACT_BUILD_META__ : null;

createRoot(document.getElementById("root")).render(
  <ViewerApp surface="artifact" specText={specText} artifactMetadata={artifactMetadata} />,
);
