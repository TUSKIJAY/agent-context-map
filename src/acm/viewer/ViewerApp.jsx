import React, { useMemo, useState } from "react";
import fixtureText from "../../../skills/acm-md/examples/valid-basic.acm.md?raw";
import { GraphCanvas } from "../FlowCanvas.jsx";
import {
  NODE_TYPES,
  NODE_TYPE_META,
  RELATION_META,
  STATUS_META,
  parseAcmMd,
  typeLabel,
  validateDoc,
} from "../data.js";

export function ViewerApp({ surface = "app", appAction = null }) {
  const parsed = useMemo(() => parseAcmMd(fixtureText), []);
  const [selection, setSelection] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [fitSignal, setFitSignal] = useState(1);
  const [copied, setCopied] = useState(false);
  const canonicalSnapshot = useMemo(() => (parsed.doc ? JSON.stringify(parsed.doc) : ""), [parsed.doc]);

  if (!parsed.doc) {
    return (
      <main data-viewer-state="error" style={errorStyle}>
        <strong>Artifact fixture 解析失败</strong>
        <span>{parsed.errors.join("；")}</span>
      </main>
    );
  }

  const doc = parsed.doc;
  const validation = validateDoc(doc);
  const validationErrors = validation.filter((issue) => issue.level === "error");
  const canonicalStable = JSON.stringify(doc) === canonicalSnapshot;
  const selectedNode = selection?.kind === "node"
    ? doc.nodes.find((node) => node.id === selection.id) || null
    : null;
  const selectedEdge = selection?.kind === "edge"
    ? doc.edges.find((edge) => edge.id === selection.id) || null
    : null;
  const counts = countTypes(doc.nodes);
  const visibleTypes = NODE_TYPES.filter((type) => counts[type] > 0);

  const copyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main
      data-viewer-state="ready"
      data-viewer-surface={surface}
      data-editor-entry={appAction ? "explicit" : "none"}
      data-canonical-stable={canonicalStable ? "true" : "false"}
      data-validation-errors={validationErrors.length}
      style={shellStyle}
    >
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>VISUAL SPEC ARTIFACT · READ-ONLY VIEWER</div>
          <h1 style={titleStyle}>{doc.meta.title}</h1>
        </div>
        <div style={headerActionsStyle}>
          <span style={readonlyBadgeStyle}>只读</span>
          <span style={validationErrors.length ? errorBadgeStyle : validBadgeStyle}>
            {validationErrors.length ? `${validationErrors.length} errors` : "ACM-MD v0.1 valid"}
          </span>
          <button type="button" style={secondaryButtonStyle} onClick={() => setFitSignal((value) => value + 1)}>
            适配画布
          </button>
          {appAction}
        </div>
      </header>

      <section style={bodyStyle}>
        <aside style={legendStyle} aria-label="节点类型图例与筛选">
          <div style={sectionLabelStyle}>类型图例</div>
          <button
            type="button"
            data-filter-type="all"
            aria-pressed={typeFilter == null}
            style={filterButton(typeFilter == null, "#344054")}
            onClick={() => setTypeFilter(null)}
          >
            <span style={allTypesDotStyle}>◇</span>
            <span style={{ flex: 1, textAlign: "left" }}>全部类型</span>
            <span style={countStyle}>{doc.nodes.length}</span>
          </button>
          {visibleTypes.map((type) => {
            const meta = NODE_TYPE_META[type] || { c: "#667085", glyph: "●" };
            const active = typeFilter === type;
            return (
              <button
                type="button"
                key={type}
                data-filter-type={type}
                aria-pressed={active}
                style={filterButton(active, meta.c)}
                onClick={() => setTypeFilter((current) => (current === type ? null : type))}
              >
                <span style={typeDotStyle(meta.c)}>{meta.glyph}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{typeLabel(type)}</span>
                <span style={countStyle}>{counts[type]}</span>
              </button>
            );
          })}
          <div style={legendNoteStyle}>
            筛选、选择、缩放与折叠只改变视图状态，不写回 ACM-MD。
          </div>
          <div style={sourceCardStyle}>
            <div style={sourceLabelStyle}>BUILD-TIME SPEC</div>
            <strong style={{ fontSize: 12 }}>{doc.doc_id}</strong>
            <span>{doc.nodes.length} nodes · {doc.edges.length} edges</span>
            <span>{doc.schema_version}</span>
          </div>
        </aside>

        <div style={canvasStyle} data-viewer-node-count={doc.nodes.length}>
          <GraphCanvas
            readOnly
            doc={doc}
            selection={selection}
            onSelect={(next) => { setSelection(next); setCopied(false); }}
            rankdir="LR"
            fitSignal={fitSignal}
            typeFilter={typeFilter}
            engine="dagre"
          />
        </div>

        <aside style={inspectorStyle} aria-label="只读 Inspector">
          <div style={sectionLabelStyle}>只读 Inspector</div>
          {selectedNode ? (
            <NodeInspector node={selectedNode} doc={doc} copied={copied} onCopy={copyId} />
          ) : selectedEdge ? (
            <EdgeInspector edge={selectedEdge} doc={doc} />
          ) : (
            <div style={emptyStyle}>
              <span style={{ fontSize: 28, color: "#d0d5dd" }}>◎</span>
              <strong>选择一个节点</strong>
              <span>查看标题、类型、状态、描述、来源、置信度与上下游关系。</span>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function NodeInspector({ node, doc, copied, onCopy }) {
  const meta = NODE_TYPE_META[node.type] || { c: "#667085", glyph: "●" };
  const status = STATUS_META[node.status] || { dot: "#98a2b3", label: node.status };
  const incoming = doc.edges.filter((edge) => edge.to === node.id);
  const outgoing = doc.edges.filter((edge) => edge.from === node.id);
  return (
    <div data-inspector-kind="node" data-inspector-id={node.id}>
      <span style={typePillStyle(meta.c)}>{meta.glyph} {typeLabel(node.type)}</span>
      <h2 style={nodeTitleStyle}>{node.title}</h2>
      <div style={statusRowStyle}>
        <span style={{ ...statusDotStyle, background: status.dot }} />
        <span>{status.label}</span>
        {node.priority && <span style={priorityStyle}>{node.priority}</span>}
      </div>
      <p style={descriptionStyle}>{node.description || "暂无描述"}</p>
      <div style={fieldListStyle}>
        <Field label="来源" value={node.source || "—"} />
        <Field label="置信度" value={node.confidence == null ? "—" : Number(node.confidence).toFixed(2)} />
        <Field label="标签" value={Array.isArray(node.tags) && node.tags.length ? node.tags.join(" · ") : "—"} />
      </div>
      <div style={idCardStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={sourceLabelStyle}>STABLE ID</div>
          <code style={idStyle}>{node.id}</code>
        </div>
        <button type="button" style={copyButtonStyle} onClick={() => onCopy(node.id)}>{copied ? "已复制" : "复制 ID"}</button>
      </div>
      <RelationList title={`上游 ${incoming.length}`} edges={incoming} doc={doc} direction="incoming" />
      <RelationList title={`下游 ${outgoing.length}`} edges={outgoing} doc={doc} direction="outgoing" />
    </div>
  );
}

function EdgeInspector({ edge, doc }) {
  const relation = RELATION_META[edge.type] || { c: "#667085", label: edge.type };
  const from = doc.nodes.find((node) => node.id === edge.from);
  const to = doc.nodes.find((node) => node.id === edge.to);
  return (
    <div data-inspector-kind="edge" data-inspector-id={edge.id}>
      <span style={typePillStyle(relation.c)}>{relation.label}</span>
      <h2 style={nodeTitleStyle}>{from?.title || edge.from} → {to?.title || edge.to}</h2>
      <div style={fieldListStyle}>
        <Field label="关系 ID" value={edge.id} />
        <Field label="状态" value={edge.status || "confirmed"} />
        <Field label="来源" value={edge.source || "—"} />
        <Field label="置信度" value={edge.confidence == null ? "—" : Number(edge.confidence).toFixed(2)} />
      </div>
    </div>
  );
}

function RelationList({ title, edges, doc, direction }) {
  return (
    <section style={relationSectionStyle}>
      <div style={relationTitleStyle}>{title}</div>
      {edges.length === 0 ? <span style={mutedStyle}>无</span> : edges.map((edge) => {
        const otherId = direction === "incoming" ? edge.from : edge.to;
        const other = doc.nodes.find((node) => node.id === otherId);
        const relation = RELATION_META[edge.type] || { c: "#667085", label: edge.type };
        return (
          <div key={edge.id} style={relationRowStyle}>
            <span style={{ color: relation.c, fontWeight: 700 }}>{relation.label}</span>
            <span style={{ color: "#344054" }}>{other?.title || otherId}</span>
          </div>
        );
      })}
    </section>
  );
}

function Field({ label, value }) {
  return <div style={fieldRowStyle}><span style={fieldLabelStyle}>{label}</span><span style={fieldValueStyle}>{value}</span></div>;
}

function countTypes(nodes) {
  const counts = {};
  for (const node of nodes) counts[node.type] = (counts[node.type] || 0) + 1;
  return counts;
}

const systemSans = 'system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif';
const systemMono = 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
const shellStyle = { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#f7f8fa", color: "#1d2433", fontFamily: systemSans };
const headerStyle = { minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "13px 20px", background: "#fff", borderBottom: "1px solid #e7e9ee" };
const headerActionsStyle = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const eyebrowStyle = { color: "#667085", fontSize: 10.5, fontWeight: 800, letterSpacing: ".12em" };
const titleStyle = { margin: "5px 0 0", fontSize: 19, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const readonlyBadgeStyle = { padding: "5px 9px", borderRadius: 999, color: "#344054", background: "#f2f4f7", border: "1px solid #e4e7ec", fontSize: 11, fontWeight: 800 };
const validBadgeStyle = { ...readonlyBadgeStyle, color: "#067647", background: "#ecfdf3", borderColor: "#abefc6" };
const errorBadgeStyle = { ...readonlyBadgeStyle, color: "#b42318", background: "#fef3f2", borderColor: "#fecdca" };
const secondaryButtonStyle = { border: "1px solid #d0d5dd", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#344054", fontSize: 11.5, fontWeight: 700, cursor: "pointer" };
const bodyStyle = { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "220px minmax(0, 1fr) 310px" };
const legendStyle = { padding: 16, background: "#fff", borderRight: "1px solid #e7e9ee", overflow: "auto" };
const inspectorStyle = { padding: 18, background: "#fff", borderLeft: "1px solid #e7e9ee", overflow: "auto" };
const canvasStyle = { position: "relative", minWidth: 0, minHeight: 0, background: "#fbfcfd" };
const sectionLabelStyle = { marginBottom: 12, color: "#98a2b3", fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" };
const filterButton = (active, color) => ({ width: "100%", display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 9px", borderRadius: 8, border: `1px solid ${active ? `${color}66` : "transparent"}`, background: active ? `color-mix(in oklch, ${color} 7%, white)` : "transparent", color: "#344054", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: systemSans });
const typeDotStyle = (color) => ({ width: 20, height: 20, display: "grid", placeItems: "center", borderRadius: 6, background: color, color: "#fff", fontSize: 11, fontFamily: systemMono });
const allTypesDotStyle = { ...typeDotStyle("#344054"), background: "#f2f4f7", color: "#475467" };
const countStyle = { color: "#98a2b3", fontFamily: systemMono, fontSize: 10.5 };
const legendNoteStyle = { marginTop: 16, paddingTop: 14, borderTop: "1px solid #eef0f3", color: "#667085", fontSize: 11, lineHeight: 1.6 };
const sourceCardStyle = { display: "flex", flexDirection: "column", gap: 5, marginTop: 18, padding: 12, borderRadius: 10, background: "#f8fafc", color: "#667085", fontFamily: systemMono, fontSize: 10.5, overflowWrap: "anywhere" };
const sourceLabelStyle = { color: "#98a2b3", fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", fontFamily: systemSans };
const emptyStyle = { minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#667085", textAlign: "center", fontSize: 12, lineHeight: 1.55 };
const typePillStyle = (color) => ({ display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 999, color, background: `color-mix(in oklch, ${color} 8%, white)`, border: `1px solid color-mix(in oklch, ${color} 25%, white)`, fontSize: 10.5, fontWeight: 800 });
const nodeTitleStyle = { margin: "10px 0 8px", color: "#1d2433", fontSize: 18, lineHeight: 1.35 };
const statusRowStyle = { display: "flex", alignItems: "center", gap: 7, color: "#667085", fontSize: 11.5 };
const statusDotStyle = { width: 8, height: 8, borderRadius: 999 };
const priorityStyle = { marginLeft: "auto", padding: "2px 6px", borderRadius: 5, color: "#475467", background: "#f2f4f7", fontFamily: systemMono, fontWeight: 800 };
const descriptionStyle = { margin: "18px 0", color: "#475467", fontSize: 12.5, lineHeight: 1.7 };
const fieldListStyle = { display: "grid", gap: 8, padding: "12px 0", borderTop: "1px solid #eef0f3", borderBottom: "1px solid #eef0f3" };
const fieldRowStyle = { display: "grid", gridTemplateColumns: "68px minmax(0,1fr)", gap: 10, fontSize: 11.5 };
const fieldLabelStyle = { color: "#98a2b3" };
const fieldValueStyle = { color: "#344054", fontFamily: systemMono, overflowWrap: "anywhere" };
const idCardStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, padding: 10, borderRadius: 9, background: "#f8fafc" };
const idStyle = { display: "block", marginTop: 3, color: "#344054", fontFamily: systemMono, fontSize: 10.5, overflowWrap: "anywhere" };
const copyButtonStyle = { flex: "0 0 auto", border: "1px solid #d0d5dd", borderRadius: 7, padding: "5px 8px", background: "#fff", color: "#344054", fontSize: 10.5, fontWeight: 700, cursor: "pointer" };
const relationSectionStyle = { marginTop: 18 };
const relationTitleStyle = { marginBottom: 8, color: "#667085", fontSize: 11, fontWeight: 800 };
const relationRowStyle = { display: "grid", gridTemplateColumns: "76px minmax(0,1fr)", gap: 8, marginBottom: 6, padding: "7px 8px", borderRadius: 7, background: "#f8fafc", fontSize: 10.5 };
const mutedStyle = { color: "#98a2b3", fontSize: 11 };
const errorStyle = { minHeight: "100vh", display: "flex", flexDirection: "column", gap: 8, padding: 28, color: "#b42318", background: "#fff", fontFamily: systemSans };
