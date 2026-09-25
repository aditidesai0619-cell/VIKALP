export interface DemoSettlement {
  name: string;
  district: string;
  state: string;
  population: number;
  households: number;
  elevationMeters: number;
  slopeDegrees: number;
  latitude: number;
  longitude: number;
  dataQualityNote: string;
}

// Shape of GET /api/settlements/{id} — matches backend/app/schemas/settlement.py.
// Do not add fields the backend doesn't return.
export interface ApiSettlement {
  id: number;
  name: string;
  district: string;
  state: string;
  population: number;
  households: number;
  elevation_m: number;
  slope_degrees: number;
  latitude: number;
  longitude: number;
  data_note: string;
}

// Shared by every Overview component that displays the fetched settlement
// (SettlementEvidencePanel) — the fetch itself happens once, in
// AppShell, and this state is passed down as props.
export type SettlementRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; settlement: ApiSettlement };

// Shape of GET /api/settlements/{id}/geojson — matches
// backend/app/schemas/settlement.py's SettlementGeoJSONFeature. Do not
// add fields the backend doesn't return.
export interface ApiSettlementGeoJSONFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    // [longitude, latitude] — GeoJSON coordinate order.
    coordinates: [number, number];
  };
  properties: {
    id: number;
    name: string;
    district: string;
    state: string;
    population: number;
    households: number;
    elevation_m: number;
    slope_degrees: number;
    data_status: string;
    data_quality: string;
    crs_note: string;
  };
}

// Owned by AppShell (its own fetch, separate from SettlementRequestState
// above) and passed to IntelligenceMap — a different resource/shape, not
// a duplicate of the settlement fetch.
export type GeojsonRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; feature: ApiSettlementGeoJSONFeature };
