#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { layoutGraph, validateDoc } from "../src/acm/data.js";
import { filterProjection, project, searchNodes } from "../src/acm/project.js";

const DEFAULT_CASES = [
  { nodes: 50, edges: 75 },
  { nodes: 100, edges: 150 },
  { nodes: 150, edges: 225 },
  { nodes: 250, edges: 375 },
];

export function createBenchmarkDoc(nodeCount, edgeCount = Math.round(nodeCount * 1.5)) {
  if (!Number.isInteger(nodeCount) || nodeCount < 8) throw new Error("Benchmark node count must be an integer >= 8");
  if (!Number.isInteger(edgeCount) || edgeCount < nodeCount - 1) throw new Error("Benchmark edge count must cover the structure tree");
  const moduleCount = Math.min(5, Math.max(2, Math.floor(nodeCount / 25)));
  const nodes = [{
    id: "goal_benchmark", type: "Goal", title: `验证 ${nodeCount} 节点图谱浏览`, status: "confirmed",
    description: "合成性能基线，不代表业务示例。", source: "phase_4_benchmark", confidence: 1, tags: ["benchmark"],
  }];
  for (let index = 0; index < moduleCount; index += 1) {
    nodes.push({
      id: `module_${index}`, type: "Module", title: `业务域 ${index + 1}`, status: "confirmed",
      description: "为性能基线提供稳定层级。", source: "phase_4_benchmark", confidence: 1, tags: ["benchmark"],
    });
  }
  for (let index = nodes.length; index < nodeCount; index += 1) {
    const ordinal = index - moduleCount;
    let type = "Feature";
    let status = "confirmed";
    if (ordinal % 31 === 0) { type = "Risk"; status = "needs_validation"; }
    else if (ordinal % 37 === 0) { type = "Question"; status = "needs_validation"; }
    nodes.push({
      id: `node_${index}`, type, title: `性能基线节点 ${index} · 中文长标题换行检查`, status,
      description: "用于测量投影、筛选、搜索与 dagre 布局，不写入产品协议。",
      source: "phase_4_benchmark", confidence: 0.9, tags: ["benchmark", `group-${index % moduleCount}`],
    });
  }

  const edges = [];
  for (let index = 0; index < moduleCount; index += 1) {
    edges.push(edge(`contains_module_${index}`, "goal_benchmark", `module_${index}`, "contains"));
  }
  for (let index = moduleCount + 1; index < nodes.length; index += 1) {
    edges.push(edge(`contains_node_${index}`, `module_${(index - moduleCount - 1) % moduleCount}`, nodes[index].id, "contains"));
  }
  const inquiryTarget = nodes.find((node) => node.type === "Feature");
  for (const node of nodes.filter((item) => item.type === "Risk" || item.type === "Question")) {
    if (edges.length >= edgeCount) break;
    edges.push(edge(
      `inquiry_${edges.length}`,
      node.id,
      inquiryTarget.id,
      node.type === "Risk" ? "impacts" : "needs_validation",
      "needs_validation",
    ));
  }
  let cursor = moduleCount + 1;
  while (edges.length < edgeCount) {
    const source = nodes[cursor];
    const target = nodes[moduleCount + 1 + ((cursor - moduleCount) % (nodes.length - moduleCount - 1))];
    const relation = source.type === "Risk" ? "impacts" : source.type === "Question" ? "needs_validation" : "depends_on";
    edges.push(edge(`dependency_${edges.length}`, source.id, target.id, relation, source.status));
    cursor += 1;
    if (cursor >= nodes.length) cursor = moduleCount + 1;
  }
  return {
    schema_version: "acm-md/0.1",
    doc_id: `viewer_performance_${nodeCount}_${edgeCount}`,
    meta: {
      title: `Viewer 性能基线 ${nodeCount} 节点 / ${edgeCount} 边`, created_by: "phase-4-benchmark",
      created_at: "2026-08-12", updated_at: "2026-08-12", purpose: "可重复的 Viewer 性能与浏览器规模验收。", source: "phase_4_benchmark",
    },
    nodes,
    edges,
    validation: { status: "valid", scenario: "synthetic_performance_baseline" },
  };
}

function edge(id, from, to, type, status = "confirmed") {
  return { id, from, to, type, status, reason: "性能基线关系。", source: "phase_4_benchmark", confidence: 1 };
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function measure(action, iterations) {
  const values = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    action();
    values.push(performance.now() - start);
  }
  return Number(median(values).toFixed(2));
}

function parseArguments(argv) {
  const result = { cases: DEFAULT_CASES, writeSpec: null };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!new Set(["--write-spec", "--nodes", "--edges"]).has(key)) throw new Error(`Unknown argument: ${key}`);
    if (value == null) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--write-spec") result.writeSpec = path.resolve(value);
    if (key === "--nodes") result.nodes = Number(value);
    if (key === "--edges") result.edges = Number(value);
  }
  if (result.nodes != null) result.cases = [{ nodes: result.nodes, edges: result.edges || Math.round(result.nodes * 1.5) }];
  return result;
}

const options = parseArguments(process.argv.slice(2));
const results = [];
for (const entry of options.cases) {
  const doc = createBenchmarkDoc(entry.nodes, entry.edges);
  const errors = validateDoc(doc).filter((issue) => issue.level === "error");
  assert.deepEqual(errors, []);
  const structure = project(doc, "structure");
  const dependency = project(doc, "dependency");
  const inquiry = project(doc, "inquiry");
  assert.equal(structure.nodeIds.length, entry.nodes);
  assert.equal(structure.edgeIds.length, entry.nodes - 1);
  const positions = layoutGraph(doc, { rankdir: "LR" });
  assert.equal(Object.keys(positions).length, entry.nodes);
  results.push({
    nodes: entry.nodes,
    edges: entry.edges,
    projection_ms: measure(() => { project(doc, "structure"); project(doc, "dependency"); project(doc, "inquiry"); }, 25),
    filter_search_ms: measure(() => { filterProjection(doc, structure, { status: "confirmed" }); searchNodes(doc, "中文长标题"); }, 25),
    dagre_layout_ms: measure(() => layoutGraph(doc, { rankdir: "LR" }), 5),
    views: { structure: structure.nodeIds.length, dependency: dependency.nodeIds.length, inquiry: inquiry.nodeIds.length },
  });
  if (options.writeSpec) {
    const markdown = `# ${doc.meta.title}\n\n\`\`\`acm\n${stringifyYaml(doc, { lineWidth: 0, defaultStringType: "QUOTE_DOUBLE" }).trimEnd()}\n\`\`\`\n`;
    await fs.writeFile(options.writeSpec, markdown, "utf8");
  }
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  environment: { runtime: process.version, platform: `${process.platform}-${process.arch}` },
  cases: results,
  recommendation: { comfortable: { nodes: 150, edges: 225 }, extended_review: { nodes: 250, edges: 375 }, above: "not-qualified" },
  generated_spec: options.writeSpec,
})}\n`);
