import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // 为 Kimi Code API 提供本地代理，避免浏览器 CORS 问题
      '/__proxy_kimi': {
        target: 'https://api.kimi.com/coding/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__proxy_kimi/, ''),
      },
    },
  },
});
