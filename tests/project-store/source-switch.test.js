import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./helpers.js";

const read = (relativePath) => fs.readFile(path.join(repoRoot, relativePath), "utf8");

describe("desktop content-source switch", () => {
  it("has no desktop SQLite write backend or SQL plugin capability", async () => {
    const [store, tauriLib, capabilities, packageJson, cargo] = await Promise.all([
      read("src/storage/store.js"),
      read("src-tauri/src/lib.rs"),
      read("src-tauri/capabilities/default.json"),
      read("package.json"),
      read("src-tauri/Cargo.toml"),
    ]);
    expect(store).not.toMatch(/sqliteBackend|Database\.load|plugin-sql/);
    expect(tauriLib).not.toMatch(/add_migrations|MIGRATIONS_V1|tauri_plugin_sql/);
    expect(capabilities).not.toMatch(/sql:/);
    expect(packageJson).not.toMatch(/plugin-sql/);
    expect(cargo).not.toMatch(/tauri-plugin-sql/);
  });

  it("registers project-file and read-only legacy migration commands", async () => {
    const [tauriLib, projectAdapter, legacyReader] = await Promise.all([
      read("src-tauri/src/lib.rs"),
      read("src/storage/tauriProjectStore.js"),
      read("src-tauri/src/legacy_sqlite.rs"),
    ]);
    for (const command of ["project_scan", "project_scan_recovery", "project_write_document", "project_write_index", "project_delete_document"]) {
      expect(tauriLib).toContain(command);
      expect(projectAdapter).toContain(command);
    }
    expect(legacyReader).toContain("read_only(true)");
    expect(legacyReader).not.toMatch(/UPDATE\s|INSERT\s|DELETE\s/i);
  });
});
