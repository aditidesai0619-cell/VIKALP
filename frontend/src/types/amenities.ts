// Shape of GET /api/settlements/{id}/services — matches
// backend/app/schemas/amenities.py. Real OpenStreetMap `amenity=*`
// points only; never invent capacity, staffing, hours, quality, or
// ownership — none of those exist in the source.

export interface ApiAmenityProperties {
  amenity: string;
  name: string | null;
  osm_id: number | null;
  osm_type: string | null;
  distance_m: number | null;
  source: string;
}

export interface ApiAmenityFeature {
  type: "Feature";
  geometry: GeoJSON.Point;
  properties: ApiAmenityProperties;
}

export interface ApiAmenityFeatureCollection {
  type: "FeatureCollection";
  features: ApiAmenityFeature[];
}

export type AmenitiesRequestState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiAmenityFeatureCollection };
