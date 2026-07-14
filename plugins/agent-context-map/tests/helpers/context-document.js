export const contextDocument = {
  schema_version: "acm-md/0.1", doc_id: "acm_context_001", meta: { title: "Context policy" },
  nodes: [
    { id: "task_001", type: "Task", title: "Selected task", status: "confirmed", source: "user", confidence: 1 },
    { id: "task_002", type: "Task", title: "Dependency task", status: "confirmed", source: "user", confidence: 1 },
    { id: "constraint_001", type: "Constraint", title: "Constraint", status: "confirmed", source: "user", confidence: 1 },
    { id: "data_001", type: "DataEntity", title: "Evidence", status: "confirmed", source: "user", confidence: 1 },
    { id: "feature_001", type: "Feature", title: "Impact only", status: "confirmed", source: "user", confidence: 1 },
  ],
  edges: [
    { id: "edge_dep", from: "task_001", to: "task_002", type: "depends_on", status: "confirmed", source: "user", confidence: 1 },
    { id: "edge_constraint", from: "constraint_001", to: "task_001", type: "constrains", status: "confirmed", source: "user", confidence: 1 },
    { id: "edge_ref", from: "task_001", to: "data_001", type: "references", status: "confirmed", source: "user", confidence: 1 },
    { id: "edge_impact", from: "task_001", to: "feature_001", type: "impacts", status: "confirmed", source: "user", confidence: 1 },
  ],
};
