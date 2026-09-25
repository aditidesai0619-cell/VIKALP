interface ChainStep {
  label: string;
  value: string;
}

// Task 45.8 §9/§10 — provenance as a visual, clickable chain. Same
// data/steps as before (Task 39) — bigger typography, numbered node
// badges, and (new) the whole chain is a button that opens the
// Evidence drawer for the record it documents, when `onClick` is
// given ("clicking a node may reveal source/date/processing
// information" — brief §10).
function Chain({ title, steps, onClick }: { title: string; steps: ChainStep[]; onClick?: () => void }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onClick();
            }
          : undefined
      }
      className={`flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5 ${
        onClick ? "cursor-pointer text-left transition-colors hover:border-vikalp-navy/50 hover:bg-vikalp-card/80" : ""
      }`}
    >
      <h3 className="text-base font-semibold text-vikalp-navy">{title}</h3>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2 lg:flex-1">
            <div className="flex flex-1 flex-col gap-1 rounded-md border border-vikalp-border bg-vikalp-bg px-3.5 py-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vikalp-navy/15 text-[11px] font-semibold text-vikalp-navy">
                {index + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                {step.label}
              </span>
              <span className="text-sm text-vikalp-text">{step.value}</span>
            </div>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden shrink-0 px-1 text-lg text-vikalp-text-secondary lg:block"
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DerivedOutputTraceability({
  hazardQualifying,
  hazardNearestKm,
  onSelectHazardChain,
  onSelectTerrainChain,
}: {
  hazardQualifying: number | null;
  hazardNearestKm: number | null;
  onSelectHazardChain?: () => void;
  onSelectTerrainChain?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-vikalp-navy">Data provenance</h2>

      <Chain
        title="GSI/NLFC landslide inventory → Hazard Exposure evidence"
        onClick={onSelectHazardChain}
        steps={[
          { label: "Source", value: "GSI/NLFC landslide inventory" },
          { label: "VIKALP derivation", value: "Spatial distance calculation (haversine)" },
          {
            label: "Output",
            value:
              hazardQualifying !== null
                ? `${hazardQualifying} qualifying records within 1 km`
                : "Not available",
          },
          {
            label: "Interpretation",
            value: "No qualifying inventory evidence was found in the current scoring radius.",
          },
          { label: "Limitation", value: "This does not establish absence of hazard." },
        ]}
      />

      <Chain
        title="CartoDEM → derived terrain slope"
        onClick={onSelectTerrainChain}
        steps={[
          { label: "Source", value: "CartoDEM v3 R1" },
          { label: "VIKALP derivation", value: "Terrain processing (Horn's method, Task 15)" },
          { label: "Output", value: "22.58° derived slope" },
          { label: "Conflict", value: "Existing planning input = 18.91°" },
          { label: "Status", value: "Unresolved discrepancy" },
        ]}
      />

      {hazardNearestKm !== null && (
        <p className="text-[13px] text-vikalp-text-secondary">
          Live check for Bhitai Malli: nearest contextual (non-scoring) GSI
          record is {hazardNearestKm} km away.
        </p>
      )}
    </div>
  );
}
