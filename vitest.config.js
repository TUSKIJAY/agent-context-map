import { defineConfig } from "vitest/config";

const slowWindowsCi = process.platform === "win32" && Boolean(process.env.CI);

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: slowWindowsCi ? 30_000 : 5_000,
    include: [
      "tests/**/*.test.js",
      "spikes/**/tests/**/*.test.js",
      "packages/**/tests/**/*.test.js",
      "plugins/**/tests/**/*.test.js",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "src-tauri/target/**"],
  },
});
