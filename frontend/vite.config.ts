import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Task 45.7 — root cause of the long-standing "boundary/settlement/
  // landslide markers don't render on the Overview map" bug: Vite's
  // dependency pre-bundler rewrites maplibre-gl into `node_modules/
  // .vite/deps/`, which breaks the package's internal
  // `new URL("./maplibre-gl-worker.mjs", import.meta.url)` reference —
  // confirmed via network capture: that worker script 404s when
  // requested from the pre-bundled path (`/node_modules/.vite/deps/
  // maplibre-gl-worker.mjs`), but loads with a real 200 when the exact
  // same file is served unbundled. Without a working worker, MapLibre
  // never tessellates GeoJSON sources into vertex buffers, so every
  // circle/line/fill/symbol layer silently renders zero features —
  // while raster tiles (simple decoded images, no worker needed)
  // render fine, which is why only some layers/some maps ever seemed
  // affected. Excluding maplibre-gl from pre-bundling makes Vite serve
  // its own real ESM build as-is, so the worker's relative URL
  // resolves correctly. See docs/DECISIONS.md Task 45.7 for the full
  // diagnostic trail (this was not guessed — StateMap.tsx's own code
  // was exhaustively bisected against Map Intelligence's working map
  // first, including a from-scratch minimal component and a
  // completely unbundled standalone test page, before the Vite config
  // itself was identified as the actual cause).
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
