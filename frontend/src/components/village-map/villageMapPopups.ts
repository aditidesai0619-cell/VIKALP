// DOM-content popup builders for VillageMap — same convention as every
// other VIKALP map (build plain DOM nodes via textContent, never an
// HTML string, since these values come from API/tile data).
import type { ApiAmenityProperties } from "../../types/amenities";
import type { ApiBuildingProperties } from "../../types/buildings";
import type { ApiLandslideProperties } from "../../types/gis";
import type { ApiRoadProperties } from "../../types/roads";
import type { ApiWaterProperties } from "../../types/water";
import type { ApiSettlementGeoJSONFeature } from "../../types/settlement";
import type { ApiDestinationCandidate } from "../../types/destination";

// §18 — only real Open Buildings attributes. No owner, household,
// building type, floor count, construction year, occupancy, or damage
// status, since none of those exist in VIKALP data.
export function buildBuildingPopup(properties: ApiBuildingProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = "Building footprint";
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Source: ${properties.source}`,
    `Confidence: ${properties.confidence.toFixed(2)}`,
    `Area: ${properties.area_in_meters.toFixed(1)} m²`,
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = "Coverage: settlement vicinity — not an official building inventory.";
  container.appendChild(note);

  return container;
}

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
// or classified area (same convention as every other GSI popup).
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
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = "A single documented event record, not a hazard zone or risk score.";
  container.appendChild(note);

  return container;
}

const HIGHWAY_LABELS: Record<string, string> = {
  trunk: "Trunk road",
  primary: "Primary road",
  secondary: "Secondary road",
  tertiary: "Tertiary road",
  unclassified: "Unclassified road",
  residential: "Residential street",
  living_street: "Living street",
  track: "Track",
  path: "Path",
  footway: "Footway",
  cycleway: "Cycleway",
  service: "Service road",
};

export function buildRoadPopup(properties: ApiRoadProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent =
    properties.name ?? (properties.highway ? HIGHWAY_LABELS[properties.highway] ?? properties.highway : "Road");
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Category: ${properties.highway ? HIGHWAY_LABELS[properties.highway] ?? properties.highway : "Not recorded"}`,
    `Surface: ${properties.surface ?? "Not recorded"}`,
  ]) {
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = "Source: OpenStreetMap contributors. Coverage may be incomplete.";
  container.appendChild(note);

  return container;
}

// §11 — only real water attributes. Never flow rate, depth, width, or
// flood status, since none of that exists in the OSM source.
export function buildWaterPopup(properties: ApiWaterProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const kind = properties.waterway
    ? properties.waterway.charAt(0).toUpperCase() + properties.waterway.slice(1)
    : properties.natural === "water"
      ? "Water body"
      : "Water feature";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = properties.name ?? kind;
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  const typeLine = document.createElement("span");
  typeLine.textContent = `Type: ${kind}`;
  details.appendChild(typeLine);
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = "Source: OpenStreetMap contributors. Coverage may be incomplete.";
  container.appendChild(note);

  return container;
}

const AMENITY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  school: "School",
  college: "College",
  kindergarten: "Kindergarten",
  pharmacy: "Pharmacy",
  community_centre: "Community centre",
  place_of_worship: "Place of worship",
  fire_station: "Fire station",
  police: "Police",
  post_office: "Post office",
  townhall: "Town hall",
};

// §10 — only real, verified attributes. Never capacity, staffing,
// hours, quality, or ownership, since none exists in the source.
export function buildAmenityPopup(properties: ApiAmenityProperties): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-1 p-1";

  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-vikalp-navy";
  label.textContent = AMENITY_LABELS[properties.amenity] ?? properties.amenity;
  container.appendChild(label);

  const details = document.createElement("div");
  details.className = "mt-1 flex flex-col gap-0.5 text-xs text-vikalp-text";
  for (const line of [
    `Name: ${properties.name ?? "Not recorded"}`,
    properties.distance_m !== null
      ? `Distance from settlement: ${(properties.distance_m / 1000).toFixed(2)} km`
      : null,
  ]) {
    if (!line) continue;
    const el = document.createElement("span");
    el.textContent = line;
    details.appendChild(el);
  }
  container.appendChild(details);

  const note = document.createElement("span");
  note.className = "mt-1 text-[10px] text-vikalp-text-secondary";
  note.textContent = "Mapped service — Source: OpenStreetMap contributors.";
  container.appendChild(note);

  return container;
}

export function buildDestinationPopup(candidate: ApiDestinationCandidate): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "flex flex-col gap-0.5 p-1";
  const name = document.createElement("span");
  name.className = "text-sm font-semibold text-vikalp-navy";
  name.textContent = `${candidate.destination_name} — candidate destination`;
  container.appendChild(name);
  if (candidate.district || candidate.state) {
    const loc = document.createElement("span");
    loc.className = "text-xs text-vikalp-text-secondary";
    loc.textContent = [candidate.district, candidate.state].filter(Boolean).join(", ");
    container.appendChild(loc);
  }
  return container;
}
