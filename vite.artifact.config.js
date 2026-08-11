import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Phase 0 proof surface: a browser-only build with a relative asset base so the
// generated directory can be moved or served from any local sub-path. This entry
// deliberately does not replace the editor build in vite.config.js.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react", "react-dom", "@xyflow/react"] },
  build: {
    outDir: "dist-artifact-dir",
    emptyOutDir: true,
    rollupOptions: {
      input: "artifact.html",
    },
  },
});
