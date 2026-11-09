import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  build: {
    // Split large vendor libraries into separate chunks for better caching + parallel download
    chunkSizeWarningLimit: 1200,
    // ── NO manualChunks — AND THAT IS THE FIX, NOT AN OVERSIGHT ─────────────
    // Naming vendor chunks by hand was making the FIRST PAINT download the
    // biggest libraries in the app. Rollup puts shared CommonJS interop helpers
    // (a couple of kilobytes, needed by nearly every chunk) into ONE chunk, and
    // with hand-named chunks that happened to be a heavy vendor one — so the app
    // entry imported it, and every launch had to fetch 384 KB of charting code
    // plus 120 KB of Firebase before anything could paint. Removing just those
    // two names moved the same trap onto the 1.8 MB map library instead.
    //
    // Left to itself Rollup does what is actually wanted here: the entry keeps
    // its own small shims, a library is bundled into the LAZY chunk that uses it
    // (charts into the dashboards, Mapbox into the map page, Firebase into the
    // push path), and anything two lazy pages share is split out once and only
    // fetched when one of them opens. Nothing extra is loaded at launch, and no
    // behaviour changes — only when each file is downloaded.
  },
});