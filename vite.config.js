import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Agent Context Map — Vite + React. Pure local tool, no backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
