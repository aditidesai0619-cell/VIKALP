import {
  Map as MapLibreGlMap,
  NavigationControl,
  Popup,
  type ErrorEvent,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { EvidenceLayerControl, type EvidenceLayerVisibility } from "./EvidenceLayerControl";
import { EvidenceRadiusControl, type EvidenceRadiusSelection } from "./EvidenceRadiusControl";
import { MapWatermark } from "../historical-replay/MapWatermark";
import { GSI_LANDSLIDE_TILE_URL_TEMPLATE } from "../../services/evidenceTiles";
import { getToken } from "../../services/session";
import { circlePolygon } from "../../utils/geoCircle";
import type { ApiBoundaryFeatureCollection, ApiLandslideProperties } from "../../types/gis";
import type { ApiSettlement } from "../../types/settlement";

// Task 45.8 — Evidence Map, second generation. Natural-terrain
// basemap (Esri World_Physical_Map — the same real, free, keyless
// source already verified to zoom 8 for Overview's map, Task 45.7;
// reused here rather than the road-oriented OSM tiles the first
// Evidence-map generation used, per this task's §5/§17 preference for
// terrain-relief context over street detail). District boundaries and
// the settlement point stay plain GeoJSON, unchanged. The GSI/NLFC
// landslide inventory is now a real Mapbox Vector Tile SOURCE (see
// services/evidenceTiles.ts + backend/app/services/gis_tiles.py) —
// MapLibre requests only the tiles the current viewport needs, not
// the full 813-feature dataset up front. This is the only vector-
// tiled layer in this task (brief §4/§20: "do not vector-tile every
// dataset").
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

const BOUNDARIES_SOURCE_ID = "evidence-map-boundaries-source";
const BOUNDARIES_FILL_ID = "evidence-map-boundaries-fill";
const BOUNDARIES_LINE_ID = "evidence-map-boundaries-line";
const SETTLEMENT_SOURCE_ID = "evidence-map-settlement-source";
const SETTLEMENT_LAYER_ID = "evidence-map-settlement-point";
const GSI_TILE_SOURCE_ID = "evidence-map-gsi-tiles-source";
const GSI_TILE_SOURCE_LAYER = "gsi_landslides"; // must match gis_tiles.py's _LAYER_NAME
const GSI_LAYER_ID = "evidence-map-gsi-point";
const RADIUS_SOURCE_ID = "evidence-map-radius-source";
const RADIUS_FILL_ID = "evidence-map-radius-fill";
const RADIUS_LINE_ID = "evidence-map-radius-line";

export function EvidenceMap({
  mode,
  boundaries,
  settlement,
  layerVisibility,
  radiusSelection,
  onRadiusChange,
  onLayerToggle,
  onSelectGsiFeature,
}: {
  mode: "current" | "historical";
  boundaries: ApiBoundaryFeatureCollection | null;
  settlement: ApiSettlement | null;
  layerVisibility: EvidenceLayerVisibility;
  radiusSelection: EvidenceRadiusSelection;
  onRadiusChange: (value: EvidenceRadiusSelection) => void;
  onLayerToggle: (key: keyof EvidenceLayerVisibility) => void;
  onSelectGsiFeature: (properties: ApiLandslideProperties) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGlMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7.5);
  const onSelectGsiFeatureRef = useRef(onSelectGsiFeature);
  useEffect(() => {
    onSelectGsiFeatureRef.current = onSelectGsiFeature;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreGlMap({
      container,
      style: BASEMAP_STYLE,
      center: [79.3, 30.1],
      zoom: 7.5,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      // Attaches the officer's bearer token to GSI tile requests only —
      // MapLibre's own internal tile fetcher doesn't go through this
      // app's apiFetch() wrapper, so without this the tile endpoint
      // (protected like every other VIKALP API route) would 401.
      transformRequest: (url) => {
        if (url.startsWith(GSI_LANDSLIDE_TILE_URL_TEMPLATE.split("{z}")[0])) {
          const token = getToken();
          return { url, headers: token ? { Authorization: `Bearer ${token}` } : {} };
        }
        return { url };
      },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event: ErrorEvent) => console.error("MapLibre map error:", event.error));

    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on("zoom", handleZoom);

    const markReady = () => setMapLoaded(true);
    if (map.isStyleLoaded()) markReady();
    else map.on("load", markReady);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.off("zoom", handleZoom);
      map.off("load", markReady);
      setMapLoaded(false);
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boundaries — real district polygons, current-data spatial reference.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !boundaries) return;

    if (!map.getSource(BOUNDARIES_SOURCE_ID)) {
      map.addSource(BOUNDARIES_SOURCE_ID, { type: "geojson", data: boundaries });
    }
    if (!map.getLayer(BOUNDARIES_FILL_ID)) {
      map.addLayer({
        id: BOUNDARIES_FILL_ID,
        type: "fill",
        source: BOUNDARIES_SOURCE_ID,
        paint: { "fill-color": "#6b6656", "fill-opacity": 0.03 },
      });
    }
    if (!map.getLayer(BOUNDARIES_LINE_ID)) {
      map.addLayer({
        id: BOUNDARIES_LINE_ID,
        type: "line",
        source: BOUNDARIES_SOURCE_ID,
        paint: { "line-color": "#d9b56a", "line-width": 1.3, "line-opacity": 0.75 },
      });
    }
  }, [mapLoaded, boundaries]);

  // Settlement — real current point, gold, labeled by mode in its popup.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !settlement) return;
    const popup = new Popup({ offset: 12, closeButton: false });

    const geojson = {
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [settlement.longitude, settlement.latitude] },
      properties: { name: settlement.name },
    };

    if (!map.getSource(SETTLEMENT_SOURCE_ID)) {
      map.addSource(SETTLEMENT_SOURCE_ID, { type: "geojson", data: geojson });
    }
    if (!map.getLayer(SETTLEMENT_LAYER_ID)) {
      map.addLayer({
        id: SETTLEMENT_LAYER_ID,
        type: "circle",
        source: SETTLEMENT_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": "#a8822f",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.on("click", SETTLEMENT_LAYER_ID, () => {
        const el = document.createElement("div");
        el.className = "flex flex-col gap-0.5 p-1 text-xs";
        const name = document.createElement("span");
        name.className = "font-semibold text-vikalp-navy";
        name.textContent = settlement.name;
        el.appendChild(name);
        const note = document.createElement("span");
        note.className = "text-vikalp-text-secondary";
        note.textContent =
          mode === "historical"
            ? "Current spatial reference — not verified historical-period state."
            : `${settlement.district}, ${settlement.state}`;
        el.appendChild(note);
        popup.setLngLat(geojson.geometry.coordinates as [number, number]).setDOMContent(el).addTo(map);
      });
    }

    return () => {
      popup.remove();
    };
  }, [mapLoaded, settlement, mode]);

  // 1 km / 5 km spatial evidence radius ring — a query/filter
  // visualization only (brief §12), never modifies the GSI dataset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !settlement) return;

    const data = radiusSelection
      ? circlePolygon([settlement.longitude, settlement.latitude], radiusSelection)
      : { type: "FeatureCollection" as const, features: [] };

    if (!map.getSource(RADIUS_SOURCE_ID)) {
      map.addSource(RADIUS_SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: RADIUS_FILL_ID,
        type: "fill",
        source: RADIUS_SOURCE_ID,
        paint: { "fill-color": "#e8c876", "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: RADIUS_LINE_ID,
        type: "line",
        source: RADIUS_SOURCE_ID,
        paint: { "line-color": "#e8c876", "line-width": 1.5, "line-dasharray": [2, 1.5] },
      });
    } else {
      (map.getSource(RADIUS_SOURCE_ID) as GeoJSONSource).setData(data);
    }
  }, [mapLoaded, settlement, radiusSelection]);

  // GSI/NLFC landslide inventory — real vector-tile source, only the
  // features in view are ever fetched. Radius bigger at higher zoom
  // (brief §6: "stronger visibility when zoomed in") — no server-side
  // clustering was implemented (see this task's final report), so
  // point density at low zoom is handled purely by small, restrained
  // marker size rather than aggregated bubbles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const popup = new Popup({ offset: 10, closeButton: false });

    if (!map.getSource(GSI_TILE_SOURCE_ID)) {
      map.addSource(GSI_TILE_SOURCE_ID, {
        type: "vector",
        tiles: [GSI_LANDSLIDE_TILE_URL_TEMPLATE],
        minzoom: 0,
        maxzoom: 16,
      });
    }
    if (!map.getLayer(GSI_LAYER_ID)) {
      map.addLayer({
        id: GSI_LAYER_ID,
        type: "circle",
        source: GSI_TILE_SOURCE_ID,
        "source-layer": GSI_TILE_SOURCE_LAYER,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 1.8, 10, 3, 14, 4.5],
          "circle-color": "#c1622f",
          "circle-opacity": 0.85,
        },
      });
      map.on("click", GSI_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const props = feature?.properties;
        if (!props) return;
        const el = document.createElement("div");
        el.className = "flex flex-col gap-0.5 p-1 text-xs";
        const title = document.createElement("span");
        title.className = "font-semibold text-vikalp-navy";
        title.textContent = `GSI record ${props.slide_no ?? "unknown"}`;
        el.appendChild(title);
        const note = document.createElement("span");
        note.className = "text-vikalp-text-secondary";
        note.textContent = "Contextual evidence, not an assessed risk zone.";
        el.appendChild(note);
        popup.setLngLat(event.lngLat).setDOMContent(el).addTo(map);
        onSelectGsiFeatureRef.current({
          slide_no: props.slide_no ?? null,
          activity: props.activity ?? null,
          triggering: props.triggering ?? null,
          toposheet: props.toposheet ?? null,
        });
      });
      map.on("mouseenter", GSI_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", GSI_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    return () => {
      popup.remove();
    };
  }, [mapLoaded]);

  // Layer visibility toggles — setLayoutProperty rather than adding/
  // removing sources, so toggling never re-fetches tiles/GeoJSON.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const setVisible = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    };
    setVisible(BOUNDARIES_FILL_ID, layerVisibility.boundaries);
    setVisible(BOUNDARIES_LINE_ID, layerVisibility.boundaries);
    setVisible(SETTLEMENT_LAYER_ID, layerVisibility.settlement);
    setVisible(GSI_LAYER_ID, layerVisibility.gsi);
  }, [mapLoaded, layerVisibility]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full" />
      {mode === "historical" && <MapWatermark />}

      <div className="absolute left-3 top-3 z-1200 flex flex-col gap-2">
        <EvidenceLayerControl visibility={layerVisibility} onToggle={onLayerToggle} />
        <EvidenceRadiusControl selection={radiusSelection} onChange={onRadiusChange} />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-1200 flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3.5 py-3 text-[13px] text-vikalp-text-secondary">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Map evidence
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#a8822f]" aria-hidden="true" />
          Selected settlement
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#c1622f]" aria-hidden="true" />
          GSI inventory evidence
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-[#e8c876]" aria-hidden="true" />
          1 km / 5 km evidence radius
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-3.5 rounded-full bg-[#d9b56a]" aria-hidden="true" />
          District boundary
        </span>
        <span className="border-t border-vikalp-border pt-1.5 font-medium text-vikalp-warning">
          GSI inventory evidence — not an assessed risk zone
        </span>
      </div>

      {currentZoom > TERRAIN_REAL_MAXZOOM + 2 && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-1200 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2.5 py-1 text-[12px] text-vikalp-text-secondary">
          Basemap imagery shown at reduced detail beyond zoom {TERRAIN_REAL_MAXZOOM}
        </div>
      )}
    </div>
  );
}
