// maplibre-gl resolves its worker script URL dynamically at runtime
// (new URL(`./${name}`, import.meta.url) with a computed name), which
// Vite's build-time static asset analysis cannot detect, so `vite build`
// never emits the worker script into dist/ and it 404s in production.
//
// Bundling the worker file alone (e.g. via a `?url` import) is not
// enough either: the worker script itself has its own hardcoded
// relative import of a sibling chunk, `./maplibre-gl-shared.mjs`. Vite
// fully inlines that chunk into the main app bundle when processing our
// own `import "maplibre-gl"`, so it never exists as a standalone file —
// the worker's import of it 404s, and because that failure happens
// inside the worker's own module-loading step, it isn't surfaced as a
// console error; the map just silently never finishes loading.
//
// The fix used here is the standard, bundler-agnostic one MapLibre
// itself recommends for this problem: copy the worker script and its
// required sibling chunk verbatim (unprocessed, so their relative
// import relationship stays intact) into public/maplibre/, which Vite
// serves at a stable, unhashed path in both dev and prod, and point
// maplibre-gl at that path explicitly.
//
// If maplibre-gl is upgraded, re-copy both files from
// node_modules/maplibre-gl/dist/ into public/maplibre/.
import { setWorkerUrl } from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
