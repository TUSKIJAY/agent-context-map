import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.js",
      "spikes/**/tests/**/*.test.js",
      "packages/**/tests/**/*.test.js",
      "plugins/**/tests/**/*.test.js",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "src-tauri/target/**"],
  },
});
