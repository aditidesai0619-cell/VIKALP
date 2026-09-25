// 3D Terrain map configuration — kept in one file so the style/terrain
// source can change without touching map logic. Every URL here was
// verified live (curl) before being hardcoded, not assumed:
//   - style: https://tiles.openfreemap.org/styles/liberty -> 200,
//     real vector style (OpenMapTiles schema over OSM data), already
//     ships its own "building-3d" fill-extrusion layer (real OSM
//     footprints, no VIKALP-fabricated geometry or height).
//   - terrain: AWS/Mapzen "Terrarium" elevation tiles -> 200 for a
//     tile over the Uttarakhand pilot area. MapLibre's own demo
//     terrain endpoint (a documented alternative) returned 404 at
//     verification time, so it was NOT used.
// All values are overridable via VITE_MAP_* env vars (see
// .env.example) without editing this file.

export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

export const TERRAIN_TILE_URL =
  import.meta.env.VITE_TERRAIN_TILE_URL ??
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

// "terrarium" encoding (RGB channels -> elevation via Mapzen's formula)
// matches the AWS Terrarium tile source above. MapLibre's built-in
// `raster-dem` source type understands this natively.
export const TERRAIN_ENCODING = "terrarium" as const;
export const TERRAIN_TILE_SIZE = 256;
export const TERRAIN_MAX_ZOOM = 15;
export const TERRAIN_EXAGGERATION = 1.2;

// Bhitai Malli, Pauri Garhwal — the same demo location already used
// across Overview/Settlement/Evidence/Destination maps (never a new
// operational location invented for this map).
const DEFAULT_LAT = Number(import.meta.env.VITE_MAP_DEFAULT_LAT ?? 30.1);
const DEFAULT_LNG = Number(import.meta.env.VITE_MAP_DEFAULT_LNG ?? 79.3);
export const DEFAULT_CENTER: [number, number] = [DEFAULT_LNG, DEFAULT_LAT];
export const DEFAULT_ZOOM = Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM ?? 11.5);
export const DEFAULT_PITCH = 55;
export const DEFAULT_BEARING = 20;

export const MAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Style: OpenFreeMap (openfreemap.org) | Terrain: AWS Terrain Tiles (Terrarium format, derived from SRTM/USGS/ETOPO1)';
