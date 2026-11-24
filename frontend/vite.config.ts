import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from "node:url";


// https://vite.dev/config/
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  server: {
    proxy: { '/api/v1': apiProxyTarget },
  },
  preview: { proxy: { '/api/v1': apiProxyTarget } },
  plugins: [
      react(),
      tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    },
  },
})
