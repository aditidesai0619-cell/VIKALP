import { Drawer } from "../common/Drawer";
import type { ApiDestinationCandidate } from "../../types/destination";

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        {label}
      </span>
      <span className="text-[15px] leading-relaxed text-vikalp-text">{value}</span>
    </div>
  );
}

// Task 45.9 §12 — the candidate detail drawer, built directly against
// the real DestinationCandidate schema (backend/app/schemas/
// destination.py, unchanged) so it is genuinely ready the moment a
// real government-curated candidate is integrated — not a mockup. It
// never renders with fabricated data: destination.py's candidates
// list is empty for every settlement in this pilot today (Task 30),
// so this component is presently unreachable in the live app, exactly
// like the backend schema it mirrors is presently unpopulated.
export function CandidateDetailDrawer({
  candidate,
  open,
  onClose,
}: {
  candidate: ApiDestinationCandidate | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!candidate) return null;

  const na = "Not available";

  return (
    <Drawer open={open} title={candidate.destination_name} onClose={onClose}>
      <Section label="Site" value={candidate.destination_name} />
      <Section
        label="Location"
        value={
          candidate.district && candidate.state
            ? `${candidate.district}, ${candidate.state}`
            : na
        }
      />
      <Section
        label="Land"
        value={
          candidate.land_area_hectares !== null
            ? `${candidate.land_area_hectares} ha total`
            : na
        }
      />
      <Section
        label="Capacity"
        value={
          candidate.available_area_hectares !== null
            ? `${candidate.available_area_hectares} ha available — formal capacity not assessed`
            : "Not assessed"
        }
      />
      <Section label="Water" value={na} />
      <Section
        label="Housing"
        value={
          candidate.existing_population !== null
            ? `Existing occupancy: ${candidate.existing_population} people, ${candidate.existing_households ?? "?"} households. Relocation housing capacity: ${na}.`
            : na
        }
      />
      <Section label="Healthcare" value={na} />
      <Section label="School" value={na} />
      <Section label="Road Access" value={candidate.infrastructure_access_notes ?? na} />

      {(candidate.hazard_evidence.length > 0 || candidate.suitability_evidence.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Evidence
          </span>
          <ul className="flex flex-col gap-1 text-[13px] text-vikalp-text-secondary">
            {[...candidate.hazard_evidence, ...candidate.suitability_evidence].map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {candidate.source && <Section label="Source" value={candidate.source} />}

      <div className="rounded-md border border-vikalp-border bg-vikalp-bg px-3.5 py-3 text-[13px] font-medium text-vikalp-warning">
        Officer Review — Evidence available for officer review. VIKALP does not recommend or
        auto-select this site.
      </div>
    </Drawer>
  );
}
