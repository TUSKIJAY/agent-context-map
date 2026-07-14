export const FORMAL_SCHEMA_VERSION = "acm-md/0.1";
export const LEGACY_SCHEMA_VERSION = "0.1";
export const SUPPORTED_SCHEMA_VERSIONS = [FORMAL_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION];

export const NODE_TYPES = [
  "Goal", "Module", "Feature", "Page", "DataEntity", "API",
  "Constraint", "Risk", "Assumption", "Question", "Decision", "Task",
];

export const NODE_STATUSES = ["confirmed", "suggested", "needs_validation", "deprecated"];

export const RELATION_TYPES = [
  "contains", "depends_on", "impacts", "conflicts_with", "requires",
  "replaces", "references", "constrains", "answers", "needs_validation",
];

export const PRIORITIES = ["P0", "P1", "P2", "P3"];

export const TYPE_PREFIX = {
  Goal: "goal",
  Module: "module",
  Feature: "feature",
  Page: "page",
  DataEntity: "data",
  API: "api",
  Constraint: "constraint",
  Risk: "risk",
  Assumption: "assumption",
  Question: "question",
  Decision: "decision",
  Task: "task",
};

export const NODE_FIELDS = [
  "type", "title", "status", "description", "priority", "source", "confidence", "tags", "notes",
];

export const EDGE_FIELDS = ["from", "to", "type", "status", "reason", "source", "confidence"];
export const NODE_UPDATE_FIELDS = ["title", "status", "description", "priority", "source", "confidence", "tags", "notes"];
export const EDGE_UPDATE_FIELDS = ["type", "status", "reason", "source", "confidence"];

export const OPERATION_KINDS = [
  "addNode",
  "updateNodeFields",
  "removeNode",
  "addEdge",
  "updateEdgeFields",
  "removeEdge",
  "setNodeLayout",
];

export const LEGACY_OPERATION_KIND_MAP = {
  add_node: "addNode",
  update_node: "updateNodeFields",
  add_edge: "addEdge",
};
