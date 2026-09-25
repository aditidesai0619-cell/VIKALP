// DOM-content popup builders for the 3D Terrain map. Same convention
// as every other VIKALP map (IntelligenceMap, EvidenceMap,
// RelocationMap): build plain DOM nodes via textContent, never an
// HTML string, since these values come straight from API/tile data.
import type { ApiLandslideProperties } from "../../types/gis";
import type { ApiSettlementGeoJSONFeature } from "../../types/settlement";

export function buildSettlementPopup(
  properties: ApiSettlementGeoJSONFeature["properties"],
): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = properties.name;
  container.appendChild(name);

  const location = document.createElement("span");
  location.className = "text-xs text-vikalp-text-secondary";
  location.textContent = `${properties.district}, ${properties.state}`;
  container.appendChild(location);

  const stats = document.createElement("div");
  stats.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Population: ${properties.population}`,
    `Households: ${properties.households}`,
    `Elevation: ${properties.elevation_m} m`,
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    stats.appendChild(el);
  }
  container.appendChild(stats);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = properties.data_status;
  container.appendChild(note);

  return container;
}

// Deliberately never mentions "risk", "safe", or a color meaning — a
// single inventory point is a documented event record, not a scored
// or classified area (same convention as IntelligenceMap.tsx).
export function buildEvidencePopup(properties: ApiLandslideProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = "GSI/NLFC landslide record — historical evidence";
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Slide no.: ${properties.slide_no ?? "Not recorded"}`,
    `Activity: ${properties.activity ?? "Not recorded"}`,
    `Triggering: ${properties.triggering ?? "Not recorded"}`,
    `Toposheet: ${properties.toposheet ?? "Not recorded"}`,
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent =
    "A single documented event record, not a hazard zone or risk score.";
  container.appendChild(note);

  return container;
}

// The base style's own "building-3d" layer (real OpenStreetMap
// footprints, OpenMapTiles schema) — the only per-feature attribute it
// reliably carries is a computed render height, itself derived from
// OSM height/building:levels tags where contributors set them, or a
// generic per-level default where they didn't (OpenMapTiles' own
// documented behaviour, not a VIKALP estimate). Shown as-is, never
// re-labelled as measured, never linked to any VIKALP risk/status.
export function buildBuildingPopup(properties: Record<string, unknown>): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = "Building footprint";
  container.appendChild(label);

  const renderHeight = properties["render_height"];
  const heightLine = document.createElement("span");
  heightLine.className = "text-xs text-vikalp-text";
  heightLine.textContent =
    typeof renderHeight === "number"
      ? `Approx. height: ${renderHeight} m (from OpenStreetMap tags, or a generic per-level estimate where untagged)`
      : "Height not available in source data";
  container.appendChild(heightLine);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent =
    "Source: OpenStreetMap community data (via the base map). Not assessed or verified by VIKALP.";
  container.appendChild(note);

  return container;
}
