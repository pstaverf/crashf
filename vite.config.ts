import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2022", cssTarget: "chrome107" },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": { target: process.env.API_TARGET || "http://127.0.0.1:8787", changeOrigin: true }
    }
  }
});
