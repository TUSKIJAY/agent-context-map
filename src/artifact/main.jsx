import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import fixtureText from "../../skills/acm-md/examples/valid-basic.acm.md?raw";
import { GraphCanvas } from "../acm/FlowCanvas.jsx";
import { parseAcmMd, validateDoc } from "../acm/data.js";

function ArtifactSpike() {
  const parsed = useMemo(() => parseAcmMd(fixtureText), []);
  const [selection, setSelection] = useState(null);

  if (!parsed.doc) {
    return <main style={errorStyle}>Artifact fixture 解析失败：{parsed.errors.join("；")}</main>;
  }

  const validation = validateDoc(parsed.doc);
  const validationErrors = validation.filter((issue) => issue.level === "error");
  const selectedNode = selection?.kind === "node"
    ? parsed.doc.nodes.find((node) => node.id === selection.id)
    : null;

  return (
    <main data-artifact-state="ready" style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>VISUAL SPEC ARTIFACT · PHASE 0 SPIKE</div>
          <h1 style={titleStyle}>{parsed.doc.meta.title}</h1>
        </div>
        <div style={statusStyle} data-validation-errors={validationErrors.length}>
          {validationErrors.length === 0 ? "Strict model ready" : `${validationErrors.length} model errors`}
        </div>
      </header>
      <section style={bodyStyle}>
        <div style={canvasStyle} data-artifact-node-count={parsed.doc.nodes.length}>
          <GraphCanvas
            doc={parsed.doc}
            selection={selection}
            onSelect={setSelection}
            onMoveNode={() => {}}
            onCreateEdge={() => {}}
            rankdir="LR"
            fitSignal={1}
            engine="dagre"
          />
        </div>
        <aside style={asideStyle}>
          <div style={asideLabelStyle}>READ-ONLY SNAPSHOT</div>
          {selectedNode ? (
            <>
              <div style={nodeTypeStyle}>{selectedNode.type}</div>
              <h2 style={nodeTitleStyle}>{selectedNode.title}</h2>
              <p style={bodyCopyStyle}>{selectedNode.description || "暂无描述"}</p>
              <dl style={metaGridStyle}>
                <dt style={dtStyle}>ID</dt><dd style={ddStyle}>{selectedNode.id}</dd>
                <dt style={dtStyle}>状态</dt><dd style={ddStyle}>{selectedNode.status}</dd>
                <dt style={dtStyle}>来源</dt><dd style={ddStyle}>{selectedNode.source || "—"}</dd>
              </dl>
            </>
          ) : (
            <p style={bodyCopyStyle}>点击任一节点查看 fixture 中的协议字段。此入口不加载 storage、Tauri 或 MCP。</p>
          )}
          <div style={proofStyle}>
            <strong>{parsed.doc.nodes.length}</strong> nodes · <strong>{parsed.doc.edges.length}</strong> edges
            <br />
            <span>{parsed.doc.schema_version}</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

const shellStyle = { width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f7f8fa" };
const headerStyle = { minHeight: 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "14px 22px", background: "#fff", borderBottom: "1px solid #e7e9ee" };
const eyebrowStyle = { color: "#667085", fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em" };
const titleStyle = { margin: "5px 0 0", fontSize: 19, lineHeight: 1.2, fontWeight: 700 };
const statusStyle = { border: "1px solid #b7ead2", borderRadius: 999, padding: "6px 10px", color: "#067647", background: "#ecfdf3", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" };
const bodyStyle = { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 290px", gap: 0 };
const canvasStyle = { position: "relative", minWidth: 0, minHeight: 0, background: "#fbfcfd" };
const asideStyle = { padding: 20, background: "#fff", borderLeft: "1px solid #e7e9ee", overflow: "auto" };
const asideLabelStyle = { color: "#98a2b3", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", marginBottom: 18 };
const nodeTypeStyle = { color: "#475467", fontSize: 11, fontWeight: 700, marginBottom: 6 };
const nodeTitleStyle = { margin: 0, color: "#1d2433", fontSize: 18, lineHeight: 1.35 };
const bodyCopyStyle = { color: "#667085", fontSize: 13, lineHeight: 1.7 };
const metaGridStyle = { display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: "8px 10px", marginTop: 20, fontSize: 11.5 };
const dtStyle = { color: "#98a2b3" };
const ddStyle = { margin: 0, color: "#344054", fontFamily: "var(--mono)", overflowWrap: "anywhere" };
const proofStyle = { marginTop: 28, paddingTop: 16, borderTop: "1px solid #eef0f3", color: "#667085", fontSize: 11.5, lineHeight: 1.8, fontFamily: "var(--mono)" };
const errorStyle = { margin: 32, padding: 20, border: "1px solid #fda29b", borderRadius: 12, color: "#b42318", background: "#fff" };

createRoot(document.getElementById("root")).render(<ArtifactSpike />);
