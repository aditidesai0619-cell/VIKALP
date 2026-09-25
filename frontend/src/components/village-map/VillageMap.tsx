import {
  Map as MapLibreGlMap,
  NavigationControl,
  Popup,
  type ErrorEvent,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MAP_STYLE_URL } from "../../config/mapConfig";
import { GSI_LANDSLIDE_TILE_URL_TEMPLATE } from "../../services/evidenceTiles";
import { getToken } from "../../services/session";
import {
  buildAmenityPopup,
  buildBuildingPopup,
  buildDestinationPopup,
  buildEvidencePopup,
  buildRoadPopup,
  buildSettlementPopup,
  buildWaterPopup,
} from "./villageMapPopups";
import type { VillageLayerVisibility } from "./VillageLayerControl";
import type { ApiAmenityFeatureCollection, ApiAmenityProperties } from "../../types/amenities";
import type { ApiBuildingFeatureCollection, ApiBuildingProperties } from "../../types/buildings";
import type { ApiBoundaryFeatureCollection, ApiLandslideProperties } from "../../types/gis";
import type { ApiRoadFeatureCollection, ApiRoadProperties } from "../../types/roads";
import type { ApiWaterFeatureCollection, ApiWaterProperties } from "../../types/water";
import type { ApiDestinationCandidate } from "../../types/destination";
import type { ApiSettlementGeoJSONFeature, GeojsonRequestState } from "../../types/settlement";

// Shared "village map" (brief: "one source of truth for building
// rendering, layer controls, settlement marker, map interaction, and
// provenance") — used by both the Settlement page and the Relocation
// Planner so the two never drift into two separate implementations.
//
// Basemap: OpenFreeMap "liberty" (same real, free, keyless vector
// style already verified and used by the 3D Terrain page — see
// config/mapConfig.ts). This REPLACES the Esri World_Physical_Map
// raster basemap this component used previously.
//
// Why the change: Esri's World_Physical_Map has real imagery only up
// to zoom 8 (TERRAIN_REAL_MAXZOOM in the terrain-map/EvidenceMap
// components) — beyond that MapLibre just upscales the same coarse
// zoom-8 pixels. This map operates at village scale (zoom ~12-18),
// so every tile shown was pure blur: no roads, no water, no land
// texture, no labels — the literal cause of the "buildings floating
// over a blank pale background" problem. OpenFreeMap's vector tiles
// have real detail at every zoom and natively include water, roads,
// land use, and place labels as part of the style itself.
//
// This does introduce one thing to manage: the style ships its own
// generic OSM "building"/"building-3d" layers, which are hidden below
// (not removed — still real, unmodified OSM data, just not shown)
// so only VIKALP's own verified Open Buildings extrusion layer
// represents buildings, avoiding a confusing double-render.
const STYLE_BUILDING_LAYER_IDS = ["building", "building-3d"];

const INITIAL_ZOOM = 12;
const BUILDINGS_SOURCE_ID = "village-map-buildings-source";
const BUILDINGS_LAYER_ID = "village-map-buildings-extrusion";
const ROADS_SOURCE_ID = "village-map-roads-source";
const ROADS_MAJOR_LAYER_ID = "village-map-roads-major";
const ROADS_MINOR_LAYER_ID = "village-map-roads-minor";
const ROADS_LABEL_LAYER_ID = "village-map-roads-label";
const WATER_SOURCE_ID = "village-map-water-source";
const WATER_LINE_LAYER_ID = "village-map-water-line";
const WATER_FILL_LAYER_ID = "village-map-water-fill";
const AMENITIES_SOURCE_ID = "village-map-amenities-source";
const AMENITIES_CIRCLE_LAYER_ID = "village-map-amenities-circle";
const AMENITIES_LABEL_LAYER_ID = "village-map-amenities-label";
const BOUNDARIES_SOURCE_ID = "village-map-boundaries-source";
const BOUNDARIES_LINE_ID = "village-map-boundaries-line";
const SETTLEMENT_SOURCE_ID = "village-map-settlement-source";
const SETTLEMENT_LAYER_ID = "village-map-settlement-point";
const SETTLEMENT_LABEL_LAYER_ID = "village-map-settlement-label";
const DESTINATION_SOURCE_ID = "village-map-destination-source";
const DESTINATION_LAYER_ID = "village-map-destination-point";
const GSI_TILE_SOURCE_ID = "village-map-gsi-tiles-source";
const GSI_TILE_SOURCE_LAYER = "gsi_landslides"; // must match backend gis_tiles.py's _LAYER_NAME
const GSI_LAYER_ID = "village-map-gsi-point";

// §6 — Open Buildings provides footprints, not heights. This is a
// fixed, documented, visualization-only extrusion (same number for
// every building, never derived per-feature) so it can never be read
// as a measured height. Kept low and neutral per the brief's "subtle,
// not colorful, not cartoonish" direction.
const VISUALIZATION_EXTRUSION_METERS = 6;
const BUILDING_COLOR = "#c9c4b8";

// §6 — restrained neutral road styling (never a hazard color, never
// colorful). "Major" gets a thicker solid line, "minor" (tracks/
// paths/etc.) a thinner dashed one — split into two layers since
// MapLibre's line-dasharray isn't a data-driven paint property.
// Categories not present in this dataset simply never match either
// filter and are never drawn — no assumption that they exist.
const MAJOR_HIGHWAY_CATEGORIES = [
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "living_street",
];
const MINOR_HIGHWAY_CATEGORIES = ["track", "path", "footway", "cycleway", "service", "bridleway"];
const ROAD_LINE_COLOR = "#b3ab9c";

// §8 — restrained blue, consistent with the rest of the app's
// established color meaning (blue = water/infrastructure). Provides
// geographic context only — never overpowers the buildings layer.
const WATER_COLOR = "#5f8fb3";

// §9/§13 — small, professional, visually lightweight labeled circles
// (a common cartographic POI convention) rather than a new icon-image
// pipeline — no new dependency, and the popup carries the full detail.
// Short category-letter glyphs avoid any culturally-specific symbol
// (e.g. a cross) for a mixed set of real amenity types.
const AMENITY_COLOR = "#7fa9c9";
// §10 — "moderate" pitch: buildings/roads/water/labels all stay
// legible and it stays practical for officer navigation, unlike the
// steeper 55-60° used by the dedicated 3D Terrain page (a different,
// more exploratory view).
const DEFAULT_PITCH = 45;
const DEFAULT_BEARING = 0;

const AMENITY_GLYPHS: Record<string, string> = {
  hospital: "H",
  clinic: "C",
  school: "S",
  college: "Co",
  kindergarten: "K",
  pharmacy: "Rx",
  community_centre: "CC",
  place_of_worship: "PW",
  fire_station: "F",
  police: "P",
  post_office: "PO",
  townhall: "T",
};

export interface VillageMapHandle {
  resetView: () => void;
  tiltUp: () => void;
  tiltDown: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToBuildings: () => void;
}

function boundsOfBuildings(collection: ApiBuildingFeatureCollection): LngLatBoundsLike | null {
  return combinedBounds([collection]);
}

// §17 — fitting only to building polygons is what caused the
// "isolated floating buildings" feeling: a tight crop that hides the
// surrounding roads/water/geographic context entirely. The initial
// auto-fit instead uses every real geometry layer available (roads +
// water, in addition to buildings), so the officer's first view shows
// the village IN its geographic setting, not just a building cluster.
function combinedBounds(
  collections: Array<{ features: { geometry: { coordinates: unknown } }[] } | null>,
): LngLatBoundsLike | null {
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

  for (const collection of collections) {
    if (!collection) continue;
    for (const feature of collection.features) visit(feature.geometry.coordinates);
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

export const VillageMap = forwardRef<
  VillageMapHandle,
  {
    geojsonState: GeojsonRequestState;
    onRetryGeojson: () => void;
    boundaries: ApiBoundaryFeatureCollection | null;
    buildings: ApiBuildingFeatureCollection | null;
    roads: ApiRoadFeatureCollection | null;
    water: ApiWaterFeatureCollection | null;
    amenities: ApiAmenityFeatureCollection | null;
    layerVisibility: VillageLayerVisibility;
    destinationCandidate?: ApiDestinationCandidate | null;
    onSelectDestination?: () => void;
  }
>(function VillageMap(
  {
    geojsonState,
    onRetryGeojson,
    boundaries,
    buildings,
    roads,
    water,
    amenities,
    layerVisibility,
    destinationCandidate = null,
    onSelectDestination,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreGlMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasFitToBuildingsRef = useRef(false);

  const feature = geojsonState.status === "success" ? geojsonState.feature : null;
  const onSelectDestinationRef = useRef(onSelectDestination);
  useEffect(() => {
    onSelectDestinationRef.current = onSelectDestination;
  });

  useImperativeHandle(ref, () => ({
    resetView: () => {
      const map = mapRef.current;
      if (!map || !feature) return;
      map.flyTo({
        center: feature.geometry.coordinates,
        zoom: INITIAL_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        duration: 600,
      });
    },
    tiltUp: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ pitch: Math.min(map.getPitch() + 10, 60), duration: 250 });
    },
    tiltDown: () => {
      const map = mapRef.current;
      if (map) map.easeTo({ pitch: Math.max(map.getPitch() - 10, 0), duration: 250 });
    },
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    fitToBuildings: () => {
      const map = mapRef.current;
      if (!map || !buildings) return;
      const bounds = boundsOfBuildings(buildings);
      if (bounds) map.fitBounds(bounds, { padding: 72, maxZoom: 18, duration: 600 });
    },
  }));

  // Create the map once, centered on the settlement (falls back to a
  // sensible default if the settlement fetch hasn't resolved yet).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreGlMap({
      container,
      style: MAP_STYLE_URL,
      center: feature?.geometry.coordinates ?? [78.781266, 30.167112],
      zoom: INITIAL_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      // Attaches the officer's bearer token to GSI tile requests only —
      // same technique as EvidenceMap.tsx/TerrainMap.tsx.
      transformRequest: (url) => {
        if (url.startsWith(GSI_LANDSLIDE_TILE_URL_TEMPLATE.split("{z}")[0])) {
          const token = getToken();
          return { url, headers: token ? { Authorization: `Bearer ${token}` } : {} };
        }
        return { url };
      },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true, showCompass: false }), "top-right");
    map.on("error", (event: ErrorEvent) => console.error("MapLibre map error:", event.error));

    const popup = new Popup({ offset: 12, closeButton: false });
    popupRef.current = popup;

    const markReady = () => {
      // Hide (not remove) the base style's own generic OSM building
      // layers — real, unmodified data, just not shown, so only
      // VIKALP's own verified Open Buildings layer represents
      // buildings on this map (see the module comment above).
      for (const id of STYLE_BUILDING_LAYER_IDS) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
      }
      setMapLoaded(true);
    };
    if (map.isStyleLoaded()) markReady();
    else map.on("load", markReady);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      setMapLoaded(false);
      hasFitToBuildingsRef.current = false;
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

  // §17 — auto-fit to the combined real geographic context (buildings
  // + roads + water, whichever have arrived) the first time any of
  // them is available for this settlement — not buildings alone,
  // which is what produced the "isolated floating buildings" view.
  // Runs once per settlement (not on every toggle/re-render); waits
  // briefly for roads/water to catch up to buildings before fitting,
  // since all three usually resolve within the same second.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !buildings || hasFitToBuildingsRef.current) return;
    const timer = window.setTimeout(() => {
      if (hasFitToBuildingsRef.current) return;
      const bounds = combinedBounds([buildings, roads, water]);
      if (bounds) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 17, duration: 0 });
        hasFitToBuildingsRef.current = true;
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [mapLoaded, buildings, roads, water]);

  // Buildings — real Open Buildings polygons, fill-extrusion with a
  // fixed, documented visualization height (never a real measurement).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!buildings || !layerVisibility.buildings) {
      if (map.getLayer(BUILDINGS_LAYER_ID)) map.removeLayer(BUILDINGS_LAYER_ID);
      if (map.getSource(BUILDINGS_SOURCE_ID)) map.removeSource(BUILDINGS_SOURCE_ID);
      return;
    }

    if (!map.getSource(BUILDINGS_SOURCE_ID)) {
      map.addSource(BUILDINGS_SOURCE_ID, { type: "geojson", data: buildings });
    }
    if (!map.getLayer(BUILDINGS_LAYER_ID)) {
      map.addLayer({
        id: BUILDINGS_LAYER_ID,
        type: "fill-extrusion",
        source: BUILDINGS_SOURCE_ID,
        paint: {
          "fill-extrusion-color": BUILDING_COLOR,
          "fill-extrusion-height": VISUALIZATION_EXTRUSION_METERS,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.85,
        },
      });
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildBuildingPopup(clicked.properties as ApiBuildingProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", BUILDINGS_LAYER_ID, handleClick);
    map.on("mouseenter", BUILDINGS_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", BUILDINGS_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", BUILDINGS_LAYER_ID, handleClick);
      map.off("mouseenter", BUILDINGS_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", BUILDINGS_LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, buildings, layerVisibility.buildings]);

  // Roads/paths — real OSM geometry. Inserted beneath the buildings
  // layer (§5 visual hierarchy: basemap -> roads -> buildings ->
  // markers) via `beforeId` when the buildings layer already exists;
  // this effect is declared after the buildings effect above so that
  // ordering holds on first mount too. Two line layers (no data-driven
  // dasharray support in MapLibre) plus one label layer, shown only
  // for the one real named segment in this dataset — never a name
  // invented for the rest.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!roads || !layerVisibility.roads) {
      for (const id of [ROADS_LABEL_LAYER_ID, ROADS_MINOR_LAYER_ID, ROADS_MAJOR_LAYER_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(ROADS_SOURCE_ID)) map.removeSource(ROADS_SOURCE_ID);
      return;
    }

    if (!map.getSource(ROADS_SOURCE_ID)) {
      map.addSource(ROADS_SOURCE_ID, { type: "geojson", data: roads });
    }
    const beforeId = map.getLayer(BUILDINGS_LAYER_ID) ? BUILDINGS_LAYER_ID : undefined;

    if (!map.getLayer(ROADS_MAJOR_LAYER_ID)) {
      map.addLayer(
        {
          id: ROADS_MAJOR_LAYER_ID,
          type: "line",
          source: ROADS_SOURCE_ID,
          filter: ["in", ["get", "highway"], ["literal", MAJOR_HIGHWAY_CATEGORIES]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ROAD_LINE_COLOR,
            "line-width": [
              "match",
              ["get", "highway"],
              ["motorway", "trunk", "primary", "secondary"],
              3,
              ["tertiary"],
              2.2,
              1.4,
            ],
            "line-opacity": 0.85,
          },
        },
        beforeId,
      );
    }
    if (!map.getLayer(ROADS_MINOR_LAYER_ID)) {
      map.addLayer(
        {
          id: ROADS_MINOR_LAYER_ID,
          type: "line",
          source: ROADS_SOURCE_ID,
          filter: ["in", ["get", "highway"], ["literal", MINOR_HIGHWAY_CATEGORIES]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ROAD_LINE_COLOR,
            "line-width": 1,
            "line-opacity": 0.6,
            "line-dasharray": [2, 1.5],
          },
        },
        beforeId,
      );
    }
    if (!map.getLayer(ROADS_LABEL_LAYER_ID)) {
      map.addLayer({
        id: ROADS_LABEL_LAYER_ID,
        type: "symbol",
        source: ROADS_SOURCE_ID,
        filter: ["has", "name"],
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#d9d4c6",
          "text-halo-color": "#12140f",
          "text-halo-width": 1.2,
        },
      });
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildRoadPopup(clicked.properties as ApiRoadProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    for (const id of [ROADS_MAJOR_LAYER_ID, ROADS_MINOR_LAYER_ID]) {
      map.on("click", id, handleClick);
      map.on("mouseenter", id, handleMouseEnter);
      map.on("mouseleave", id, handleMouseLeave);
    }

    return () => {
      for (const id of [ROADS_MAJOR_LAYER_ID, ROADS_MINOR_LAYER_ID]) {
        map.off("click", id, handleClick);
        map.off("mouseenter", id, handleMouseEnter);
        map.off("mouseleave", id, handleMouseLeave);
      }
    };
  }, [mapLoaded, roads, layerVisibility.roads]);

  // Water — real OSM stream/water-body geometry. Inserted beneath
  // roads (§13 visual hierarchy: basemap -> water -> roads ->
  // buildings), declared after the roads effect so `beforeId` can
  // find the roads-major layer on first mount too. Handles both
  // LineString (stream) and Polygon (water body) geometry in one
  // source, since a single real feature can be either.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!water || !layerVisibility.water) {
      for (const id of [WATER_LINE_LAYER_ID, WATER_FILL_LAYER_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(WATER_SOURCE_ID)) map.removeSource(WATER_SOURCE_ID);
      return;
    }

    if (!map.getSource(WATER_SOURCE_ID)) {
      map.addSource(WATER_SOURCE_ID, { type: "geojson", data: water });
    }
    const beforeId = map.getLayer(ROADS_MAJOR_LAYER_ID)
      ? ROADS_MAJOR_LAYER_ID
      : map.getLayer(BUILDINGS_LAYER_ID)
        ? BUILDINGS_LAYER_ID
        : undefined;

    if (!map.getLayer(WATER_FILL_LAYER_ID)) {
      map.addLayer(
        {
          id: WATER_FILL_LAYER_ID,
          type: "fill",
          source: WATER_SOURCE_ID,
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": WATER_COLOR, "fill-opacity": 0.35 },
        },
        beforeId,
      );
    }
    if (!map.getLayer(WATER_LINE_LAYER_ID)) {
      map.addLayer(
        {
          id: WATER_LINE_LAYER_ID,
          type: "line",
          source: WATER_SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": WATER_COLOR, "line-width": 1.6, "line-opacity": 0.75 },
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
        .setDOMContent(buildWaterPopup(clicked.properties as ApiWaterProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    for (const id of [WATER_LINE_LAYER_ID, WATER_FILL_LAYER_ID]) {
      map.on("click", id, handleClick);
      map.on("mouseenter", id, handleMouseEnter);
      map.on("mouseleave", id, handleMouseLeave);
    }

    return () => {
      for (const id of [WATER_LINE_LAYER_ID, WATER_FILL_LAYER_ID]) {
        map.off("click", id, handleClick);
        map.off("mouseenter", id, handleMouseEnter);
        map.off("mouseleave", id, handleMouseLeave);
      }
    };
  }, [mapLoaded, water, layerVisibility.water]);

  // Services/POIs — real, distance-filtered OSM amenity points (§9).
  // Declared after buildings/roads/water so it naturally lands above
  // them (no beforeId needed) and before boundaries/settlement/
  // evidence below so those still end up on top, per §13's hierarchy.
  // Small labeled circles, not a new icon-image pipeline.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!amenities || !layerVisibility.services) {
      for (const id of [AMENITIES_LABEL_LAYER_ID, AMENITIES_CIRCLE_LAYER_ID]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource(AMENITIES_SOURCE_ID)) map.removeSource(AMENITIES_SOURCE_ID);
      return;
    }

    if (!map.getSource(AMENITIES_SOURCE_ID)) {
      map.addSource(AMENITIES_SOURCE_ID, { type: "geojson", data: amenities });
    }
    if (!map.getLayer(AMENITIES_CIRCLE_LAYER_ID)) {
      map.addLayer({
        id: AMENITIES_CIRCLE_LAYER_ID,
        type: "circle",
        source: AMENITIES_SOURCE_ID,
        paint: {
          "circle-radius": 7,
          "circle-color": AMENITY_COLOR,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
    if (!map.getLayer(AMENITIES_LABEL_LAYER_ID)) {
      const glyphExpression: (string | string[])[] = ["match", ["get", "amenity"]];
      for (const [key, glyph] of Object.entries(AMENITY_GLYPHS)) {
        glyphExpression.push(key, glyph);
      }
      glyphExpression.push("?");
      map.addLayer({
        id: AMENITIES_LABEL_LAYER_ID,
        type: "symbol",
        source: AMENITIES_SOURCE_ID,
        layout: {
          "text-field": glyphExpression as unknown as string,
          "text-size": 10,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#12140f" },
      });
    }

    const popup = popupRef.current;
    const handleClick = (event: MapLayerMouseEvent) => {
      const clicked = event.features?.[0] as MapGeoJSONFeature | undefined;
      if (!clicked || !popup) return;
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(buildAmenityPopup(clicked.properties as ApiAmenityProperties))
        .addTo(map);
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    map.on("click", AMENITIES_CIRCLE_LAYER_ID, handleClick);
    map.on("mouseenter", AMENITIES_CIRCLE_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", AMENITIES_CIRCLE_LAYER_ID, handleMouseLeave);

    return () => {
      map.off("click", AMENITIES_CIRCLE_LAYER_ID, handleClick);
      map.off("mouseenter", AMENITIES_CIRCLE_LAYER_ID, handleMouseEnter);
      map.off("mouseleave", AMENITIES_CIRCLE_LAYER_ID, handleMouseLeave);
    };
  }, [mapLoaded, amenities, layerVisibility.services]);

  // District boundary — real geoBoundaries polygon.
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
        paint: { "line-color": "#d9b56a", "line-width": 1.3, "line-opacity": 0.75 },
      });
    }
  }, [mapLoaded, boundaries, layerVisibility.boundaries]);

  // Settlement point — real, single point + real (demo-labeled) elevation.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!feature || !layerVisibility.settlement) {
      if (map.getLayer(SETTLEMENT_LABEL_LAYER_ID)) map.removeLayer(SETTLEMENT_LABEL_LAYER_ID);
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
    // §13 — the settlement's own real name, always shown (not
    // zoom-gated like the other geographic labels), since it's the
    // one label every officer landing on this map needs immediately.
    if (!map.getLayer(SETTLEMENT_LABEL_LAYER_ID)) {
      map.addLayer({
        id: SETTLEMENT_LABEL_LAYER_ID,
        type: "symbol",
        source: SETTLEMENT_SOURCE_ID,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 13,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ece9e2",
          "text-halo-color": "#12140f",
          "text-halo-width": 1.4,
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
    map.on("click", SETTLEMENT_LAYER_ID, handleClick);
    return () => {
      map.off("click", SETTLEMENT_LAYER_ID, handleClick);
    };
  }, [mapLoaded, feature, layerVisibility.settlement]);

  // Destination candidate — only drawn when a real, VIKALP-approved
  // candidate exists (Task 43/45.9's existing behavior, unchanged: no
  // toggle, never a fabricated route line to it).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (
      !destinationCandidate ||
      destinationCandidate.latitude === null ||
      destinationCandidate.longitude === null
    ) {
      if (map.getLayer(DESTINATION_LAYER_ID)) map.removeLayer(DESTINATION_LAYER_ID);
      if (map.getSource(DESTINATION_SOURCE_ID)) map.removeSource(DESTINATION_SOURCE_ID);
      return;
    }

    const destCoords: [number, number] = [
      destinationCandidate.longitude,
      destinationCandidate.latitude,
    ];
    if (!map.getSource(DESTINATION_SOURCE_ID)) {
      map.addSource(DESTINATION_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Point", coordinates: destCoords }, properties: {} },
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
    const popup = popupRef.current;
    const handleClick = () => {
      if (!popup) return;
      popup.setLngLat(destCoords).setDOMContent(buildDestinationPopup(destinationCandidate)).addTo(map);
      onSelectDestinationRef.current?.();
    };
    map.on("click", DESTINATION_LAYER_ID, handleClick);
    return () => {
      map.off("click", DESTINATION_LAYER_ID, handleClick);
    };
  }, [mapLoaded, destinationCandidate]);

  // Historical evidence — real Mapbox Vector Tile source (Task 45.8),
  // same technique as EvidenceMap.tsx/TerrainMap.tsx.
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
    map.on("click", GSI_LAYER_ID, handleClick);
    return () => {
      map.off("click", GSI_LAYER_ID, handleClick);
    };
  }, [mapLoaded, layerVisibility.evidence]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full" />

      {!feature && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-vikalp-card text-center">
          {geojsonState.status === "loading" && (
            <span className="text-sm text-vikalp-text-secondary">Loading map…</span>
          )}
          {geojsonState.status === "error" && (
            <>
              <span className="text-sm font-medium text-vikalp-critical">
                Settlement location could not be loaded.
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

      {feature && !mapLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-vikalp-card">
          <span className="text-sm text-vikalp-text-secondary">Loading map layers…</span>
        </div>
      )}
    </div>
  );
});
