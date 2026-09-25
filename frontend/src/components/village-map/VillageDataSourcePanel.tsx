import { useState } from "react";
import { DatabaseIcon, CloseIcon } from "../common/icons";

// Must make clear every externally-sourced layer's real coverage and
// never overstate it: no "official Bhitai Malli building inventory"
// (no settlement-boundary polygon to prove administrative match), no
// "official road/water inventory" (community-mapped OSM data), and no
// "services serving the village" (only 4 mapped services exist within
// 3 km, disclosed as "mapped services", never as complete coverage).
export function VillageDataSourcePanel({
  buildingsAvailable,
  roadsAvailable = false,
  waterAvailable = false,
  servicesAvailable = false,
}: {
  buildingsAvailable: boolean;
  roadsAvailable?: boolean;
  waterAvailable?: boolean;
  servicesAvailable?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show map data sources"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md border border-vikalp-border bg-vikalp-card/95 text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        <DatabaseIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto flex w-72 flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-card/97 p-3.5 text-[12px] text-vikalp-text-secondary">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
          Map data sources
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="flex h-5 w-5 items-center justify-center rounded text-vikalp-text-secondary hover:text-vikalp-navy"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <p>
        <span className="font-medium text-vikalp-text">Buildings: </span>
        {buildingsAvailable
          ? "Google Open Buildings v3, dual-licensed CC BY 4.0 / ODbL 1.0. Coverage: Bhitai Malli vicinity only — extracted from the India partition, not the full dataset."
          : "Unavailable for this settlement."}
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Roads &amp; paths: </span>
        {roadsAvailable
          ? "OpenStreetMap contributors (ODbL 1.0). Coverage may be incomplete — not an official government road inventory."
          : "Unavailable for this settlement."}
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Water: </span>
        {waterAvailable
          ? "OpenStreetMap contributors (ODbL 1.0). One mapped stream — not a complete hydrology survey."
          : "Unavailable for this settlement."}
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Services: </span>
        {servicesAvailable
          ? "OpenStreetMap contributors (ODbL 1.0). 4 mapped services within 3 km — not a complete facility registry."
          : "Unavailable for this settlement."}
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Settlement: </span>
        VIKALP demo planning input — source validation pending (not survey-grade).
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Administrative boundary: </span>
        geoBoundaries India ADM2 (ODbL 1.0).
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Historical evidence: </span>
        GSI/NLFC field-validated landslide inventory, Pauri Garhwal district.
      </p>
      <p className="border-t border-vikalp-border pt-2">
        <span className="font-medium text-vikalp-text">Limitations: </span>
        No official Bhitai Malli settlement-boundary polygon exists, so building coverage cannot
        be confirmed as administratively complete — treat this as vicinity coverage, not an
        official building inventory. Road/water coverage is community-mapped and uneven — most
        mapped buildings sit 12-311 m from the nearest mapped road. Only 4 real services are
        mapped within 3 km (1 hospital, 2 clinics, 1 place of worship) — shown as "mapped
        services", not a claim that these are the only services available to the village.
        Route/access is not integrated in this pilot.
      </p>
    </div>
  );
}
