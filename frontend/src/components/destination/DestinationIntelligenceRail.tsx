import { Badge } from "../common/Badge";
import { statusTone } from "../../utils/statusTone";

// Destination & Relocation redesign — right information rail (brief
// §5). Narrow, scannable, and secondary by design: the map + destination
// exploration remain primary. Just the five evidence rows the brief
// specifies — Relocation Readiness has its own full pipeline below the
// map, and Pathway Comparison is its own full-width section
// (PathwayComparisonSection below), since a 3-column comparison can't
// read well inside a ~30%-width rail.

export interface EvidenceRow {
  label: string;
  status: string;
  detail?: string;
  onNavigate?: () => void;
}

export type ComparisonValue = "Available" | "Limited" | "Not integrated" | "Not available" | "Review" | "—";

export interface ComparisonRow {
  aspect: string;
  protect: ComparisonValue;
  adapt: ComparisonValue;
  relocate: ComparisonValue;
}

export function DestinationIntelligenceRail({ evidenceRows }: { evidenceRows: EvidenceRow[] }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <h2 className="text-[15px] font-semibold text-vikalp-navy">Evidence for Destination &amp; Relocation</h2>
      <div className="flex flex-col divide-y divide-vikalp-border rounded-md border border-vikalp-border">
        {evidenceRows.map((row) => {
          const content = (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium text-vikalp-text">{row.label}</span>
                {row.detail && (
                  <span className="truncate text-[12px] text-vikalp-text-secondary">{row.detail}</span>
                )}
              </div>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </>
          );
          return row.onNavigate ? (
            <button
              key={row.label}
              type="button"
              onClick={row.onNavigate}
              className="flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-vikalp-bg"
            >
              {content}
            </button>
          ) : (
            <div key={row.label} className="flex items-center gap-2 px-3 py-2.5">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CELL_TONE_TEXT: Record<string, string> = {
  neutral: "text-vikalp-text-secondary",
  safe: "text-vikalp-safe",
  warning: "text-vikalp-warning",
  critical: "text-vikalp-critical",
};

const PATHWAY_LABEL: Record<"protect" | "adapt" | "relocate", string> = {
  protect: "Protect",
  adapt: "Adapt",
  relocate: "Relocate",
};

export function PathwayComparisonSection({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
      <div>
        <h2 className="text-[20px] font-semibold text-vikalp-text">Pathway Comparison</h2>
        <p className="text-[13px] text-vikalp-text-secondary">
          Protect, Adapt, and Relocate compared side by side, using the same evidence gathered
          elsewhere on this page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["protect", "adapt", "relocate"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-2 rounded-md border border-vikalp-border bg-vikalp-bg p-4">
            <h3 className="text-[14px] font-semibold uppercase tracking-wide text-vikalp-navy">
              {PATHWAY_LABEL[key]}
            </h3>
            <div className="flex flex-col divide-y divide-vikalp-border">
              {rows.map((row) => (
                <div key={row.aspect} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <span className="text-vikalp-text-secondary">{row.aspect}</span>
                  <span className={`font-medium ${CELL_TONE_TEXT[statusTone(row[key])]}`}>{row[key]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-vikalp-text-secondary">
        Informational only. This workspace does not claim Relocate — or any pathway — is the best
        choice; the officer's decision remains explicit (see Decision Workspace).
      </p>
    </div>
  );
}
