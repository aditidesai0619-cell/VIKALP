import { Badge } from "../common/Badge";
import { ArchiveClockIcon, DatabaseIcon, HomeIcon, UsersIcon } from "../common/icons";

// Destination & Relocation redesign (brief §15-19) — four planning
// workstreams. None of these have any backend implementation in
// VIKALP today (no land/tenure, compensation, asset-transfer, or
// community-support endpoint or schema exists anywhere in the API) —
// confirmed by direct inspection before writing this, not assumed.
// Rather than build a workflow UI wired to nothing, each card states
// that honestly ("Planning module unavailable") per the brief's own
// explicit instruction: "do not create fake workflows."
const WORKSTREAMS = [
  {
    key: "land",
    icon: HomeIcon,
    label: "Land Acquisition & Tenure",
    description: "Land ownership, availability, tenure, and acquisition requirements at a candidate site.",
  },
  {
    key: "compensation",
    icon: DatabaseIcon,
    label: "Compensation & Benefits",
    description: "Compensation considerations, eligibility evidence, and applicable policy references.",
  },
  {
    key: "assets",
    icon: ArchiveClockIcon,
    label: "Asset Transfer",
    description: "Agricultural, livestock, household, and community-infrastructure asset planning.",
  },
  {
    key: "community",
    icon: UsersIcon,
    label: "Community Support",
    description: "Community needs, social continuity, psychosocial support, and local acceptance.",
  },
] as const;

export function RelocationPlanningPanel({ onOpenPlanner }: { onOpenPlanner: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-semibold text-vikalp-text">Relocation Planning</h2>
          <p className="text-[13px] text-vikalp-text-secondary">
            Planning workstreams for if/when relocation is pursued — these are not automatic
            actions.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPlanner}
          className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
        >
          Open Relocation Planner →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WORKSTREAMS.map((stream) => (
          <div
            key={stream.key}
            className="flex flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-bg p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-vikalp-navy/10 text-vikalp-navy">
                <stream.icon className="h-4 w-4" />
              </span>
              <Badge tone="neutral">Planning module unavailable</Badge>
            </div>
            <span className="text-[14px] font-semibold text-vikalp-text">{stream.label}</span>
            <p className="text-[12px] text-vikalp-text-secondary">{stream.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
