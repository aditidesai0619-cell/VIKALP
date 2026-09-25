import { useState } from "react";
import { DatabaseIcon, CloseIcon } from "../common/icons";

// Collapsible "what am I looking at" panel — same citation text already
// used on Settlement (map-intelligence)/Evidence pages, not new wording
// invented for this map, plus this map's own two new sources (style,
// terrain) verified live before being written here.
export function DataSourcePanel({ terrainAvailable }: { terrainAvailable: boolean }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show map data sources"
        className="pointer-events-auto absolute right-3 top-3 z-1200 flex h-9 w-9 items-center justify-center rounded-md border border-vikalp-border bg-vikalp-card/95 text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        <DatabaseIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-1200 flex w-72 flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-card/97 p-3.5 text-[12px] text-vikalp-text-secondary">
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
        <span className="font-medium text-vikalp-text">Basemap style: </span>
        OpenFreeMap &quot;Liberty&quot; — free, keyless, OpenStreetMap data (OpenMapTiles
        schema). Includes place labels, roads, water, and building footprints.
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Terrain elevation: </span>
        {terrainAvailable
          ? "AWS Terrain Tiles (Terrarium format), derived from SRTM / USGS / ETOPO1."
          : "Unavailable this session — showing 2D mode. See the banner above the map."}
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Settlement: </span>
        VIKALP demo planning input — source validation pending (not survey-grade).
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Administrative boundary: </span>
        geoBoundaries India ADM2 (ODbL 1.0). Source metadata: Pathways Data Pvt. Ltd. /
        lgdirectory.gov.in.
      </p>
      <p>
        <span className="font-medium text-vikalp-text">Historical evidence: </span>
        GSI/NLFC field-validated landslide inventory, Pauri Garhwal district.
      </p>
      <p className="border-t border-vikalp-border pt-2">
        <span className="font-medium text-vikalp-text">Limitations: </span>
        Buildings shown are unverified OpenStreetMap community contributions, not
        officially validated. Risk zones, hospitals/shelters, evacuation routes, and
        relocation destinations are not available in this pilot.
      </p>
      <p className="text-[10px]">
        © OpenStreetMap contributors, ODbL. Style hosted by OpenFreeMap.
      </p>
    </div>
  );
}
