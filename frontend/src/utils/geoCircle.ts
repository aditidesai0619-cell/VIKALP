// Small-circle polygon approximation for the 1 km / 5 km spatial
// evidence rings (Task 45.8 §12) — a visualization aid for the
// existing, already-verified Hazard Exposure scoring/context radii,
// not a new geodesy dependency. Good enough at these radii/latitudes
// for a map overlay; not survey-grade.
const EARTH_RADIUS_KM = 6371;

export function circlePolygon(
  center: [number, number],
  radiusKm: number,
  points = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lon, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const deltaLat = dy / EARTH_RADIUS_KM;
    const deltaLon = dx / (EARTH_RADIUS_KM * Math.cos(latRad));
    coordinates.push([lon + (deltaLon * 180) / Math.PI, lat + (deltaLat * 180) / Math.PI]);
  }
  return {
    type: "Feature",
    properties: { radiusKm },
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
}
