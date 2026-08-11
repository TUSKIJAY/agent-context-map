import React, { useEffect, useMemo, useState } from "react";
import { GraphCanvas } from "../FlowCanvas.jsx";
import {
  NODE_STATUSES,
  NODE_TYPES,
  NODE_TYPE_META,
  RELATION_META,
  STATUS_META,
  collapseToDepth,
  computeHidden,
  containsChildren,
  layoutGraph,
  parseAcmMd,
  typeLabel,
  validateDoc,
} from "../data.js";
import {
  VIEW_IDS,
  VIEW_META,
  filterProjection,
  parseViewerHash,
  project,
  searchNodes,
  serializeViewerHash,
} from "../project.js";

export function ViewerApp({ surface = "app", appAction = null, specText = null, artifactMetadata = null }) {
  const parsed = useMemo(() => (
    typeof specText === "string" && specText.trim()
      ? parseAcmMd(specText)
      : { doc: null, errors: ["Artifact 构建未注入 ACM-MD Spec。"] }
  ), [specText]);
  const initialHash = useMemo(() => parseViewerHash(typeof window === "undefined" ? "" : window.location.hash), []);
  const [viewId, setViewId] = useState(initialHash.viewId);
  const [selection, setSelection] = useState(initialHash.nodeId ? { kind: "node", id: initialHash.nodeId } : null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusDepth, setFocusDepth] = useState(1);
  const [auxiliaryByView, setAuxiliaryByView] = useState({ structure: false, dependency: true, inquiry: true });
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [fitSignal, setFitSignal] = useState(1);
  const [copied, setCopied] = useState(false);
  const doc = parsed.doc;
  const canonicalSnapshot = useMemo(() => (doc ? JSON.stringify(doc) : ""), [doc]);
  const nodeById = useMemo(() => new Map((doc?.nodes || []).map((node) => [node.id, node])), [doc]);
  const edgeById = useMemo(() => new Map((doc?.edges || []).map((edge) => [edge.id, edge])), [doc]);
  const baseProjection = useMemo(() => project(doc, viewId, {
    showAuxiliary: auxiliaryByView[viewId],
  }), [doc, viewId, auxiliaryByView]);
  const filteredProjection = useMemo(() => filterProjection(doc, baseProjection, {
    type: typeFilter,
    status: statusFilter,
  }), [doc, baseProjection, typeFilter, statusFilter]);
  const viewDoc = useMemo(() => buildViewDoc(doc, filteredProjection), [doc, filteredProjection]);
  const projectionNodeSet = useMemo(() => new Set(filteredProjection.nodeIds), [filteredProjection.nodeIds]);
  const children = useMemo(() => containsChildren(viewDoc), [viewDoc]);
  const hasChildren = useMemo(() => new Set(
    [...children].filter(([, ids]) => ids.length > 0).map(([id]) => id),
  ), [children]);
  const collapseState = useMemo(() => computeHidden(viewDoc, collapsed), [viewDoc, collapsed]);
  const searchResultIds = useMemo(() => searchNodes(doc, searchQuery).slice(0, 8), [doc, searchQuery]);
  const viewCounts = useMemo(() => Object.fromEntries(
    VIEW_IDS.map((id) => [id, project(doc, id).nodeIds.length]),
  ), [doc]);

  useEffect(() => {
    if (!doc || typeof window === "undefined") return undefined;
    const applyHash = () => {
      const next = parseViewerHash(window.location.hash);
      setViewId(next.viewId);
      setSelection(next.nodeId && nodeById.has(next.nodeId) ? { kind: "node", id: next.nodeId } : null);
      setFitSignal((value) => value + 1);
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [doc, nodeById]);

  useEffect(() => {
    if (!doc || typeof window === "undefined") return;
    const nodeId = selection?.kind === "node" && nodeById.has(selection.id) ? selection.id : null;
    const nextHash = serializeViewerHash({ viewId, nodeId });
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${nextHash}`);
    }
  }, [doc, nodeById, selection, viewId]);

  useEffect(() => {
    if (selection?.kind === "node" && !nodeById.has(selection.id)) setSelection(null);
    if (selection?.kind === "edge" && !edgeById.has(selection.id)) setSelection(null);
  }, [edgeById, nodeById, selection]);

  useEffect(() => {
    setFitSignal((value) => value + 1);
  }, [viewId, typeFilter, statusFilter, auxiliaryByView]);

  if (!doc) {
    return (
      <main data-viewer-state="error" style={errorStyle}>
        <strong>Artifact fixture 解析失败</strong>
        <span>{parsed.errors.join("；")}</span>
      </main>
    );
  }

  const validation = validateDoc(doc);
  const validationErrors = validation.filter((issue) => issue.level === "error");
  const canonicalStable = JSON.stringify(doc) === canonicalSnapshot;
  const selectedNode = selection?.kind === "node" ? nodeById.get(selection.id) || null : null;
  const selectedEdge = selection?.kind === "edge" ? edgeById.get(selection.id) || null : null;
  const typeCounts = countBy(
    baseProjection.nodeIds.map((id) => nodeById.get(id)).filter(Boolean),
    "type",
  );
  const statusCounts = countBy(
    baseProjection.nodeIds.map((id) => nodeById.get(id)).filter(Boolean),
    "status",
  );
  const visibleTypes = NODE_TYPES.filter((type) => typeCounts[type] > 0);
  const visibleStatuses = NODE_STATUSES.filter((status) => statusCounts[status] > 0);
  const visibleNodeCount = Math.max(0, viewDoc.nodes.length - collapseState.hidden.size);
  const selectionVisible = selectedNode ? projectionNodeSet.has(selectedNode.id) && !collapseState.hidden.has(selectedNode.id) : true;

  const selectView = (nextViewId) => {
    setViewId(nextViewId);
    setCollapsed(new Set());
    setCopied(false);
  };

  const selectGraphItem = (next) => {
    setSelection(next);
    setCopied(false);
  };

  const navigateToNode = (id) => {
    if (!nodeById.has(id)) return;
    if (!project(doc, viewId, { showAuxiliary: auxiliaryByView[viewId] }).nodeIds.includes(id)) setViewId("structure");
    setTypeFilter(null);
    setStatusFilter(null);
    setCollapsed(new Set());
    setSelection({ kind: "node", id });
    setCopied(false);
    setFitSignal((value) => value + 1);
  };

  const toggleCollapsed = (id) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setFitSignal((value) => value + 1);
  };

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
      data-active-view={viewId}
      data-hash-node={selection?.kind === "node" ? selection.id : ""}
      data-artifact-doc-id={artifactMetadata?.doc_id || doc.doc_id}
      data-artifact-schema-version={artifactMetadata?.schema_version || doc.schema_version}
      data-artifact-generated-at={artifactMetadata?.generated_at || ""}
      data-artifact-spec-sha256={artifactMetadata?.source_spec_sha256 || ""}
      data-artifact-structure-sha256={artifactMetadata?.canonical_structure_sha256 || ""}
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

      <nav style={viewNavStyle} aria-label="语义视图">
        <div style={viewTabsStyle}>
          {VIEW_IDS.map((id) => {
            const active = viewId === id;
            return (
              <button
                type="button"
                key={id}
                data-view-id={id}
                aria-pressed={active}
                style={viewTabStyle(active)}
                onClick={() => selectView(id)}
              >
                <span>{VIEW_META[id].label}</span>
                <span style={viewEnglishStyle}>{VIEW_META[id].short}</span>
                <span style={viewCountStyle}>{viewCounts[id]}</span>
              </button>
            );
          })}
        </div>
        <span style={viewDescriptionStyle}>{VIEW_META[viewId].description}</span>
        {viewId !== "inquiry" && (
          <button
            type="button"
            data-auxiliary-toggle={viewId}
            aria-pressed={auxiliaryByView[viewId]}
            style={auxiliaryToggleStyle(auxiliaryByView[viewId])}
            onClick={() => setAuxiliaryByView((current) => ({ ...current, [viewId]: !current[viewId] }))}
          >
            {viewId === "structure" ? "辅助关系" : "impacts 辅助层"}
          </button>
        )}
        <div style={focusControlStyle} aria-label="关联聚焦层数">
          <span style={miniLabelStyle}>关联聚焦</span>
          {[0, 1, 2].map((depth) => (
            <button
              type="button"
              key={depth}
              data-focus-depth={depth}
              aria-pressed={focusDepth === depth}
              style={miniToggleStyle(focusDepth === depth)}
              onClick={() => setFocusDepth(depth)}
            >
              {depth === 0 ? "全图" : `${depth} 层`}
            </button>
          ))}
        </div>
      </nav>

      <section style={bodyStyle}>
        <aside style={legendStyle} aria-label="搜索、图例与筛选">
          <div style={sectionLabelStyle}>搜索节点</div>
          <input
            type="search"
            data-search-input
            value={searchQuery}
            placeholder="标题 / ID / 标签"
            style={searchInputStyle}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResultIds[0]) navigateToNode(searchResultIds[0]);
            }}
          />
          {searchQuery.trim() && (
            <div data-search-result-count={searchResultIds.length} style={searchResultsStyle}>
              {searchResultIds.length ? searchResultIds.map((id) => {
                const node = nodeById.get(id);
                return (
                  <button type="button" key={id} data-search-result={id} style={searchResultStyle} onClick={() => navigateToNode(id)}>
                    <span style={{ color: NODE_TYPE_META[node.type]?.c || "#667085" }}>{NODE_TYPE_META[node.type]?.glyph || "●"}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={searchTitleStyle}>{node.title}</strong>
                      <code style={searchIdStyle}>{node.id}</code>
                    </span>
                  </button>
                );
              }) : <span style={noResultStyle}>没有匹配节点</span>}
            </div>
          )}

          <div style={subsectionLabelStyle}>类型筛选</div>
          <button
            type="button"
            data-filter-type="all"
            aria-pressed={typeFilter == null}
            style={filterButton(typeFilter == null, "#344054")}
            onClick={() => setTypeFilter(null)}
          >
            <span style={allTypesDotStyle}>◇</span>
            <span style={{ flex: 1, textAlign: "left" }}>全部类型</span>
            <span style={countStyle}>{baseProjection.nodeIds.length}</span>
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
                <span style={countStyle}>{typeCounts[type]}</span>
              </button>
            );
          })}

          <div style={subsectionLabelStyle}>状态筛选</div>
          <button
            type="button"
            data-filter-status="all"
            aria-pressed={statusFilter == null}
            style={statusButtonStyle(statusFilter == null, "#344054")}
            onClick={() => setStatusFilter(null)}
          >
            <span style={{ ...statusDotStyle, background: "#98a2b3" }} />
            <span style={{ flex: 1, textAlign: "left" }}>全部状态</span>
          </button>
          {visibleStatuses.map((status) => {
            const meta = STATUS_META[status] || { dot: "#98a2b3", label: status };
            const active = statusFilter === status;
            return (
              <button
                type="button"
                key={status}
                data-filter-status={status}
                aria-pressed={active}
                style={statusButtonStyle(active, meta.dot)}
                onClick={() => setStatusFilter((current) => (current === status ? null : status))}
              >
                <span style={{ ...statusDotStyle, background: meta.dot }} />
                <span style={{ flex: 1, textAlign: "left" }}>{meta.label}</span>
                <span style={countStyle}>{statusCounts[status]}</span>
              </button>
            );
          })}

          {viewId === "structure" && (
            <div style={collapseActionsStyle}>
              <button
                type="button"
                data-collapse-action="depth-1"
                style={smallActionStyle}
                onClick={() => { setCollapsed(collapseToDepth(viewDoc, 1)); setFitSignal((value) => value + 1); }}
              >
                折叠至 1 层
              </button>
              <button
                type="button"
                data-collapse-action="expand-all"
                style={smallActionStyle}
                onClick={() => { setCollapsed(new Set()); setFitSignal((value) => value + 1); }}
              >
                全部展开
              </button>
            </div>
          )}

          <div style={legendNoteStyle}>
            投影、筛选、搜索、聚焦、折叠与 hash 都是派生视图状态，不写回 ACM-MD。
          </div>
          <div style={sourceCardStyle}>
            <div style={sourceLabelStyle}>BUILD-TIME SPEC</div>
            <strong style={{ fontSize: 12 }}>{doc.doc_id}</strong>
            <span>{doc.nodes.length} canonical nodes · {doc.edges.length} edges</span>
            <span>{doc.schema_version}</span>
            {artifactMetadata?.generated_at && <span>generated {artifactMetadata.generated_at}</span>}
            {artifactMetadata?.source_spec_sha256 && <span title={artifactMetadata.source_spec_sha256}>spec {artifactMetadata.source_spec_sha256.slice(0, 12)}</span>}
          </div>
        </aside>

        <div
          style={canvasStyle}
          data-projection-node-count={baseProjection.nodeIds.length}
          data-projection-edge-count={baseProjection.edgeIds.length}
          data-filtered-node-count={viewDoc.nodes.length}
          data-visible-node-count={visibleNodeCount}
        >
          <GraphCanvas
            readOnly
            doc={viewDoc}
            selection={selection}
            onSelect={selectGraphItem}
            rankdir="LR"
            fitSignal={fitSignal}
            engine="dagre"
            focusDepth={focusDepth}
            auxiliaryEdgeIds={filteredProjection.options.auxiliaryEdgeIds}
            hidden={collapseState.hidden}
            collapsed={collapsed}
            descCount={collapseState.descCount}
            hasChildren={hasChildren}
            onToggleCollapse={toggleCollapsed}
          />
          {viewDoc.nodes.length === 0 && (
            <div data-viewer-empty style={canvasEmptyStyle}>
              <strong>当前视图没有可显示节点</strong>
              <span>清除筛选，或切换到 Structure 查看完整 Spec。</span>
            </div>
          )}
        </div>

        <aside style={inspectorStyle} aria-label="只读 Inspector">
          <div style={sectionLabelStyle}>只读 Inspector</div>
          {!selectionVisible && selectedNode && (
            <button type="button" style={outsideViewStyle} onClick={() => navigateToNode(selectedNode.id)}>
              此节点不在当前投影或筛选中 · 在 Structure 定位
            </button>
          )}
          {selectedNode ? (
            <NodeInspector node={selectedNode} doc={doc} copied={copied} onCopy={copyId} onNavigate={navigateToNode} />
          ) : selectedEdge ? (
            <EdgeInspector edge={selectedEdge} doc={doc} onNavigate={navigateToNode} />
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

function NodeInspector({ node, doc, copied, onCopy, onNavigate }) {
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
        {node.notes && <Field label="备注" value={node.notes} />}
      </div>
      <div style={idCardStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={sourceLabelStyle}>STABLE ID</div>
          <code style={idStyle}>{node.id}</code>
        </div>
        <button type="button" style={copyButtonStyle} onClick={() => onCopy(node.id)}>{copied ? "已复制" : "复制 ID"}</button>
      </div>
      <RelationList title={`上游 ${incoming.length}`} edges={incoming} doc={doc} direction="incoming" onNavigate={onNavigate} />
      <RelationList title={`下游 ${outgoing.length}`} edges={outgoing} doc={doc} direction="outgoing" onNavigate={onNavigate} />
    </div>
  );
}

function EdgeInspector({ edge, doc, onNavigate }) {
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
        {edge.reason && <Field label="原因" value={edge.reason} />}
      </div>
      <div style={edgeEndpointsStyle}>
        <button type="button" style={endpointButtonStyle} onClick={() => onNavigate(edge.from)}>← {from?.title || edge.from}</button>
        <button type="button" style={endpointButtonStyle} onClick={() => onNavigate(edge.to)}>{to?.title || edge.to} →</button>
      </div>
    </div>
  );
}

function RelationList({ title, edges, doc, direction, onNavigate }) {
  return (
    <section style={relationSectionStyle}>
      <div style={relationTitleStyle}>{title}</div>
      {edges.length === 0 ? <span style={mutedStyle}>无</span> : edges.map((edge) => {
        const otherId = direction === "incoming" ? edge.from : edge.to;
        const other = doc.nodes.find((node) => node.id === otherId);
        const relation = RELATION_META[edge.type] || { c: "#667085", label: edge.type };
        return (
          <button type="button" key={edge.id} style={relationRowStyle} onClick={() => onNavigate(otherId)}>
            <span style={{ color: relation.c, fontWeight: 700 }}>{relation.label}</span>
            <span style={{ color: "#344054", textAlign: "left" }}>{other?.title || otherId}</span>
          </button>
        );
      })}
    </section>
  );
}

function Field({ label, value }) {
  return <div style={fieldRowStyle}><span style={fieldLabelStyle}>{label}</span><span style={fieldValueStyle}>{value}</span></div>;
}

function buildViewDoc(doc, projection) {
  if (!doc) return { doc_id: "viewer-empty", meta: {}, nodes: [], edges: [] };
  const nodeIds = new Set(projection.nodeIds);
  const edgeIds = new Set(projection.edgeIds);
  const layoutEdgeIds = new Set(projection.options.layoutEdgeIds);
  const sourceNodes = doc.nodes.filter((node) => nodeIds.has(node.id));
  const sourceEdges = doc.edges.filter((edge) => (
    edgeIds.has(edge.id) && nodeIds.has(edge.from) && nodeIds.has(edge.to)
  ));
  const positions = layoutGraph({
    nodes: sourceNodes,
    edges: sourceEdges.filter((edge) => layoutEdgeIds.has(edge.id)),
  }, { rankdir: "LR" });
  const nodes = sourceNodes.map((node) => {
    const position = positions[node.id];
    return position ? { ...node, x: position.x, y: position.y } : { ...node };
  });
  return { ...doc, nodes, edges: sourceEdges };
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] || 0) + 1;
  return counts;
}

const systemSans = 'system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif';
const systemMono = 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
const shellStyle = { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#f7f8fa", color: "#1d2433", fontFamily: systemSans };
const headerStyle = { minHeight: 70, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "11px 18px", background: "#fff", borderBottom: "1px solid #e7e9ee" };
const headerActionsStyle = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" };
const eyebrowStyle = { color: "#667085", fontSize: 10.5, fontWeight: 800, letterSpacing: ".12em" };
const titleStyle = { margin: "4px 0 0", fontSize: 19, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const readonlyBadgeStyle = { padding: "5px 9px", borderRadius: 999, color: "#344054", background: "#f2f4f7", border: "1px solid #e4e7ec", fontSize: 11, fontWeight: 800 };
const validBadgeStyle = { ...readonlyBadgeStyle, color: "#067647", background: "#ecfdf3", borderColor: "#abefc6" };
const errorBadgeStyle = { ...readonlyBadgeStyle, color: "#b42318", background: "#fef3f2", borderColor: "#fecdca" };
const secondaryButtonStyle = { border: "1px solid #d0d5dd", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#344054", fontSize: 11.5, fontWeight: 700, cursor: "pointer" };
const viewNavStyle = { minHeight: 52, display: "flex", alignItems: "center", gap: 14, padding: "7px 16px", background: "#fff", borderBottom: "1px solid #e7e9ee" };
const viewTabsStyle = { display: "flex", alignItems: "center", gap: 5, padding: 3, borderRadius: 10, background: "#f2f4f7" };
const viewTabStyle = (active) => ({ display: "flex", alignItems: "center", gap: 6, border: active ? "1px solid #d0d5dd" : "1px solid transparent", borderRadius: 8, padding: "7px 9px", background: active ? "#fff" : "transparent", color: active ? "#1d2939" : "#667085", boxShadow: active ? "0 1px 3px rgba(16,24,40,.08)" : "none", cursor: "pointer", fontSize: 11.5, fontWeight: 800, fontFamily: systemSans });
const viewEnglishStyle = { color: "#98a2b3", fontSize: 9.5, fontWeight: 600 };
const viewCountStyle = { minWidth: 18, padding: "1px 5px", borderRadius: 999, background: "#eef0f3", color: "#667085", fontFamily: systemMono, fontSize: 9.5 };
const viewDescriptionStyle = { flex: 1, minWidth: 120, color: "#667085", fontSize: 11 };
const auxiliaryToggleStyle = (active) => ({ border: `1px solid ${active ? "#fda29b" : "#d0d5dd"}`, borderRadius: 8, padding: "6px 8px", background: active ? "#fef3f2" : "#fff", color: active ? "#b42318" : "#667085", fontSize: 10.5, fontWeight: 700, cursor: "pointer" });
const focusControlStyle = { display: "flex", alignItems: "center", gap: 4 };
const miniLabelStyle = { marginRight: 3, color: "#98a2b3", fontSize: 10.5, fontWeight: 700 };
const miniToggleStyle = (active) => ({ border: `1px solid ${active ? "#98a2b3" : "#e4e7ec"}`, borderRadius: 7, padding: "5px 7px", background: active ? "#344054" : "#fff", color: active ? "#fff" : "#667085", fontSize: 10.5, fontWeight: 700, cursor: "pointer" });
const bodyStyle = { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "236px minmax(0, 1fr) 320px" };
const legendStyle = { padding: 15, background: "#fff", borderRight: "1px solid #e7e9ee", overflow: "auto" };
const inspectorStyle = { padding: 18, background: "#fff", borderLeft: "1px solid #e7e9ee", overflow: "auto" };
const canvasStyle = { position: "relative", minWidth: 0, minHeight: 0, background: "#fbfcfd" };
const canvasEmptyStyle = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, color: "#667085", background: "rgba(251,252,253,.88)", fontSize: 12, pointerEvents: "none" };
const sectionLabelStyle = { marginBottom: 10, color: "#98a2b3", fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" };
const subsectionLabelStyle = { margin: "17px 0 9px", paddingTop: 13, borderTop: "1px solid #eef0f3", color: "#98a2b3", fontSize: 10, fontWeight: 800, letterSpacing: ".08em" };
const searchInputStyle = { width: "100%", border: "1px solid #d0d5dd", borderRadius: 8, padding: "8px 9px", color: "#344054", outline: "none", fontFamily: systemSans, fontSize: 11.5 };
const searchResultsStyle = { display: "grid", gap: 4, marginTop: 6, padding: 5, border: "1px solid #e4e7ec", borderRadius: 9, background: "#fff" };
const searchResultStyle = { width: "100%", display: "grid", gridTemplateColumns: "18px minmax(0,1fr)", gap: 6, alignItems: "center", border: 0, borderRadius: 6, padding: "6px", background: "transparent", cursor: "pointer", fontFamily: systemSans };
const searchTitleStyle = { display: "block", overflow: "hidden", color: "#344054", textAlign: "left", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 };
const searchIdStyle = { display: "block", overflow: "hidden", color: "#98a2b3", textAlign: "left", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9 };
const noResultStyle = { padding: 8, color: "#98a2b3", fontSize: 10.5 };
const filterButton = (active, color) => ({ width: "100%", display: "flex", alignItems: "center", gap: 8, marginBottom: 4, padding: "7px 8px", borderRadius: 8, border: `1px solid ${active ? `${color}66` : "transparent"}`, background: active ? `color-mix(in oklch, ${color} 7%, white)` : "transparent", color: "#344054", cursor: "pointer", fontSize: 11.5, fontWeight: active ? 700 : 500, fontFamily: systemSans });
const statusButtonStyle = (active, color) => ({ ...filterButton(active, color), padding: "6px 8px" });
const typeDotStyle = (color) => ({ width: 19, height: 19, display: "grid", placeItems: "center", borderRadius: 6, background: color, color: "#fff", fontSize: 10, fontFamily: systemMono });
const allTypesDotStyle = { ...typeDotStyle("#344054"), background: "#f2f4f7", color: "#475467" };
const countStyle = { color: "#98a2b3", fontFamily: systemMono, fontSize: 10 };
const collapseActionsStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 14 };
const smallActionStyle = { border: "1px solid #d0d5dd", borderRadius: 7, padding: "6px", background: "#fff", color: "#475467", fontSize: 10.5, fontWeight: 700, cursor: "pointer" };
const legendNoteStyle = { marginTop: 15, paddingTop: 13, borderTop: "1px solid #eef0f3", color: "#667085", fontSize: 10.5, lineHeight: 1.6 };
const sourceCardStyle = { display: "flex", flexDirection: "column", gap: 5, marginTop: 16, padding: 11, borderRadius: 10, background: "#f8fafc", color: "#667085", fontFamily: systemMono, fontSize: 10, overflowWrap: "anywhere" };
const sourceLabelStyle = { color: "#98a2b3", fontSize: 9.5, fontWeight: 800, letterSpacing: ".08em", fontFamily: systemSans };
const emptyStyle = { minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#667085", textAlign: "center", fontSize: 12, lineHeight: 1.55 };
const outsideViewStyle = { width: "100%", marginBottom: 12, border: "1px solid #fedf89", borderRadius: 8, padding: "8px 9px", background: "#fffaeb", color: "#b54708", fontSize: 10.5, fontWeight: 700, cursor: "pointer" };
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
const relationRowStyle = { width: "100%", display: "grid", gridTemplateColumns: "76px minmax(0,1fr)", gap: 8, marginBottom: 6, padding: "7px 8px", border: 0, borderRadius: 7, background: "#f8fafc", fontFamily: systemSans, fontSize: 10.5, cursor: "pointer" };
const edgeEndpointsStyle = { display: "grid", gap: 6, marginTop: 14 };
const endpointButtonStyle = { border: "1px solid #e4e7ec", borderRadius: 7, padding: "7px 8px", background: "#fff", color: "#475467", textAlign: "left", fontSize: 10.5, cursor: "pointer" };
const mutedStyle = { color: "#98a2b3", fontSize: 11 };
const errorStyle = { minHeight: "100vh", display: "flex", flexDirection: "column", gap: 8, padding: 28, color: "#b42318", background: "#fff", fontFamily: systemSans };
