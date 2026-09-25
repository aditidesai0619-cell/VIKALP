import {
  Map as MapLibreGlMap,
  NavigationControl,
  Popup,
  type ErrorEvent,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  ApiBoundaryFeatureCollection,
  ApiBoundaryProperties,
  ApiLandslideProperties,
  BoundariesRequestState,
  LandslidesRequestState,
} from "../../types/gis";
import type {
  ApiSettlementGeoJSONFeature,
  GeojsonRequestState,
} from "../../types/settlement";

// DEMO BASEMAP ONLY — same OSM raster tiles as the Overview map
// (components/dashboard/MapLibreMap.tsx). Not an official government
// basemap; swap before any real deployment.
const DEMO_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "osm-demo-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — demo basemap',
    },
  },
  layers: [
    {
      id: "osm-demo-tiles-layer",
      type: "raster",
      source: "osm-demo-tiles",
    },
  ],
};

const INITIAL_ZOOM = 13;

// Same source/layer ids as the Overview map (Task 03/11/12) — kept
// identical for naming consistency across the app (Task 38 §F).
const SOURCE_ID = "settlement-source";
const LAYER_ID = "settlement-point";
const LABEL_LAYER_ID = "settlement-point-label";

const BOUNDARIES_SOURCE_ID = "boundaries-source";
const BOUNDARIES_FILL_ID = "boundaries-fill";
const BOUNDARIES_LINE_ID = "boundaries-line";

// New for Task 38 — the GSI/NLFC landslide inventory point layer.
const LANDSLIDES_SOURCE_ID = "landslide-source";
const LANDSLIDE_LAYER_ID = "landslide-point";

export interface IntelligenceMapHandle {
  resetView: () => void;
  fitBoundary: () => void;
}

// Popup content is built from DOM nodes + textContent, never innerHTML —
// API-provided properties must never be injected into an HTML string
// unescaped. Same convention as components/dashboard/MapLibreMap.tsx.
function buildSettlementPopupContent(
  properties: ApiSettlementGeoJSONFeature["properties"],
): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = properties.name;
  container.appendChild(name);

  const location = document.createElement("span");
  location.className = "text-xs text-vikalp-text-secondary";
  location.textContent = `${properties.district}, ${properties.state}`;
  container.appendChild(location);

  const stats = document.createElement("div");
  stats.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Population: ${properties.population}`,
    `Households: ${properties.households}`,
    `Elevation: ${properties.elevation_m} m`,
    `Slope (demo/DB value): ${properties.slope_degrees}°`,
  ]) {
    const statEl = document.createElement("span");
    statEl.textContent = line;
    stats.appendChild(statEl);
  }
  container.appendChild(stats);

  const dataStatus = document.createElement("span");
  dataStatus.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  dataStatus.textContent = properties.data_status;
  container.appendChild(dataStatus);

  return container;
}

function buildBoundaryPopupContent(properties: ApiBoundaryProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = properties.shapeName ?? "Unnamed boundary";
  container.appendChild(name);

  const state = document.createElement("span");
  state.className = "text-xs text-vikalp-text-secondary";
  state.textContent = "Uttarakhand — district-level administrative context";
  container.appendChild(state);

  const dataStatus = document.createElement("span");
  dataStatus.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  dataStatus.textContent = "Source: geoBoundaries India ADM2 (ODbL 1.0)";
  container.appendChild(dataStatus);

  return container;
}

// Deliberately never mentions "risk", "safe", "hazard zone", or a color
// meaning — a single inventory point is a documented event record, not
// a scored/classified area.
function buildLandslidePopupContent(properties: ApiLandslideProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = "GSI/NLFC landslide record — contextual evidence";
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Slide no.: ${properties.slide_no ?? "Not recorded"}`,
    `Activity: ${properties.activity ?? "Not recorded"}`,
    `Triggering: ${properties.triggering ?? "Not recorded"}`,
    `Toposheet: ${properties.toposheet ?? "Not recorded"}`,
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent =
    "A single documented event record, not a hazard zone or risk score.";
  container.appendChild(note);

  return container;
}

// Recursively flattens nested GeoJSON coordinate arrays (Polygon,
// MultiPolygon, ...) into a bounding box — no turf/geo library needed
// for this one calculation.
function boundsOf(collection: ApiBoundaryFeatureCollection): LngLatBoundsLike | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      if (
        value.length >= 2 &&
        typeof value[0] === "number" &&
        typeof value[1] === "number"
      ) {
        const [lon, lat] = value as [number, number];
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        return;
      }
      for (const item of value) visit(item);
    }
  };

  for (const feature of collection.features) {
    visit(feature.geometry.coordinates);
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

export const IntelligenceMap = forwardRef<
  IntelligenceMapHandle,
  {
    geojsonState: GeojsonRequestState;
    onRetryGeojson: () => void;
    boundariesState: BoundariesRequestState;
    onRetryBoundaries: () => void;
    landslidesState: LandslidesRequestState;
    onRetryLandslides: () => void;
    showBoundaries: boolean;
    showSettlement: boolean;
    showLandslides: boolean;
  }
>(function IntelligenceMap(
  {
    geojsonState,
    onRetryGeojson,
    boundariesState,
    onRetryBoundaries,
    landslidesState,
    onRetryLandslides,
    showBoundaries,
    showSettlement,
    showLandslides,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const feature = geojsonState.status === "success" ? geojsonState.feature : null;
  const boundaries =
    boundariesState.status === "success" ? boundariesState.collection : null;
  const landslides =
    landslidesState.status === "success" ? landslidesState.collection : null;

  useImperativeHandle(ref, () => ({
    resetView: () => {
      const map = mapRef.current;
      if (!map || !feature) return;
      map.flyTo({ center: feature.geometry.coordinates, zoom: INITIAL_ZOOM });
    },
    fitBoundary: () => {
      const map = mapRef.current;
      if (!map || !boundaries) return;
      const bounds = boundsOf(boundaries);
      if (bounds) map.fitBounds(bounds, { padding: 32 });
    },
  }));

  // Create/destroy the base map — gated only on the settlement feature
  // (needed for an initial center). Layer toggles below never recreate
  // the map itself.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !feature) return;

    const map = new MapLibreGlMap({
      container,
      style: DEMO_BASEMAP_STYLE,
      center: feature.geometry.coordinates,
      zoom: INITIAL_ZOOM,
      attributionControl: { compact: true },
      // Stability fix — plain mouse-wheel scroll near the map (e.g. a
      // trackpad drifting over it while the user scrolls other content)
      // otherwise hijacks the wheel event and silently zooms the map: a
      // built-in MapLibre option, not a new dependency. Ctrl/Cmd+scroll
      // (or a two-finger touch gesture) still zooms deliberately; drag
      // pan and the +/- controls are unaffected.
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event: ErrorEvent) => {
      console.error("MapLibre map error:", event.error);
    });

    const popup = new Popup({ offset: 16, closeButton: false });
    popupRef.current = popup;

    const markReady = () => setMapLoaded(true);
    if (map.isStyleLoaded()) markReady();
    else map.on("load", markReady);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      setMapLoaded(false);
      popupRef.current = null;
      popup.remove();
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature]);

  // Settlement marker layer — independent toggle + data gate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!feature || !showSettlement) {
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      return;
    }

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: "geojson", data: feature });
    }
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#a8822f",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
    if (!map.getLayer(LABEL_LAYER_ID)) {
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "text-field": ["concat", ["get", "name"], " — Demo planning input"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#a8822f",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(
          buildSettlementPopupContent(
            clicked.properties as ApiSettlementGeoJSONFeature["properties"],
          ),
        )
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", LAYER_ID, handleClick);
    map.on("mouseenter", LAYER_ID, handleMouseEnter);
    map.on("mouseleave", LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", LAYER_ID, handleClick);
      map.off("mouseenter", LAYER_ID, handleMouseEnter);
      map.off("mouseleave", LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, feature, showSettlement]);

  // Administrative boundary layer — independent toggle + data gate,
  // inserted below the settlement layer so it never covers the marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!boundaries || !showBoundaries) {
      if (map.getLayer(BOUNDARIES_LINE_ID)) map.removeLayer(BOUNDARIES_LINE_ID);
      if (map.getLayer(BOUNDARIES_FILL_ID)) map.removeLayer(BOUNDARIES_FILL_ID);
      if (map.getSource(BOUNDARIES_SOURCE_ID)) map.removeSource(BOUNDARIES_SOURCE_ID);
      return;
    }

    if (!map.getSource(BOUNDARIES_SOURCE_ID)) {
      map.addSource(BOUNDARIES_SOURCE_ID, { type: "geojson", data: boundaries });
    }
    const beforeId = map.getLayer(LAYER_ID) ? LAYER_ID : undefined;
    if (!map.getLayer(BOUNDARIES_FILL_ID)) {
      map.addLayer(
        {
          id: BOUNDARIES_FILL_ID,
          type: "fill",
          source: BOUNDARIES_SOURCE_ID,
          paint: { "fill-color": "#6b6355", "fill-opacity": 0.12 },
        },
        beforeId,
      );
    }
    if (!map.getLayer(BOUNDARIES_LINE_ID)) {
      map.addLayer(
        {
          id: BOUNDARIES_LINE_ID,
          type: "line",
          source: BOUNDARIES_SOURCE_ID,
          paint: { "line-color": "#4a4438", "line-width": 1, "line-opacity": 0.6 },
        },
        beforeId,
      );
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildBoundaryPopupContent(clicked.properties as ApiBoundaryProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", BOUNDARIES_FILL_ID, handleClick);
    map.on("mouseenter", BOUNDARIES_FILL_ID, handleMouseEnter);
    map.on("mouseleave", BOUNDARIES_FILL_ID, handleMouseLeave);

    return () => {
      map.off("click", BOUNDARIES_FILL_ID, handleClick);
      map.off("mouseenter", BOUNDARIES_FILL_ID, handleMouseEnter);
      map.off("mouseleave", BOUNDARIES_FILL_ID, handleMouseLeave);
    };
  }, [mapLoaded, boundaries, showBoundaries]);

  // Landslide inventory point layer (Task 38) — muted, restrained
  // styling; never red/green, never a filled zone/polygon. Inserted
  // below the settlement layer, same as boundaries.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!landslides || !showLandslides) {
      if (map.getLayer(LANDSLIDE_LAYER_ID)) map.removeLayer(LANDSLIDE_LAYER_ID);
      if (map.getSource(LANDSLIDES_SOURCE_ID)) map.removeSource(LANDSLIDES_SOURCE_ID);
      return;
    }

    if (!map.getSource(LANDSLIDES_SOURCE_ID)) {
      map.addSource(LANDSLIDES_SOURCE_ID, { type: "geojson", data: landslides });
    }
    const beforeId = map.getLayer(LAYER_ID) ? LAYER_ID : undefined;
    if (!map.getLayer(LANDSLIDE_LAYER_ID)) {
      map.addLayer(
        {
          id: LANDSLIDE_LAYER_ID,
          type: "circle",
          source: LANDSLIDES_SOURCE_ID,
          paint: {
            "circle-radius": 3.5,
            "circle-color": "#8a6d3b",
            "circle-opacity": 0.55,
            "circle-stroke-width": 0,
          },
        },
        beforeId,
      );
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(
          buildLandslidePopupContent(clicked.properties as ApiLandslideProperties),
        )
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", LANDSLIDE_LAYER_ID, handleClick);
    map.on("mouseenter", LANDSLIDE_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", LANDSLIDE_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", LANDSLIDE_LAYER_ID, handleClick);
      map.off("mouseenter", LANDSLIDE_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", LANDSLIDE_LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, landslides, showLandslides]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full" />

      {!feature && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-vikalp-card text-center">
          {geojsonState.status === "loading" && (
            <span className="text-xs text-vikalp-text-secondary">Loading map…</span>
          )}
          {geojsonState.status === "error" && (
            <>
              <span className="text-xs font-medium text-vikalp-critical">
                Settlement location could not be loaded.
              </span>
              <span className="max-w-xs text-xs text-vikalp-text-secondary">
                {geojsonState.message}
              </span>
              <button
                type="button"
                onClick={onRetryGeojson}
                className="rounded-md border border-vikalp-border px-3 py-1.5 text-xs font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {feature && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2 py-0.5 text-[11px] text-vikalp-text-secondary">
          Demo basemap — not an official GIS layer
        </div>
      )}

      {feature && boundariesState.status === "error" && showBoundaries && (
        <div className="absolute left-2 top-2 flex items-center gap-2 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2 py-1 text-[11px] text-vikalp-critical">
          <span>Boundary layer unavailable.</span>
          <button
            type="button"
            onClick={onRetryBoundaries}
            className="rounded border border-vikalp-border px-1.5 py-0.5 text-[10px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
          >
            Retry
          </button>
        </div>
      )}

      {feature && landslidesState.status === "error" && showLandslides && (
        <div className="absolute left-2 top-9 flex items-center gap-2 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2 py-1 text-[11px] text-vikalp-critical">
          <span>Landslide evidence layer unavailable.</span>
          <button
            type="button"
            onClick={onRetryLandslides}
            className="rounded border border-vikalp-border px-1.5 py-0.5 text-[10px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
});
