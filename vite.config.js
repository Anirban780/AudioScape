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
    alias: [
      { find: /^@\/assets\/(.*)/, replacement: path.resolve(__dirname, "./frontend/assets/$1") },
      { find: /^@assets\/(.*)/, replacement: path.resolve(__dirname, "./frontend/assets/$1") },
      { find: "@", replacement: path.resolve(__dirname, "./frontend/src") },
    ],
  },
  build: {
    outDir: "dist",
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  test: {
    // Use jsdom to emulate browser APIs (localStorage, DOM, IntersectionObserver stub)
    globals: true,
    environment: 'jsdom',
    // Wire up @testing-library/jest-dom matchers (toBeInTheDocument, etc.) for all test files
    setupFiles: ['@testing-library/jest-dom'],
    // Re-expose the same path aliases as production so vi.mock paths resolve correctly
    alias: {
      '@':    path.resolve(__dirname, './utils'),
      'utils': path.resolve(__dirname, './utils'),
    },
  },
})
