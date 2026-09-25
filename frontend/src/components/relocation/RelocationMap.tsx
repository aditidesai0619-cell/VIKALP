import {
  Map as MapLibreGlMap,
  Popup,
  type ErrorEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { RelocationLayerControl, type RelocationLayerVisibility } from "./RelocationLayerControl";
import type { ApiBoundaryFeatureCollection } from "../../types/gis";
import type { ApiDestinationCandidate } from "../../types/destination";
import type {
  ApiSettlementGeoJSONFeature,
  GeojsonRequestState,
} from "../../types/settlement";

// Task 45.9 — natural-terrain basemap (Esri World_Physical_Map — the
// same real, free, keyless source already verified to zoom 8 in Task
// 45.7 and reused for Overview/Evidence; replaces the road-oriented
// OSM raster tiles this map previously used, per this task's §7/§17
// preference for terrain-relief context over street detail — no new
// dependency, same technique, same "reduced detail beyond zoom 8"
// overzoom handling).
const TERRAIN_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}";
const TERRAIN_REAL_MAXZOOM = 8;

const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-physical-tiles": {
      type: "raster",
      tiles: [TERRAIN_TILE_URL],
      tileSize: 256,
      maxzoom: TERRAIN_REAL_MAXZOOM,
      attribution: "Esri, USGS, NOAA — physical/relief basemap",
    },
  },
  layers: [
    { id: "basemap-background", type: "background", paint: { "background-color": "#12140f" } },
    { id: "esri-physical-layer", type: "raster", source: "esri-physical-tiles", paint: { "raster-opacity": 0.92 } },
  ],
};

const INITIAL_ZOOM = 12;
const SETTLEMENT_SOURCE_ID = "relocation-settlement-source";
const SETTLEMENT_LAYER_ID = "relocation-settlement-point";
const DESTINATION_SOURCE_ID = "relocation-destination-source";
const DESTINATION_LAYER_ID = "relocation-destination-point";
const BOUNDARIES_SOURCE_ID = "relocation-boundaries-source";
const BOUNDARIES_LINE_ID = "relocation-boundaries-line";

function buildSettlementPopup(properties: ApiSettlementGeoJSONFeature["properties"]) {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-0.5 p-1";
  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = `${properties.name} — current site`;
  container.appendChild(name);
  const location = document.createElement("span");
  location.className = "text-xs text-vikalp-text-secondary";
  location.textContent = `${properties.population} people · ${properties.households} households`;
  container.appendChild(location);
  return container;
}

function buildDestinationPopup(candidate: ApiDestinationCandidate) {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-0.5 p-1";
  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = `${candidate.destination_name} — candidate destination`;
  container.appendChild(name);
  if (candidate.district || candidate.state) {
    const loc = document.createElement("span");
    loc.className = "text-xs text-vikalp-text-secondary";
    loc.textContent = [candidate.district, candidate.state].filter(Boolean).join(", ");
    container.appendChild(loc);
  }
  return container;
}

// Task 43 §8 (unchanged this task) — this map is deliberately capable
// of showing a second (destination) marker once a real candidate with
// coordinates exists, but it never draws a connecting line/route: no
// route or distance data source exists in the current architecture,
// and a drawn line would read as a claimed evacuation route (brief
// §10, reconfirmed this task — still true, still enforced).
export function RelocationMap({
  geojsonState,
  onRetryGeojson,
  destinationCandidate,
  boundaries = null,
  onSelectDestination,
}: {
  geojsonState: GeojsonRequestState;
  onRetryGeojson: () => void;
  destinationCandidate: ApiDestinationCandidate | null;
  boundaries?: ApiBoundaryFeatureCollection | null;
  onSelectDestination?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGlMap | null>(null);
  const [currentZoom, setCurrentZoom] = useState(INITIAL_ZOOM);
  const [layerVisibility, setLayerVisibility] = useState<RelocationLayerVisibility>({
    boundaries: true,
    settlement: true,
  });
  const feature = geojsonState.status === "success" ? geojsonState.feature : null;
  const onSelectDestinationRef = useRef(onSelectDestination);
  useEffect(() => {
    onSelectDestinationRef.current = onSelectDestination;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !feature) return;

    let cancelled = false;
    const map = new MapLibreGlMap({
      container,
      style: BASEMAP_STYLE,
      center: feature.geometry.coordinates,
      zoom: INITIAL_ZOOM,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.on("error", (event: ErrorEvent) => {
      console.error("MapLibre map error:", event.error);
    });
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on("zoom", handleZoom);

    const popup = new Popup({ offset: 16, closeButton: false });

    const setupLayers = () => {
      if (cancelled) return;

      if (boundaries) {
        if (!map.getSource(BOUNDARIES_SOURCE_ID)) {
          map.addSource(BOUNDARIES_SOURCE_ID, { type: "geojson", data: boundaries });
        }
        if (!map.getLayer(BOUNDARIES_LINE_ID)) {
          map.addLayer({
            id: BOUNDARIES_LINE_ID,
            type: "line",
            source: BOUNDARIES_SOURCE_ID,
            paint: { "line-color": "#d9b56a", "line-width": 1.3, "line-opacity": 0.75 },
          });
        }
      }

      if (!map.getSource(SETTLEMENT_SOURCE_ID)) {
        map.addSource(SETTLEMENT_SOURCE_ID, { type: "geojson", data: feature });
      }
      if (!map.getLayer(SETTLEMENT_LAYER_ID)) {
        map.addLayer({
          id: SETTLEMENT_LAYER_ID,
          type: "circle",
          source: SETTLEMENT_SOURCE_ID,
          paint: {
            "circle-radius": 8,
            "circle-color": "#a8822f",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
      map.on("click", SETTLEMENT_LAYER_ID, () => {
        popup
          .setLngLat(feature.geometry.coordinates)
          .setDOMContent(buildSettlementPopup(feature.properties))
          .addTo(map);
      });
      map.on("mouseenter", SETTLEMENT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SETTLEMENT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      if (
        destinationCandidate &&
        destinationCandidate.latitude !== null &&
        destinationCandidate.longitude !== null
      ) {
        const destCoords: [number, number] = [
          destinationCandidate.longitude,
          destinationCandidate.latitude,
        ];
        if (!map.getSource(DESTINATION_SOURCE_ID)) {
          map.addSource(DESTINATION_SOURCE_ID, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Point", coordinates: destCoords },
              properties: {},
            },
          });
        }
        if (!map.getLayer(DESTINATION_LAYER_ID)) {
          map.addLayer({
            id: DESTINATION_LAYER_ID,
            type: "circle",
            source: DESTINATION_SOURCE_ID,
            paint: {
              "circle-radius": 8,
              "circle-color": "#ece9e2",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#a8822f",
            },
          });
        }
        map.on("click", DESTINATION_LAYER_ID, () => {
          popup
            .setLngLat(destCoords)
            .setDOMContent(buildDestinationPopup(destinationCandidate))
            .addTo(map);
          onSelectDestinationRef.current?.();
        });
        map.on("mouseenter", DESTINATION_LAYER_ID, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", DESTINATION_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
        });

        const bounds: [[number, number], [number, number]] = [
          [
            Math.min(feature.geometry.coordinates[0], destCoords[0]),
            Math.min(feature.geometry.coordinates[1], destCoords[1]),
          ],
          [
            Math.max(feature.geometry.coordinates[0], destCoords[0]),
            Math.max(feature.geometry.coordinates[1], destCoords[1]),
          ],
        ];
        map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 0 });
      }
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.on("load", setupLayers);
    }

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      map.off("zoom", handleZoom);
      popup.remove();
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, destinationCandidate, boundaries]);

  // Layer visibility toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const setVisible = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    };
    setVisible(BOUNDARIES_LINE_ID, layerVisibility.boundaries);
    setVisible(SETTLEMENT_LAYER_ID, layerVisibility.settlement);
  }, [layerVisibility, currentZoom]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full" />

      {!feature && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-vikalp-card text-center">
          {geojsonState.status === "loading" && (
            <span className="text-sm text-vikalp-text-secondary">Loading map…</span>
          )}
          {geojsonState.status === "error" && (
            <>
              <span className="text-sm font-medium text-vikalp-critical">
                Map data could not be loaded.
              </span>
              <span className="max-w-xs text-[13px] text-vikalp-text-secondary">
                {geojsonState.message}
              </span>
              <button
                type="button"
                onClick={onRetryGeojson}
                className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {feature && (
        <>
          {/* Task 45.9 §4/§18 — map controls sized 40-44px (was the
              tiny built-in NavigationControl). */}
          <div className="absolute left-3 top-3 z-1200 flex flex-col gap-2">
            <div className="flex flex-col gap-1 rounded-md border border-vikalp-border bg-vikalp-card/95 p-1">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => mapRef.current?.zoomIn()}
                className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => mapRef.current?.zoomOut()}
                className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
              >
                −
              </button>
              <button
                type="button"
                aria-label="Reset view"
                onClick={() =>
                  mapRef.current?.flyTo({ center: feature.geometry.coordinates, zoom: INITIAL_ZOOM, duration: 600 })
                }
                className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
              >
                ⟲
              </button>
            </div>
            <RelocationLayerControl
              visibility={layerVisibility}
              onToggle={(key) => setLayerVisibility((v) => ({ ...v, [key]: !v[key] }))}
            />
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 z-1200 flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3.5 py-3 text-[13px] text-vikalp-text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Map
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#a8822f]" aria-hidden="true" />
              Current settlement
            </span>
            {destinationCandidate && (
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-[#a8822f] bg-[#ece9e2]" aria-hidden="true" />
                Candidate destination
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-3.5 rounded-full bg-[#d9b56a]" aria-hidden="true" />
              District boundary
            </span>
          </div>

          {!destinationCandidate && (
            <div className="pointer-events-none absolute right-3 top-3 z-1200 max-w-[60%] rounded-md border border-vikalp-border bg-vikalp-card/90 px-3 py-2 text-[13px] text-vikalp-text-secondary">
              No approved destination candidate — showing current settlement only
            </div>
          )}

          {currentZoom > TERRAIN_REAL_MAXZOOM + 2 && (
            <div className="pointer-events-none absolute bottom-3 right-3 z-1200 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2.5 py-1 text-[12px] text-vikalp-text-secondary">
              Basemap imagery shown at reduced detail beyond zoom {TERRAIN_REAL_MAXZOOM}
            </div>
          )}
        </>
      )}
    </div>
  );
}
