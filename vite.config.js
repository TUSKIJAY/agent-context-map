import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Agent Context Map — Vite + React. Pure local tool, no backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  // Ensure a single React instance across the app and React Flow (@xyflow/react),
  // otherwise its internal hooks throw "Invalid hook call / multiple copies of React".
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react", "react-dom", "@xyflow/react"] },
});
