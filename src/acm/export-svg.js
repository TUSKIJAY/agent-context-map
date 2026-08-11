import { NODE_TYPE_META, RELATION_META, STATUS_META, typeLabel } from "./data.js";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeColor(value, fallback = "#667085") {
  return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? value : fallback;
}

function absolutePosition(node) {
  return node.positionAbsolute || node.position || { x: 0, y: 0 };
}

function dimensions(node) {
  return {
    width: Number(node.measured?.width || node.width || node.data?.width || 210),
    height: Number(node.measured?.height || node.height || node.data?.height || 92),
  };
}

function titleLines(value, maxCharacters = 16) {
  const text = String(value || "");
  if (text.length <= maxCharacters) return [text];
  const breakAt = text.lastIndexOf(" ", maxCharacters);
  const firstLength = breakAt > Math.floor(maxCharacters / 2) ? breakAt : maxCharacters;
  return [text.slice(0, firstLength).trim(), text.slice(firstLength).trim()].filter(Boolean).slice(0, 2);
}

function renderEdge(edge, nodeGeometry, edgeDoc, index, offset) {
  const source = nodeGeometry.get(edge.source);
  const target = nodeGeometry.get(edge.target);
  if (!source || !target) return "";
  const color = safeColor(edge.style?.stroke || RELATION_META[edgeDoc?.type]?.c, "#94a3b8");
  const opacity = Number.isFinite(Number(edge.style?.opacity)) ? Number(edge.style.opacity) : 0.9;
  const dash = edge.style?.strokeDasharray ? ` stroke-dasharray="${escapeXml(edge.style.strokeDasharray)}"` : "";
  const x1 = source.x + source.width - offset.x;
  const y1 = source.y + source.height / 2 - offset.y;
  const x2 = target.x - offset.x;
  const y2 = target.y + target.height / 2 - offset.y;
  const bend = Math.max(42, Math.abs(x2 - x1) * 0.45);
  const direction = x2 >= x1 ? 1 : -1;
  const path = `M ${x1} ${y1} C ${x1 + bend * direction} ${y1}, ${x2 - bend * direction} ${y2}, ${x2} ${y2}`;
  const markerId = `arrow-${index}`;
  const label = edge.label || RELATION_META[edgeDoc?.type]?.label || edgeDoc?.type || "";
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - 6;
  return `<defs><marker id="${markerId}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 8 4 L 0 8 z" fill="${color}"/></marker></defs><path d="${path}" fill="none" stroke="${color}" stroke-width="${edge.style?.strokeWidth || 1.5}" opacity="${opacity}"${dash} marker-end="url(#${markerId})"/><rect x="${labelX - 28}" y="${labelY - 10}" width="56" height="15" rx="4" fill="#ffffff" fill-opacity="0.92"/><text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${color}">${escapeXml(label)}</text>`;
}

function renderNode(node, canonical, geometry, offset) {
  const type = NODE_TYPE_META[canonical.type] || { c: "#667085", glyph: "●" };
  const status = STATUS_META[canonical.status] || { dot: "#98a2b3", label: canonical.status };
  const color = safeColor(type.c);
  const statusColor = safeColor(status.dot, "#98a2b3");
  const x = geometry.x - offset.x;
  const y = geometry.y - offset.y;
  const dimmed = node.data?.dimmed === true;
  const opacity = dimmed ? 0.22 : 1;
  const lines = titleLines(canonical.title);
  const lineElements = lines.map((line, index) => `<tspan x="${x + 14}" dy="${index === 0 ? 0 : 17}">${escapeXml(line)}</tspan>`).join("");
  const confidence = canonical.confidence == null ? "" : `conf ${Number(canonical.confidence).toFixed(2)}`;
  return `<g id="node-${escapeXml(canonical.id)}" opacity="${opacity}"><rect x="${x}" y="${y}" width="${geometry.width}" height="${geometry.height}" rx="12" fill="#ffffff" stroke="${color}" stroke-width="1.25"/><rect x="${x}" y="${y}" width="4" height="${geometry.height}" rx="2" fill="${color}"/><text x="${x + 14}" y="${y + 22}" font-size="10.5" font-weight="700" fill="${color}">${escapeXml(type.glyph)} ${escapeXml(typeLabel(canonical.type))}</text><circle cx="${x + geometry.width - 15}" cy="${y + 18}" r="4" fill="${statusColor}"/><text x="${x + 14}" y="${y + 49}" font-size="13.5" font-weight="600" fill="#1d2433">${lineElements}</text><text x="${x + 14}" y="${y + geometry.height - 12}" font-size="10" fill="#98a2b3">${escapeXml(confidence)}</text></g>`;
}

export function buildPortableSvg({ doc, nodes = [], edges = [], padding = 80 } = {}) {
  const canonicalNodes = new Map((doc?.nodes || []).map((node) => [node.id, node]));
  const canonicalEdges = new Map((doc?.edges || []).map((edge) => [edge.id, edge]));
  const renderNodes = nodes.filter((node) => canonicalNodes.has(node.id));
  if (!renderNodes.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" data-acm-export="portable-svg-v1"><rect width="640" height="360" fill="#ffffff"/><text x="320" y="180" text-anchor="middle" fill="#667085" font-family="system-ui, sans-serif" font-size="16">No visible graph nodes</text></svg>';
  }
  const geometry = new Map(renderNodes.map((node) => {
    const position = absolutePosition(node);
    return [node.id, { ...position, ...dimensions(node) }];
  }));
  const values = [...geometry.values()];
  const minX = Math.min(...values.map((item) => item.x));
  const minY = Math.min(...values.map((item) => item.y));
  const maxX = Math.max(...values.map((item) => item.x + item.width));
  const maxY = Math.max(...values.map((item) => item.y + item.height));
  const width = Math.ceil(maxX - minX + padding * 2);
  const height = Math.ceil(maxY - minY + padding * 2);
  const offset = { x: minX - padding, y: minY - padding };
  const edgeMarkup = edges.map((edge, index) => renderEdge(edge, geometry, canonicalEdges.get(edge.id), index, offset)).join("");
  const nodeMarkup = renderNodes.map((node) => renderNode(node, canonicalNodes.get(node.id), geometry.get(node.id), offset)).join("");
  const title = escapeXml(doc?.meta?.title || doc?.doc_id || "Agent Context Map");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-acm-export="portable-svg-v1"><title>${title}</title><rect width="${width}" height="${height}" fill="#ffffff"/><g font-family="system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, &quot;Microsoft YaHei&quot;, &quot;PingFang SC&quot;, sans-serif">${edgeMarkup}${nodeMarkup}</g></svg>`;
}
