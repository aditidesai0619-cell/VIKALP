import {
  Map as MapLibreGlMap,
  NavigationControl,
  Popup,
  type ErrorEvent,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  DEFAULT_BEARING,
  DEFAULT_CENTER,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  TERRAIN_ENCODING,
  TERRAIN_EXAGGERATION,
  TERRAIN_MAX_ZOOM,
  TERRAIN_TILE_SIZE,
  TERRAIN_TILE_URL,
} from "../../config/mapConfig";
import { GSI_LANDSLIDE_TILE_URL_TEMPLATE } from "../../services/evidenceTiles";
import { getToken } from "../../services/session";
import { buildBuildingPopup, buildEvidencePopup, buildSettlementPopup } from "./terrainPopups";
import type { TerrainLayerVisibility } from "./TerrainLayerControl";
import type { ApiBoundaryFeatureCollection, ApiLandslideProperties } from "../../types/gis";
import type { ApiSettlementGeoJSONFeature, GeojsonRequestState } from "../../types/settlement";

// Genuinely new capability (Task: "Add a Free 3D Terrain Map"). No
// other VIKALP map calls setTerrain()/uses a raster-dem source —
// confirmed by a repo-wide grep before writing this file. Base style
// is OpenFreeMap's "liberty" (real, free, keyless; verified live via
// curl before use). Terrain elevation is AWS's public Terrarium tile
// set (also verified live). Both are independent of VIKALP's own
// data — the only VIKALP-sourced layers added on top are the same
// three already used elsewhere: district boundary, settlement point,
// and the GSI/NLFC historical-evidence vector tiles.
const TERRAIN_SOURCE_ID = "vikalp-terrain-dem";
const BOUNDARIES_SOURCE_ID = "terrain-map-boundaries-source";
const BOUNDARIES_LINE_ID = "terrain-map-boundaries-line";
const SETTLEMENT_SOURCE_ID = "terrain-map-settlement-source";
const SETTLEMENT_LAYER_ID = "terrain-map-settlement-point";
const GSI_TILE_SOURCE_ID = "terrain-map-gsi-tiles-source";
const GSI_TILE_SOURCE_LAYER = "gsi_landslides"; // must match backend gis_tiles.py's _LAYER_NAME
const GSI_LAYER_ID = "terrain-map-gsi-point";
// Layer ids shipped by the OpenFreeMap "liberty" style itself (real
// OSM building footprints) — toggled, never re-created.
const BUILDING_LAYER_ID = "building-3d";
const BUILDING_FLAT_LAYER_ID = "building";

export interface TerrainMapHandle {
  resetView: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const TerrainMap = forwardRef<
  TerrainMapHandle,
  {
    geojsonState: GeojsonRequestState;
    onRetryGeojson: () => void;
    boundaries: ApiBoundaryFeatureCollection | null;
    layerVisibility: TerrainLayerVisibility;
    onTerrainAvailabilityChange: (available: boolean) => void;
  }
>(function TerrainMap(
  { geojsonState, onRetryGeojson, boundaries, layerVisibility, onTerrainAvailabilityChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [terrainAvailable, setTerrainAvailable] = useState(false);
  const onTerrainAvailabilityChangeRef = useRef(onTerrainAvailabilityChange);
  useEffect(() => {
    onTerrainAvailabilityChangeRef.current = onTerrainAvailabilityChange;
  });

  const feature = geojsonState.status === "success" ? geojsonState.feature : null;

  useImperativeHandle(ref, () => ({
    resetView: () => {
      mapRef.current?.flyTo({
        center: feature?.geometry.coordinates ?? DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        duration: 700,
      });
    },
    tiltUp: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ pitch: Math.min(map.getPitch() + 10, 75), duration: 250 });
    },
    tiltDown: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ pitch: Math.max(map.getPitch() - 10, 0), duration: 250 });
    },
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
  }));

  // Create the map once, centered on the configured default so it
  // renders immediately rather than waiting on the settlement fetch
  // (this map's purpose is terrain context first; §5 workflow step 2:
  // "Map loads at the configured region"). Recenters onto the real
  // settlement in a separate effect below once that fetch resolves.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreGlMap({
      container,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      // Attaches the officer's bearer token to GSI tile requests only —
      // same technique as EvidenceMap.tsx (Task 45.8): MapLibre's own
      // tile fetcher bypasses this app's apiFetch() wrapper.
      transformRequest: (url) => {
        if (url.startsWith(GSI_LANDSLIDE_TILE_URL_TEMPLATE.split("{z}")[0])) {
          const token = getToken();
          return { url, headers: token ? { Authorization: `Bearer ${token}` } : {} };
        }
        return { url };
      },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");

    let terrainErrored = false;
    const disableTerrainOnError = () => {
      if (terrainErrored) return;
      terrainErrored = true;
      setTerrainAvailable(false);
      onTerrainAvailabilityChangeRef.current(false);
      try {
        map.setTerrain(null);
      } catch {
        // already unset — ignore
      }
    };
    map.on("error", (event: ErrorEvent) => {
      console.error("MapLibre map error:", event.error);
      const sourceId = (event as ErrorEvent & { sourceId?: string }).sourceId;
      if (sourceId === TERRAIN_SOURCE_ID) disableTerrainOnError();
    });

    const popup = new Popup({ offset: 16, closeButton: false });
    popupRef.current = popup;

    const enableTerrain = () => {
      if (terrainErrored) return;
      try {
        if (!map.getSource(TERRAIN_SOURCE_ID)) {
          map.addSource(TERRAIN_SOURCE_ID, {
            type: "raster-dem",
            tiles: [TERRAIN_TILE_URL],
            tileSize: TERRAIN_TILE_SIZE,
            maxzoom: TERRAIN_MAX_ZOOM,
            encoding: TERRAIN_ENCODING,
            attribution: MAP_ATTRIBUTION,
          });
        }
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION });
        setTerrainAvailable(true);
        onTerrainAvailabilityChangeRef.current(true);
      } catch (error) {
        console.error("3D terrain could not be enabled:", error);
        disableTerrainOnError();
      }
    };

    const markReady = () => {
      setMapLoaded(true);
      enableTerrain();
    };
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
  }, []);

  // Recenter once the real settlement feature arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !feature || !mapLoaded) return;
    map.jumpTo({ center: feature.geometry.coordinates });
  }, [feature, mapLoaded]);

  // Terrain on/off toggle — independent of the initial-enable step
  // above; only acts once terrain is confirmed available.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !terrainAvailable) return;
    if (layerVisibility.terrain) {
      map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION });
    } else {
      map.setTerrain(null);
    }
  }, [layerVisibility.terrain, mapLoaded, terrainAvailable]);

  // Buildings — toggles the base style's own real "building"/
  // "building-3d" layers (real OSM footprints shipped with the
  // OpenFreeMap style). VIKALP adds no building source of its own.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const visibility = layerVisibility.buildings ? "visible" : "none";
    for (const layerId of [BUILDING_LAYER_ID, BUILDING_FLAT_LAYER_ID]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
    }
    if (!layerVisibility.buildings) return;

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildBuildingPopup(clicked.properties as Record<string, unknown>))
        .addTo(map);
    };
    map.on("click", BUILDING_LAYER_ID, handleClick);
    return () => {
      map.off("click", BUILDING_LAYER_ID, handleClick);
    };
  }, [layerVisibility.buildings, mapLoaded]);

  // District boundary — real geoBoundaries polygon, same
  // source/layer convention as every other VIKALP map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!boundaries || !layerVisibility.boundaries) {
      if (map.getLayer(BOUNDARIES_LINE_ID)) map.removeLayer(BOUNDARIES_LINE_ID);
      if (map.getSource(BOUNDARIES_SOURCE_ID)) map.removeSource(BOUNDARIES_SOURCE_ID);
      return;
    }

    if (!map.getSource(BOUNDARIES_SOURCE_ID)) {
      map.addSource(BOUNDARIES_SOURCE_ID, { type: "geojson", data: boundaries });
    }
    if (!map.getLayer(BOUNDARIES_LINE_ID)) {
      map.addLayer({
        id: BOUNDARIES_LINE_ID,
        type: "line",
        source: BOUNDARIES_SOURCE_ID,
        paint: { "line-color": "#d9b56a", "line-width": 1.6, "line-opacity": 0.8 },
      });
    }
  }, [mapLoaded, boundaries, layerVisibility.boundaries]);

  // Settlement point — real, single point + real (demo-labeled)
  // elevation.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!feature || !layerVisibility.settlement) {
      if (map.getLayer(SETTLEMENT_LAYER_ID)) map.removeLayer(SETTLEMENT_LAYER_ID);
      if (map.getSource(SETTLEMENT_SOURCE_ID)) map.removeSource(SETTLEMENT_SOURCE_ID);
      return;
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

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(
          buildSettlementPopup(clicked.properties as ApiSettlementGeoJSONFeature["properties"]),
        )
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", SETTLEMENT_LAYER_ID, handleClick);
    map.on("mouseenter", SETTLEMENT_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", SETTLEMENT_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", SETTLEMENT_LAYER_ID, handleClick);
      map.off("mouseenter", SETTLEMENT_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", SETTLEMENT_LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, feature, layerVisibility.settlement]);

  // Historical evidence — real Mapbox Vector Tile source (Task 45.8's
  // GSI/NLFC endpoint), same technique as EvidenceMap.tsx: MapLibre
  // requests only the tiles the current viewport needs, never the
  // full 813-feature dataset up front.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!layerVisibility.evidence) {
      if (map.getLayer(GSI_LAYER_ID)) map.removeLayer(GSI_LAYER_ID);
      if (map.getSource(GSI_TILE_SOURCE_ID)) map.removeSource(GSI_TILE_SOURCE_ID);
      return;
    }

    if (!map.getSource(GSI_TILE_SOURCE_ID)) {
      map.addSource(GSI_TILE_SOURCE_ID, {
        type: "vector",
        tiles: [GSI_LANDSLIDE_TILE_URL_TEMPLATE],
        minzoom: 0,
        maxzoom: 14,
      });
    }
    if (!map.getLayer(GSI_LAYER_ID)) {
      map.addLayer({
        id: GSI_LAYER_ID,
        type: "circle",
        source: GSI_TILE_SOURCE_ID,
        "source-layer": GSI_TILE_SOURCE_LAYER,
        paint: {
          "circle-radius": 4,
          "circle-color": "#8a6d3b",
          "circle-opacity": 0.7,
          "circle-stroke-width": 0,
        },
      });
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildEvidencePopup(clicked.properties as ApiLandslideProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", GSI_LAYER_ID, handleClick);
    map.on("mouseenter", GSI_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", GSI_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", GSI_LAYER_ID, handleClick);
      map.off("mouseenter", GSI_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", GSI_LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, layerVisibility.evidence]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full" />

      {geojsonState.status === "error" && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-1200 flex items-center gap-2 rounded-md border border-vikalp-border bg-vikalp-card/90 px-2.5 py-1.5 text-[12px] text-vikalp-critical">
          <span>Settlement location could not be loaded — showing default view.</span>
          <button
            type="button"
            onClick={onRetryGeojson}
            className="pointer-events-auto rounded border border-vikalp-border px-1.5 py-0.5 text-[11px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
});
