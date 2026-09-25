import { Badge } from "../common/Badge";
import { statusTone } from "../../utils/statusTone";

// Decision Workspace redesign — right information rail (brief §4/§12/
// §13/§14). Kept secondary/compact on purpose: the three pathway cards
// remain the primary workspace content. Every value passed in here is
// computed by DecisionWorkspacePage.tsx from real fetched data — this
// component only renders it, it never derives a score or a ranking.

export interface EvidenceRow {
  label: string;
  status: string;
  icon: React.ReactNode;
  onNavigate?: () => void;
}

export type ComparisonValue = "Available" | "Limited" | "Not integrated" | "Not available" | "Review" | "—";

export interface ComparisonRow {
  aspect: string;
  protect: ComparisonValue;
  adapt: ComparisonValue;
  relocate: ComparisonValue;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-vikalp-text-secondary">
      {children}
    </h2>
  );
}

function EvidenceInformingDecision({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div>
      <SectionHeading>Evidence Informing This Decision</SectionHeading>
      <div className="flex flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card">
        {rows.map((row) => {
          const content = (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-vikalp-navy">
                {row.icon}
              </span>
              <span className="flex-1 text-sm text-vikalp-text">{row.label}</span>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </>
          );
          return row.onNavigate ? (
            <button
              key={row.label}
              type="button"
              onClick={row.onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-vikalp-bg"
            >
              {content}
            </button>
          ) : (
            <div key={row.label} className="flex items-center gap-2.5 px-3 py-2">
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

function ComparisonCell({ value }: { value: string }) {
  return <span className={`font-medium ${CELL_TONE_TEXT[statusTone(value)]}`}>{value}</span>;
}

function PathwayComparison({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div>
      <SectionHeading>Pathway Comparison</SectionHeading>
      <div className="overflow-hidden rounded-vikalp-card border border-vikalp-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary">
              <th className="px-2.5 py-1.5 text-left font-medium">Aspect</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Protect</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Adapt</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Relocate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.aspect} className="border-b border-vikalp-border text-vikalp-text last:border-0">
                <td className="px-2.5 py-1.5 font-medium text-vikalp-text-secondary">{row.aspect}</td>
                <td className="px-2.5 py-1.5">
                  <ComparisonCell value={row.protect} />
                </td>
                <td className="px-2.5 py-1.5">
                  <ComparisonCell value={row.adapt} />
                </td>
                <td className="px-2.5 py-1.5">
                  <ComparisonCell value={row.relocate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-vikalp-text-secondary">
        Informational only — not an automated ranking. No pathway is scored or preferred.
      </p>
    </div>
  );
}

function DecisionStatus({
  pathwaySelected,
  officerReview,
  evidence,
  approval,
}: {
  pathwaySelected: string;
  officerReview: string;
  evidence: string;
  approval: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Pathway selected", value: pathwaySelected },
    { label: "Officer review", value: officerReview },
    { label: "Evidence", value: evidence },
    { label: "Approval", value: approval },
  ];

  return (
    <div>
      <SectionHeading>Decision Status</SectionHeading>
      <div className="flex flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card px-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 py-2.5">
            <span className="text-sm text-vikalp-text-secondary">{row.label}</span>
            <Badge tone={statusTone(row.value)}>{row.value}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecisionIntelligenceRail({
  evidenceRows,
  comparisonRows,
  decisionStatus,
}: {
  evidenceRows: EvidenceRow[];
  comparisonRows: ComparisonRow[];
  decisionStatus: { pathwaySelected: string; officerReview: string; evidence: string; approval: string };
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-6 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6">
      <EvidenceInformingDecision rows={evidenceRows} />
      <PathwayComparison rows={comparisonRows} />
      <DecisionStatus {...decisionStatus} />
    </div>
  );
}
