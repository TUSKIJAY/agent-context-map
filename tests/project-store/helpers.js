import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "../..");

export function makeDoc(id = "acm_test_001", title = "Project store test", x = 10) {
  return {
    schema_version: "acm-md/0.1",
    doc_id: id,
    meta: { title, source: "project_store_test" },
    nodes: [{ id: "goal_001", type: "Goal", title: "Test goal", status: "confirmed", source: "project_store_test", confidence: 1, x, y: 20 }],
    edges: [],
  };
}

export async function tempWorkspace(prefix = "acm-project-store-") {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const root = path.join(parent, "project");
  const stateRoot = path.join(parent, "state");
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(stateRoot, { recursive: true });
  return {
    parent,
    root,
    stateRoot,
    cleanup: () => fs.rm(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
  };
}

export async function copyFixtureProject(targetRoot) {
  const fixture = path.join(repoRoot, "tests", "fixtures", "project-store", "rebuildable");
  await fs.cp(fixture, targetRoot, { recursive: true });
}
