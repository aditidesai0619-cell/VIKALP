// Shape of GET /api/gis/boundaries — matches backend/app/schemas/gis.py.
// Property names match the raw geoBoundaries source verbatim (shapeName,
// shapeISO, shapeID, shapeGroup, shapeType). Do not add fields the
// backend doesn't return, and never invent a boundary feature.

export interface ApiBoundaryProperties {
  shapeName: string | null;
  shapeISO: string | null;
  shapeID: string | null;
  shapeGroup: string | null;
  shapeType: string | null;
}

// `GeoJSON` here is the ambient global namespace from @types/geojson
// (already a transitive dependency of maplibre-gl, which types its own
// `GeoJSONSourceSpecification.data` the same way) — no import needed.
// Real district polygons come through as both Polygon and MultiPolygon
// (verified directly against the source file), never anything else.
export interface ApiBoundaryFeature {
  type: "Feature";
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: ApiBoundaryProperties;
}

export interface ApiBoundaryFeatureCollection {
  type: "FeatureCollection";
  features: ApiBoundaryFeature[];
}

export type BoundariesRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiBoundaryFeatureCollection };

// Shape of GET /api/gis/landslides — matches backend/app/schemas/gis.py.
// A minimal subset of the raw GSI/NLFC inventory's own field names
// (slide_no, activity, triggering, toposheet) — the same four fields
// hazard_exposure.py's scoring already uses. Do not add fields the
// backend doesn't return, and never derive a risk score/color from
// these points on the frontend.

export interface ApiLandslideProperties {
  slide_no: string | null;
  activity: string | null;
  triggering: string | null;
  toposheet: string | null;
}

// Every real GSI/NLFC inventory record is a single Point (verified
// directly against the source file) — never a line/polygon.
export interface ApiLandslideFeature {
  type: "Feature";
  geometry: GeoJSON.Point;
  properties: ApiLandslideProperties;
}

export interface ApiLandslideFeatureCollection {
  type: "FeatureCollection";
  features: ApiLandslideFeature[];
}

export type LandslidesRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; collection: ApiLandslideFeatureCollection };
