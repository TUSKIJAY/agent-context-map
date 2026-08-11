import React, { Suspense, lazy, useState } from "react";
import { ViewerApp } from "./acm/viewer/ViewerApp.jsx";

const EditorApp = lazy(() => import("./App.jsx"));

export default function Launcher() {
  const [surface, setSurface] = useState("viewer");

  if (surface === "editor") {
    return (
      <Suspense fallback={<EditorLoading />}>
        <EditorApp />
      </Suspense>
    );
  }

  return (
    <ViewerApp
      surface="app"
      appAction={(
        <button
          type="button"
          data-action="enter-editor"
          style={editorButtonStyle}
          onClick={() => setSurface("editor")}
          title="显式加载保留的可写编辑器"
        >
          进入编辑器
        </button>
      )}
    />
  );
}

function EditorLoading() {
  return (
    <main
      data-app-surface="editor-loading"
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#f7f8fa",
        color: "#475467",
        fontFamily: 'system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
        fontSize: 13,
      }}
    >
      正在显式加载编辑器…
    </main>
  );
}

const editorButtonStyle = {
  border: "1px solid #344054",
  borderRadius: 8,
  padding: "7px 10px",
  background: "#344054",
  color: "#fff",
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
};
