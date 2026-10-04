import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.API_TARGET || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Дев-сервер часто смотрят через внешний прокси/туннель (и с телефона) —
    // не отбиваем такие хосты, иначе вместо игры будет «Blocked request».
    allowedHosts: true,
    proxy: {
      // Игровой сервер: SSE-стрим раунда, пинг, проверка честности.
      // Браузер всегда ходит на относительный /api — никаких localhost в клиенте.
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        ws: true
      }
    }
  }
});
