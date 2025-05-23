import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./utils"),
      "utils": path.resolve(__dirname, "./utils"),
    },
  },
  build: {
    outDir: "dist", // Ensure Vercel serves the correct folder
  },
  server: {
    host: true,
  },
})
