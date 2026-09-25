// Shape of GET /api/settlements/{id}/roads — matches
// backend/app/schemas/roads.py. Real OpenStreetMap `highway=*` tags
// only; do not add fields the backend doesn't return, and never
// invent a road name or category the source data doesn't have.

export interface ApiRoadProperties {
  highway: string | null;
  name: string | null;
  surface: string | null;
  osm_way_id: number | null;
  source: string;
}

export interface ApiRoadFeature {
  type: "Feature";
  geometry: GeoJSON.LineString;
  properties: ApiRoadProperties;
}

export interface ApiRoadFeatureCollection {
  type: "FeatureCollection";
  features: ApiRoadFeature[];
}

export type RoadsRequestState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiRoadFeatureCollection };
