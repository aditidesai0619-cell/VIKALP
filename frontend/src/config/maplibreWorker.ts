// maplibre-gl resolves its worker script URL dynamically at runtime
// (new URL(`./${name}`, import.meta.url) with a computed name), which
// Vite's build-time static asset analysis cannot detect — it only
// bundles `new URL('literal-path', import.meta.url)` calls with a
// literal string. As a result `vite build` never emits the worker file,
// and in production the browser's Worker constructor 404s, silently
// leaving every map's `load` event (and therefore every data layer
// gated behind it) stuck forever. Importing the worker file here with
// `?url` forces Vite to bundle it as a real, hashed asset in both dev
// and prod, and setWorkerUrl points maplibre-gl at that resolved path
// instead of its own broken lookup.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

setWorkerUrl(workerUrl);
