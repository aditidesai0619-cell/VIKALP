import L, {
  type LatLngBoundsExpression,
  type LatLngExpression,
  type PathOptions,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "./advancedMap.css";

// Task — "integrate the provided interactive map" brief supplied a
// generic `AdvancedMap` demo component (React-Leaflet MapContainer/
// TileLayer/Marker/Popup/Circle/Polygon/Polyline/MarkerClusterGroup,
// London/Westminster/Hyde Park example data, Nominatim search, a
// "Locate Me"/"Satellite"/"Traffic" control panel, default blue-pin
// marker icons loaded from an external CDN). None of that demo
// configuration is used here — see this file's own choices below and
// docs/DECISIONS.md for the full inspection this integration was
// based on. This is the same component, adapted:
//
// - No external marker-icon CDN (`L.Icon.Default.mergeOptions(...)`
//   pointing at cdn.21st.dev in the supplied file): every marker uses
//   a small inline `L.divIcon` built from plain CSS (advancedMap.css)
//   instead of an image, which is also how "gold selected settlement /
//   restrained red-orange GSI evidence" is expressed per the brief's
//   §6-7 palette — an image-based pin can't do that cleanly anyway.
// - No Nominatim `SearchControl`: VIKALP already has a real settlement
//   search (OverviewFilterBar's "Search settlement" field, wired to
//   the same SelectionContext this map reads) — the brief's own §11
//   says reuse it, not replace it with external geocoding. This
//   component therefore has no `enableSearch` prop at all; there is
//   nothing here for it to enable.
// - No "Locate Me" / "Satellite" / "Traffic" `CustomControls`: none of
//   the three have a genuine VIKALP data source (no user-location
//   requirement, no supported satellite tile source, no traffic feed)
//   — the brief's §10 says not to add them without one. Zoom/reset/
//   fullscreen controls exist instead, rendered by StateMap.tsx (the
//   Overview-specific wrapper around this component) using this
//   component's exposed ref handle, so they can be styled with
//   VIKALP's own dark/gold button chrome instead of Leaflet's default
//   white control box.
// - `circles`/`polylines` props from the supplied API are dropped, not
//   just left empty: VIKALP has no verified circular buffer zone or
//   route/road dataset to plot, and the brief's §17 forbids
//   placeholder layers. `markers` (unclustered — settlement points,
//   which must always stay individually visible/selectable) and
//   `clusteredMarkers` (optionally clustered — GSI evidence, where
//   Task brief §7 explicitly asks for clustering) replace the
//   original single `markers` array, since a single officer-selectable
//   settlement marker disappearing into a cluster with 800+ evidence
//   points would break settlement selection.
//
// TileLayer uses the same Esri World_Physical_Map source already
// verified real (to zoom 8) for MapLibre's Overview basemap in Task
// 45.7 — natural green/olive/brown/white/blue relief, not OpenStreetMap
// road tiles (which read as a street map, not "natural geographic"
// per the brief's §6) and not a fabricated satellite layer.
const TERRAIN_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}";
const TERRAIN_ATTRIBUTION = "Esri, USGS, NOAA — physical/relief basemap";
const TERRAIN_REAL_MAXZOOM = 8;

const MUTED_BOUNDARY_STYLE: PathOptions = {
  color: "#6b6656",
  weight: 1.1,
  opacity: 0.55,
  fillColor: "#a8822f",
  fillOpacity: 0.015,
};
const SELECTED_BOUNDARY_STYLE: PathOptions = {
  color: "#e8c876",
  weight: 2.4,
  opacity: 0.95,
  fillColor: "#a8822f",
  fillOpacity: 0.07,
};

const SETTLEMENT_ICON = L.divIcon({
  className: "vikalp-marker",
  html: '<span class="vikalp-dot vikalp-dot--settlement"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const SETTLEMENT_SELECTED_ICON = L.divIcon({
  className: "vikalp-marker",
  html: '<span class="vikalp-halo"></span><span class="vikalp-dot vikalp-dot--settlement-selected"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
const EVIDENCE_ICON = L.divIcon({
  className: "vikalp-marker",
  html: '<span class="vikalp-dot vikalp-dot--evidence"></span>',
  iconSize: [9, 9],
  iconAnchor: [4, 4],
});

function iconForVariant(variant: AdvancedMapMarker["variant"]): L.DivIcon {
  if (variant === "settlement-selected") return SETTLEMENT_SELECTED_ICON;
  if (variant === "settlement") return SETTLEMENT_ICON;
  return EVIDENCE_ICON;
}

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 26 : count < 50 ? 32 : 38;
  return L.divIcon({
    className: "vikalp-marker",
    html: `<div class="vikalp-cluster-inner" style="width:${size}px;height:${size}px;">${count}</div>`,
    iconSize: L.point(size, size, true),
  });
}

export interface AdvancedMapMarker {
  id: string | number;
  /** [lat, lng] — Leaflet order, already converted from any GeoJSON source. */
  position: [number, number];
  variant: "settlement" | "settlement-selected" | "evidence";
  /** Permanent on-map label (used for settlement names, never for evidence — 800+ permanent evidence labels would make the map unreadable). */
  tooltip?: string;
  popupTitle?: string;
  /** Short, concrete lines only — no long paragraphs (Task brief §12). */
  popupLines?: string[];
}

export interface AdvancedMapPolygon {
  id: string | number;
  positions: LatLngExpression[] | LatLngExpression[][] | LatLngExpression[][][];
  selected?: boolean;
  label?: string;
}

export interface AdvancedMapHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToBounds: (bounds: LatLngBoundsExpression) => void;
  flyToPoint: (position: [number, number], zoom: number) => void;
}

function MapController({
  handleRef,
  center,
  zoom,
  resetBounds,
  onZoomChange,
  onMapClick,
}: {
  handleRef: React.ForwardedRef<AdvancedMapHandle>;
  center: [number, number];
  zoom: number;
  resetBounds: LatLngBoundsExpression | null;
  onZoomChange?: (zoom: number) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  const resetBoundsRef = useRef(resetBounds);
  const callbacksRef = useRef({ onZoomChange, onMapClick });

  useEffect(() => {
    resetBoundsRef.current = resetBounds;
  }, [resetBounds]);
  useEffect(() => {
    callbacksRef.current = { onZoomChange, onMapClick };
  });

  useMapEvents({
    zoomend: () => callbacksRef.current.onZoomChange?.(map.getZoom()),
    click: (event) =>
      callbacksRef.current.onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });

  useImperativeHandle(
    handleRef,
    () => ({
      resetView: () => {
        if (resetBoundsRef.current) {
          map.flyToBounds(resetBoundsRef.current, { padding: [56, 56], duration: 0.6 });
        } else {
          map.flyTo(center, zoom, { duration: 0.6 });
        }
      },
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      fitToBounds: (bounds) => map.flyToBounds(bounds, { padding: [56, 56], duration: 0.6 }),
      flyToPoint: (position, targetZoom) => map.flyTo(position, targetZoom, { duration: 0.7 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map],
  );

  return null;
}

export const AdvancedMap = forwardRef<
  AdvancedMapHandle,
  {
    center: [number, number];
    zoom: number;
    /** Real Uttarakhand district bbox, once boundaries have loaded — resetView()/the initial fit prefer this over center/zoom. */
    resetBounds?: LatLngBoundsExpression | null;
    markers?: AdvancedMapMarker[];
    clusteredMarkers?: AdvancedMapMarker[];
    polygons?: AdvancedMapPolygon[];
    onMarkerClick?: (marker: AdvancedMapMarker) => void;
    onMapClick?: (latlng: { lat: number; lng: number }) => void;
    enableClustering?: boolean;
    onZoomChange?: (zoom: number) => void;
    className?: string;
    style?: CSSProperties;
  }
>(function AdvancedMap(
  {
    center,
    zoom,
    resetBounds = null,
    markers = [],
    clusteredMarkers = [],
    polygons = [],
    onMarkerClick,
    onMapClick,
    enableClustering = true,
    onZoomChange,
    className = "",
    style = { height: "100%", width: "100%" },
  },
  ref,
) {
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  });

  const renderMarker = (marker: AdvancedMapMarker): ReactNode => (
    <Marker
      key={marker.id}
      position={marker.position}
      icon={iconForVariant(marker.variant)}
      eventHandlers={{ click: () => onMarkerClickRef.current?.(marker) }}
    >
      {marker.tooltip && (
        <Tooltip permanent direction="top" offset={[0, -10]} className="vikalp-settlement-label">
          {marker.tooltip}
        </Tooltip>
      )}
      {marker.popupTitle && (
        <Popup>
          <span className="vikalp-popup-title">{marker.popupTitle}</span>
          {marker.popupLines?.map((line) => (
            <span key={line} className="vikalp-popup-line" style={{ display: "block" }}>
              {line}
            </span>
          ))}
        </Popup>
      )}
    </Marker>
  );

  return (
    <div className={`vikalp-leaflet-container ${className}`} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={TERRAIN_ATTRIBUTION}
          url={TERRAIN_TILE_URL}
          tileSize={256}
          maxNativeZoom={TERRAIN_REAL_MAXZOOM}
          maxZoom={16}
        />

        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.positions}
            pathOptions={polygon.selected ? SELECTED_BOUNDARY_STYLE : MUTED_BOUNDARY_STYLE}
          >
            {polygon.label && (
              <Tooltip permanent direction="center" className="vikalp-district-label" opacity={1}>
                {polygon.label}
              </Tooltip>
            )}
          </Polygon>
        ))}

        {markers.map(renderMarker)}

        {enableClustering ? (
          <MarkerClusterGroup iconCreateFunction={createClusterIcon} maxClusterRadius={60}>
            {clusteredMarkers.map(renderMarker)}
          </MarkerClusterGroup>
        ) : (
          clusteredMarkers.map(renderMarker)
        )}

        <MapController
          handleRef={ref}
          center={center}
          zoom={zoom}
          resetBounds={resetBounds}
          onZoomChange={onZoomChange}
          onMapClick={onMapClick}
        />
      </MapContainer>
    </div>
  );
});
