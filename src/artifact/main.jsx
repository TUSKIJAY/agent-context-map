import React from "react";
import { createRoot } from "react-dom/client";
import { ViewerApp } from "../acm/viewer/ViewerApp.jsx";

createRoot(document.getElementById("root")).render(<ViewerApp surface="artifact" />);
