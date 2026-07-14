import React from "react";
import { createRoot } from "react-dom/client";
import { AcmEditorShell } from "../../../../packages/acm-editor/src/index.js";
import { WidgetHostAdapter, widgetDataFromToolResult } from "./platform/WidgetHostAdapter.js";
import { createWidgetEditorPlatform } from "./platform/widget-platform.js";
import "./widget.css";

const rootElement = document.getElementById("root");

function renderFailure(error) {
  rootElement.dataset.acmWidgetState = "failed";
  rootElement.replaceChildren();
  const panel = document.createElement("main");
  panel.className = "acm-widget-error";
  const title = document.createElement("h1");
  title.textContent = "Agent Context Map could not open";
  const detail = document.createElement("p");
  detail.textContent = error?.message || String(error);
  panel.append(title, detail);
  rootElement.append(panel);
}

async function boot() {
  const bridge = new WidgetHostAdapter();
  await bridge.connect();
  const toolResult = await bridge.waitForToolResult();
  const snapshot = widgetDataFromToolResult(toolResult, window.openai);
  if (snapshot?.schemaVersion !== "agent-context-map-widget-snapshot/v1" || !snapshot.openAttemptId) {
    throw new Error("The host did not provide a valid Agent Context Map project snapshot.");
  }

  const clientMountId = crypto.randomUUID();
  const bootstrapped = await bridge.callServerTool("agent_context_map_widget_bootstrap", {
    openAttemptId: snapshot.openAttemptId,
    clientMountId,
  });
  if (bootstrapped?.isError || !bootstrapped?.structuredContent?.data?.widgetInstanceId) {
    throw new Error(bootstrapped?.structuredContent?.error?.message || "The Widget instance could not bind to the open attempt.");
  }
  const lifecycle = bootstrapped.structuredContent.data;
  let readyPromise = null;
  const platform = createWidgetEditorPlatform({
    snapshot,
    onCanvasFirstFrame(proof) {
      if (readyPromise) return readyPromise;
      rootElement.dataset.acmWidgetState = "canvas_first_frame";
      readyPromise = bridge.callServerTool("agent_context_map_widget_ready", {
        openAttemptId: snapshot.openAttemptId,
        widgetInstanceId: lifecycle.widgetInstanceId,
        proof: { reactMounted: true, projectHydrated: true, canvasFirstFrame: true, documentId: proof.documentId },
      }).then((result) => {
        if (result?.isError || result?.structuredContent?.data?.ready !== true) {
          throw new Error(result?.structuredContent?.error?.message || "The Widget ready proof was rejected.");
        }
        rootElement.dataset.acmWidgetState = "ready";
        bridge.sendSizeChanged();
        return result;
      }).catch((error) => {
        renderFailure(error);
        throw error;
      });
      return readyPromise;
    },
  });

  rootElement.dataset.acmWidgetState = "react_mounted";
  createRoot(rootElement).render(<AcmEditorShell platform={platform} />);
  const resizeObserver = new ResizeObserver(() => bridge.sendSizeChanged());
  resizeObserver.observe(document.documentElement);
  window.addEventListener("unload", () => { resizeObserver.disconnect(); bridge.close(); }, { once: true });
}

boot().catch(renderFailure);
