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
      "@/assets": path.resolve(__dirname, "./frontend/assets"),
      "@": path.resolve(__dirname, "./frontend/src"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
