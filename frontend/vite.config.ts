import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from "node:url";


// https://vite.dev/config/
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET;

export default defineConfig({
  server: {
    proxy: apiProxyTarget ? { '/api/v1': apiProxyTarget } : undefined,
  },
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
