import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The project had no vite.config, so `vite dev`/`vite build` ran unconfigured:
// no React plugin (hence no Fast Refresh), no path alias, and one monolithic
// vendor bundle regardless of the route-level lazy loading in LazyRoutes.tsx.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split long-lived dependencies out of the app chunk so a code change
        // doesn't invalidate the browser's cache of React et al.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand', '@tanstack/react-query'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
