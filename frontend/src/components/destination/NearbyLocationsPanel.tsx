import { Badge } from "../common/Badge";
import { DestinationUnavailablePanel } from "../relocation/DestinationUnavailablePanel";
import type { ApiAmenityFeatureCollection } from "../../types/amenities";
import type { ApiDestinationCandidate } from "../../types/destination";

// Destination & Relocation redesign (brief §7/§11/§12) — two real,
// clearly-separated tabs. "Government-Curated Destinations" reads the
// real (currently empty) candidates list from
// GET /api/settlements/{id}/destinations. "Nearby Locations" reads the
// real OSM services/POI dataset (GET /api/settlements/{id}/services),
// which already carries a real computed `distance_m` per point — this
// is the only dataset VIKALP has with genuine, non-fabricated
// name/type/distance fields, so it fills the brief's "nearby location"
// role honestly instead of inventing a settlements-near-me dataset
// that doesn't exist. Nearby locations are never presented as
// candidate relocation destinations (brief §7's explicit requirement).
//
// Split into DestinationTabs (tab buttons + a short banner, rendered
// above the map) and DestinationTabContent (the actual list, rendered
// below the map) — layout-only split for the Destination & Relocation
// page composition; same tab state, same data, same logic as before.

export type Tab = "government" | "nearby";

const AMENITY_LABELS: Record<string, string> = {
  hospital: "Hospital",
  clinic: "Clinic",
  doctors: "Clinic",
  pharmacy: "Pharmacy",
  place_of_worship: "Place of worship",
  school: "School",
  college: "College",
  townhall: "Town hall",
  post_office: "Post office",
};

function formatAmenityType(amenity: string): string {
  return AMENITY_LABELS[amenity] ?? amenity.replace(/_/g, " ");
}

export function DestinationTabs({
  tab,
  onChange,
  candidatesCount,
  nearbyCount,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  candidatesCount: number;
  nearbyCount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-md border border-vikalp-border bg-vikalp-bg p-1">
        <button
          type="button"
          onClick={() => onChange("government")}
          className={`flex-1 rounded px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "government" ? "bg-vikalp-navy/15 text-vikalp-navy" : "text-vikalp-text-secondary hover:text-vikalp-text"
          }`}
        >
          Government-Curated Destinations ({candidatesCount})
        </button>
        <button
          type="button"
          onClick={() => onChange("nearby")}
          className={`flex-1 rounded px-3 py-1.5 text-[13px] font-medium transition-colors ${
            tab === "nearby" ? "bg-vikalp-navy/15 text-vikalp-navy" : "text-vikalp-text-secondary hover:text-vikalp-text"
          }`}
        >
          Nearby Locations ({nearbyCount})
        </button>
      </div>
      <p className="text-[12px] text-vikalp-text-secondary">
        {tab === "government"
          ? "Officially curated relocation candidate sites for this settlement."
          : "Real mapped OSM points of interest near the settlement — not evaluated or approved relocation destinations."}
      </p>
    </div>
  );
}

export function DestinationTabContent({
  tab,
  candidates,
  amenities,
  onSelectCandidate,
}: {
  tab: Tab;
  candidates: ApiDestinationCandidate[];
  amenities: ApiAmenityFeatureCollection | null;
  onSelectCandidate: (candidate: ApiDestinationCandidate) => void;
}) {
  const nearby = [...(amenities?.features ?? [])].sort((a, b) => {
    const da = a.properties.distance_m ?? Number.POSITIVE_INFINITY;
    const db = b.properties.distance_m ?? Number.POSITIVE_INFINITY;
    return da - db;
  });

  if (tab === "government") {
    return candidates.length > 0 ? (
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <li key={candidate.destination_id}>
            <button
              type="button"
              onClick={() => onSelectCandidate(candidate)}
              className="w-full rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 text-left text-[15px] text-vikalp-text transition-colors hover:border-vikalp-navy/50"
            >
              {candidate.destination_name}
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <DestinationUnavailablePanel />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {nearby.length === 0 ? (
        <p className="rounded-vikalp-card border border-dashed border-vikalp-border bg-vikalp-bg p-4 text-[13px] text-vikalp-text-secondary">
          No mapped services/points of interest are available for this settlement.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {nearby.map((feature) => (
            <li
              key={feature.properties.osm_id ?? feature.properties.name}
              className="flex items-center justify-between gap-2 rounded-md border border-vikalp-border bg-vikalp-card px-3.5 py-2.5"
            >
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-vikalp-text">
                  {feature.properties.name ?? formatAmenityType(feature.properties.amenity)}
                </span>
                <span className="text-[12px] text-vikalp-text-secondary">
                  {formatAmenityType(feature.properties.amenity)}
                </span>
              </div>
              <Badge tone="neutral">
                {feature.properties.distance_m !== null
                  ? `~${(feature.properties.distance_m / 1000).toFixed(1)} km`
                  : "Distance unknown"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
