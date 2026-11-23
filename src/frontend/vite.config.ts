import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0", // Requerido para escuchar peticiones externas al contenedor Docker
    port: 3000,
    watch: {
      usePolling: process.env.VITE_USE_POLLING === "true",
    },
  },
});