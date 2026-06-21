/* eslint-env node */
import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  logLevel: 'error',
  plugins: [
    base44({
      legacySDKImports: false,
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  build: {
    ...(mode === 'production' && {
      minify: 'esbuild',
    }),
  },
  esbuild: {
    ...(mode === 'production' && {
      drop: ['console', 'debugger'],
    }),
  },
}));