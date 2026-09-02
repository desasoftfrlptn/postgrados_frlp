import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // host: "0.0.0.0", // ESTO DEPENDE SI SE TRABAJA DENTRO DEL CONTAINER DE DOCKER
    port: 3000,
  },
});