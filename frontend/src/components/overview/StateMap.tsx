import L, { type LatLngBoundsExpression } from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  AdvancedMap,
  type AdvancedMapHandle,
  type AdvancedMapMarker,
  type AdvancedMapPolygon,
} from "./leaflet/AdvancedMap";
import type { ApiBoundaryFeatureCollection, ApiLandslideFeatureCollection } from "../../types/gis";
import type { ApiSettlement } from "../../types/settlement";
import type { ApiWeatherSummary } from "../../types/weather";
import { isRaining, weatherGlyph } from "../../utils/weatherIcon";

// Task — "integrate the provided interactive map into VIKALP Overview."
// Before this task, the Overview map was MapLibre GL (see Task 45.7's
// worker-bundling fix, still fully intact and untouched for every
// other page). The user explicitly approved the supplied React-Leaflet
// `AdvancedMap` component for Overview specifically — an intentional,
// scoped exception, not a project-wide library switch. Map
// Intelligence (IntelligenceMap.tsx) and Relocation (RelocationMap.tsx)
// keep MapLibre; only this file's internals changed. `StateMap`'s own
// exported name, its prop interface, and `StateMapHandle` are all
// unchanged, so AppShell.tsx — the only caller — needed zero edits.
//
// This file is the VIKALP-data adapter: it converts real boundaries/
// settlements/landslides (already fetched by AppShell, same as before)
// into AdvancedMap's generic marker/polygon props, and owns every
// VIKALP-specific UI element that isn't really a "map" concern —
// the weather card, the legend, the control button stack, the
// reduced-detail notice — exactly as StateMap.tsx already did for
// MapLibre. See ./leaflet/AdvancedMap.tsx's own module comment for
// what was deliberately dropped/changed from the supplied demo
// component (external marker-icon CDN, Nominatim search, Locate Me/
// Satellite/Traffic controls, London/Hyde Park demo data).
const UTTARAKHAND_CENTER: [number, number] = [30.1, 79.3]; // [lat, lng]
const UTTARAKHAND_ZOOM = 7.2;
const TERRAIN_REAL_MAXZOOM = 8;

export interface StateMapHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
}

// Same "average every real vertex, don't fabricate a centroid" bbox
// helper StateMap has always used (Task 44/45), now returning a
// Leaflet-ordered [lat, lng] bounds instead of MapLibre's [lng, lat]
// tuple pair.
function bboxOfGeoJSON(coordinates: unknown): LatLngBoundsExpression | null {
  const points: [number, number][] = [];
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      points.push([node[0] as number, node[1] as number]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(coordinates);
  if (points.length === 0) return null;
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  );
}

// Recursively swaps GeoJSON's [lon, lat] vertex order to Leaflet's
// [lat, lng] order, preserving nesting depth — works unchanged for a
// Polygon's rings or a MultiPolygon's polygons-of-rings, since Leaflet
// Polygon accepts either nesting directly as `positions`.
function swapLonLat(node: unknown): unknown {
  if (!Array.isArray(node)) return node;
  if (typeof node[0] === "number" && typeof node[1] === "number") {
    return [node[1], node[0]];
  }
  return node.map(swapLonLat);
}

function isPointCoordinates(coords: unknown): coords is [number, number] {
  return Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number";
}

export const StateMap = forwardRef<
  StateMapHandle,
  {
    boundaries: ApiBoundaryFeatureCollection | null;
    settlements: ApiSettlement[];
    landslides: ApiLandslideFeatureCollection | null;
    weather: ApiWeatherSummary | null;
    selectedDistrict: string | null;
    selectedSettlementId: number | null;
    onSelectSettlement: (id: number) => void;
  }
>(function StateMap(
  { boundaries, settlements, landslides, weather, selectedDistrict, selectedSettlementId, onSelectSettlement },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const advancedMapRef = useRef<AdvancedMapHandle | null>(null);
  const initialFitDoneRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(UTTARAKHAND_ZOOM);
  const [evidenceLayerVisible, setEvidenceLayerVisible] = useState(true);

  useImperativeHandle(ref, () => ({
    resetView: () => advancedMapRef.current?.resetView(),
    zoomIn: () => advancedMapRef.current?.zoomIn(),
    zoomOut: () => advancedMapRef.current?.zoomOut(),
    toggleFullscreen: () => {
      const container = containerRef.current;
      if (!container) return;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void container.requestFullscreen();
    },
  }));

  // Real Uttarakhand district bbox, once boundaries load — resetView()
  // and the one-time initial fit below both prefer this over the
  // UTTARAKHAND_CENTER/ZOOM guess (same reasoning as the MapLibre
  // version's stateBoundsRef, Task 45 §7).
  const resetBounds = useMemo(
    () => (boundaries ? bboxOfGeoJSON(boundaries.features.map((f) => f.geometry.coordinates)) : null),
    [boundaries],
  );

  useEffect(() => {
    if (!resetBounds || initialFitDoneRef.current) return;
    if (selectedDistrict || selectedSettlementId !== null) return;
    advancedMapRef.current?.fitToBounds(resetBounds);
    initialFitDoneRef.current = true;
  }, [resetBounds, selectedDistrict, selectedSettlementId]);

  // Deliberate, user-driven navigation only (Task 44 §20 / 45.7's own
  // fix for this exact effect) — does nothing when neither is
  // selected, so it never fights the initial fit above or re-issues a
  // redundant camera animation on unrelated data arrival.
  useEffect(() => {
    if (selectedSettlementId !== null) {
      const settlement = settlements.find((s) => s.id === selectedSettlementId);
      if (settlement) {
        advancedMapRef.current?.flyToPoint([settlement.latitude, settlement.longitude], 12);
      }
      return;
    }
    if (selectedDistrict && boundaries) {
      const feature = boundaries.features.find((f) => f.properties.shapeName === selectedDistrict);
      const bounds = feature ? bboxOfGeoJSON(feature.geometry.coordinates) : null;
      if (bounds) advancedMapRef.current?.fitToBounds(bounds);
    }
  }, [selectedDistrict, selectedSettlementId, settlements, boundaries]);

  // Real settlement markers only — never invents one. Data-driven from
  // whatever the officer's District/Search filters currently resolve
  // to (AppShell.tsx), never hardcoded to the pilot settlement.
  const settlementMarkers = useMemo<AdvancedMapMarker[]>(
    () =>
      settlements.map((s) => ({
        id: s.id,
        position: [s.latitude, s.longitude],
        variant: s.id === selectedSettlementId ? "settlement-selected" : "settlement",
        tooltip: s.name,
        popupTitle: s.name,
        popupLines: [
          `${s.district}, ${s.state}`,
          `Population: ${s.population}`,
          `Households: ${s.households}`,
        ],
      })),
    [settlements, selectedSettlementId],
  );

  // Real GSI/NLFC landslide inventory evidence — labeled "GSI
  // Inventory Evidence" and explicitly disclaimed as contextual, never
  // a risk/danger/predicted-landslide indicator (Task brief §7). Only
  // the four fields the backend actually returns (slide_no, activity,
  // triggering, toposheet — backend/app/services/gis.py) are shown;
  // "Not available" for whichever of those this particular record
  // doesn't carry, never a fabricated value.
  const evidenceMarkers = useMemo<AdvancedMapMarker[]>(() => {
    if (!landslides) return [];
    return landslides.features
      .filter((f) => f.geometry.type === "Point" && isPointCoordinates(f.geometry.coordinates))
      .map((f, index) => {
        const [lon, lat] = f.geometry.coordinates as [number, number];
        const p = f.properties;
        return {
          id: p.slide_no ?? `landslide-${index}`,
          position: [lat, lon],
          variant: "evidence",
          popupTitle: "GSI Inventory Evidence",
          popupLines: [
            `Slide no: ${p.slide_no ?? "Not available"}`,
            `Activity: ${p.activity ?? "Not available"}`,
            `Triggering: ${p.triggering ?? "Not available"}`,
            `Toposheet: ${p.toposheet ?? "Not available"}`,
            "Contextual evidence, not an assessed risk zone.",
          ],
        } satisfies AdvancedMapMarker;
      });
  }, [landslides]);

  // Real district boundaries — every district styled the same muted
  // tone except the selected one (gold), matching the brief's §8 ("do
  // not make all districts gold"). `shapeName` is an exact match here
  // (not the lenient substring reconciliation AppShell.tsx uses for
  // settlement.district — selectedDistrict always comes from this same
  // boundaries dataset's own shapeName list, see AppShell's `districts`
  // memo), so exact equality is correct and sufficient.
  const districtPolygons = useMemo<AdvancedMapPolygon[]>(() => {
    if (!boundaries) return [];
    return boundaries.features.map((f, index) => ({
      id: f.properties.shapeID ?? f.properties.shapeName ?? `district-${index}`,
      positions: swapLonLat(f.geometry.coordinates) as AdvancedMapPolygon["positions"],
      selected: f.properties.shapeName === selectedDistrict,
      label: f.properties.shapeName ?? undefined,
    }));
  }, [boundaries, selectedDistrict]);

  const handleMarkerClick = (marker: AdvancedMapMarker) => {
    if (marker.variant === "settlement" || marker.variant === "settlement-selected") {
      onSelectSettlement(Number(marker.id));
    }
  };

  const raining = weather ? isRaining(weather.weather_code) : false;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-vikalp-card border border-vikalp-border">
      <div ref={containerRef} className="h-full w-full">
        <AdvancedMap
          ref={advancedMapRef}
          center={UTTARAKHAND_CENTER}
          zoom={UTTARAKHAND_ZOOM}
          resetBounds={resetBounds}
          markers={settlementMarkers}
          clusteredMarkers={evidenceLayerVisible ? evidenceMarkers : []}
          polygons={districtPolygons}
          onMarkerClick={handleMarkerClick}
          enableClustering
          onZoomChange={setCurrentZoom}
        />
      </div>

      {/* Real weather marker — Bhitai Malli's own coordinates only,
          shown only when real weather data says rain is occurring/
          forecast. Unchanged from the MapLibre version. */}
      {weather && raining && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 z-1200 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-90"
          aria-hidden="true"
        >
          {weatherGlyph(weather.weather_code)}
        </div>
      )}

      {/* Map controls — compact dark stacked buttons (Task 44 §9),
          now driving AdvancedMapHandle instead of the MapLibre map
          object directly. GSI toggle is new: "layer visibility" is one
          of the brief's §10 explicitly-kept control types, and 800+
          evidence points benefit from being hideable independent of
          settlement markers/boundaries.
          `z-1200` (here and on every other overlay below) is
          required, not decorative: Leaflet's own control container
          uses z-index 1000 and its interactive panes (tooltip/popup)
          go up to 700, so without an explicit higher z-index a
          district boundary or marker can end up receiving clicks
          meant for these buttons after certain pan/zoom sequences —
          confirmed reproducible during this task's own browser
          verification before this fix was added. */}
      <div className="absolute left-2 top-2 z-1200 flex flex-col gap-1 rounded-md border border-vikalp-border bg-vikalp-card/95 p-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => advancedMapRef.current?.zoomIn()}
          className="flex h-7 w-7 items-center justify-center rounded text-vikalp-navy transition-colors hover:bg-vikalp-bg"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => advancedMapRef.current?.zoomOut()}
          className="flex h-7 w-7 items-center justify-center rounded text-vikalp-navy transition-colors hover:bg-vikalp-bg"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={() => advancedMapRef.current?.resetView()}
          className="flex h-7 w-7 items-center justify-center rounded text-vikalp-navy transition-colors hover:bg-vikalp-bg"
        >
          ⟲
        </button>
        <button
          type="button"
          aria-label="Toggle fullscreen"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void container.requestFullscreen();
          }}
          className="flex h-7 w-7 items-center justify-center rounded text-vikalp-navy transition-colors hover:bg-vikalp-bg"
        >
          ⛶
        </button>
        <button
          type="button"
          aria-pressed={evidenceLayerVisible}
          aria-label="Toggle GSI evidence layer"
          onClick={() => setEvidenceLayerVisible((v) => !v)}
          className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold transition-colors ${
            evidenceLayerVisible
              ? "bg-vikalp-navy/20 text-vikalp-navy"
              : "text-vikalp-text-secondary hover:bg-vikalp-bg"
          }`}
        >
          GSI
        </button>
      </div>

      {/* Legend — only layers that actually exist. */}
      <div className="absolute bottom-2 left-2 z-1200 flex flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2 text-[12px] text-vikalp-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#e8c876]" aria-hidden="true" />
          Gold — Selected settlement
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c1622f]" aria-hidden="true" />
          Red/Orange — GSI inventory evidence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-[#6b6656]" aria-hidden="true" />
          Muted — District boundary
        </span>
        <span className="border-t border-vikalp-border pt-1 text-[11px]">
          GSI inventory evidence is not an assessed risk zone.
        </span>
      </div>

      {/* Floating current-weather card — real data only. Unchanged from
          the MapLibre version (Task 45.7 §6/§15): explicitly scoped to
          Bhitai Malli, never implied to be statewide. */}
      <div className="absolute right-2 top-2 z-1200 flex w-52 flex-col gap-1.5 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-2.5 shadow-lg">
        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-vikalp-text">
          <span aria-hidden="true">{weather ? weatherGlyph(weather.weather_code) : "☁"}</span>
          Pilot Location Weather
        </span>
        <span className="text-[12px] text-vikalp-text-secondary">
          {weather ? weather.location_name.split(",")[0] : "Bhitai Malli"}
        </span>
        {weather ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-vikalp-text">{weather.condition}</span>
              <span className="text-xl font-semibold text-vikalp-text">
                {Math.round(weather.temperature_c)}°C
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px] text-vikalp-text-secondary">
              <span>Humidity {Math.round(weather.humidity_percent)}%</span>
              <span>Wind {Math.round(weather.wind_speed_kmh)} km/h</span>
            </div>
          </>
        ) : (
          <span className="text-[13px] text-vikalp-text-secondary">Weather data unavailable</span>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-1/2 z-1200 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="rounded-md border border-vikalp-border bg-vikalp-card/90 px-2 py-0.5 text-[11px] text-vikalp-text-secondary">
          Interactive basemap — Esri World Physical Map, not an official GIS layer
        </div>
        {currentZoom > TERRAIN_REAL_MAXZOOM + 2 && (
          <div className="rounded-md border border-vikalp-border bg-vikalp-card/90 px-2 py-0.5 text-[11px] text-vikalp-text-secondary">
            Basemap imagery shown at reduced detail beyond zoom {TERRAIN_REAL_MAXZOOM}
          </div>
        )}
      </div>
    </div>
  );
});
