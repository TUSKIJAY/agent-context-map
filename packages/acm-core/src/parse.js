import { parse as parseYaml } from "yaml";
import { FORMAL_SCHEMA_VERSION } from "./schema.js";

const ACM_FENCE_RE = /```[ \t]*acm[^\r\n]*\r?\n([\s\S]*?)\r?\n```/g;

function gridPosition(nodes) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      node.x = 80 + (index % 4) * 240;
      node.y = 60 + Math.floor(index / 4) * 150;
    }
  }
}

export function extractAcmYaml(text, { mode = "strict" } = {}) {
  const errors = [];
  const warnings = [];
  if (!text || !text.trim()) return { yamlText: null, errors: ["文件为空"], warnings, blockCount: 0 };
  const blocks = [...text.matchAll(ACM_FENCE_RE)].map((match) => match[1]);
  if (mode === "strict") {
    if (blocks.length !== 1) {
      errors.push(`Strict mode requires exactly one \`\`\`acm fenced block; found ${blocks.length}.`);
      return { yamlText: null, errors, warnings, blockCount: blocks.length };
    }
    if (blocks[0].includes("```")) errors.push("YAML body contains a raw three-backtick Markdown fence delimiter.");
    return { yamlText: blocks[0], errors, warnings, blockCount: 1 };
  }
  if (blocks.length === 0) {
    warnings.push("未找到 ```acm 代码块，按整份 YAML 尝试解析");
    return { yamlText: text, errors, warnings, blockCount: 0 };
  }
  if (blocks.length > 1) warnings.push(`发现 ${blocks.length} 个 acm 代码块，仅使用第 1 个`);
  return { yamlText: blocks[0], errors, warnings, blockCount: blocks.length };
}

export function parseAcmMd(text, { mode = "strict", layoutDocument } = {}) {
  const extracted = extractAcmYaml(text, { mode });
  const errors = [...extracted.errors];
  const warnings = [...extracted.warnings];
  if (!extracted.yamlText || errors.length) return { doc: null, errors, warnings };

  let raw;
  try {
    raw = parseYaml(extracted.yamlText);
  } catch (error) {
    return { doc: null, errors: [`YAML 解析失败：${error?.message || error}`], warnings };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { doc: null, errors: ["acm 内容不是有效的图谱对象"], warnings };
  }

  const nodes = Array.isArray(raw.nodes) ? raw.nodes.map((node) => ({ ...node })) : [];
  const edges = Array.isArray(raw.edges) ? raw.edges.map((edge) => ({ ...edge })) : [];
  const layoutNodes = raw.layout && typeof raw.layout === "object" && raw.layout.nodes && typeof raw.layout.nodes === "object"
    ? raw.layout.nodes
    : {};
  let positioned = 0;
  for (const node of nodes) {
    const point = layoutNodes[node.id];
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      node.x = point.x;
      node.y = point.y;
      positioned += 1;
    } else if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      positioned += 1;
    }
  }
  if (positioned === 0 && nodes.length && typeof layoutDocument === "function") {
    const positions = layoutDocument({ nodes, edges }) || {};
    for (const node of nodes) {
      const point = positions[node.id];
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
        node.x = point.x;
        node.y = point.y;
      }
    }
    if (extracted.blockCount > 0) warnings.push("文件无 layout，已按图谱结构自动布局");
  }
  gridPosition(nodes);

  const doc = {
    schema_version: raw.schema_version || (mode === "strict" ? undefined : FORMAL_SCHEMA_VERSION),
    doc_id: raw.doc_id || (mode === "strict" ? undefined : "acm_import_preview"),
    meta: raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta) ? { ...raw.meta } : {},
    nodes,
    edges,
  };
  if (!doc.meta.title && mode !== "strict") doc.meta.title = "导入的图谱";
  if (raw.changes !== undefined) doc.changes = raw.changes;
  if (raw.validation !== undefined) doc.validation = raw.validation;
  if (raw.layout !== undefined) doc.layout = raw.layout;

  if (!Array.isArray(raw.nodes)) errors.push("缺少 nodes 数组");
  if (!Array.isArray(raw.edges)) {
    if (mode === "strict") errors.push("缺少 edges 数组");
    else warnings.push("缺少 edges，按空数组处理");
  }
  return { doc, errors, warnings };
}

export function parseAcmMdPreview(text, options = {}) {
  return parseAcmMd(text, { ...options, mode: "tolerant" });
}
