import { HomeIcon } from "../common/icons";

// Task 45.8 §7 — visual spatial relationship between Bhitai Malli and
// the GSI inventory, using only the existing, already-verified Hazard
// Exposure proximity numbers (backend/app/services/hazard_exposure.py,
// unchanged). `null` values render "Not available", never a
// substituted zero (brief §8: "never replace unavailable data with
// zero" — but a genuinely zero verified count, like Bhitai Malli's
// real 0-within-1km, is shown as 0, since that IS the real value).
export function GsiSpatialRelationshipDiagram({
  settlementName,
  withinOneKm,
  withinFiveKm,
  nearestKm,
}: {
  settlementName: string;
  withinOneKm: number | null;
  withinFiveKm: number | null;
  nearestKm: number | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        GSI evidence — spatial relationship
      </span>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-vikalp-text">
            {withinOneKm ?? "Not available"}
          </span>
          <span className="text-[12px] text-vikalp-text-secondary">within 1 km</span>
        </div>
        <span aria-hidden="true" className="text-vikalp-text-secondary">
          ↓
        </span>
        <div className="flex items-center gap-2 rounded-full border border-vikalp-navy/40 bg-vikalp-navy/10 px-3.5 py-2">
          <HomeIcon className="h-4 w-4 text-vikalp-navy" />
          <span className="text-sm font-semibold text-vikalp-text">{settlementName}</span>
        </div>
        <span aria-hidden="true" className="text-vikalp-text-secondary">
          ↓
        </span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-vikalp-text">
            {withinFiveKm ?? "Not available"}
          </span>
          <span className="text-[12px] text-vikalp-text-secondary">within 5 km</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-vikalp-border pt-2.5">
        <span className="text-[13px] text-vikalp-text-secondary">Nearest contextual record</span>
        <span className="text-base font-semibold text-vikalp-text">
          {nearestKm !== null ? `~${nearestKm} km` : "Not available"}
        </span>
      </div>
    </div>
  );
}
