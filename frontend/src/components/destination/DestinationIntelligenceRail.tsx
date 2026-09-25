import { Badge } from "../common/Badge";
import { statusTone } from "../../utils/statusTone";
import type { ReadinessStage } from "../relocation/readinessStages";

// Destination & Relocation redesign — right information rail (brief
// §20/§21/§22). Secondary and compact by design: the map + destination
// exploration remain primary. The readiness rows reuse the exact same
// `deriveReadinessStages` output the full RelocationReadinessPipeline
// below the map already renders (DestinationExplorerPage computes it
// once and passes it to both) — this is a second, compact renderer of
// the same real data, not a second derivation of it.

export interface EvidenceRow {
  label: string;
  status: string;
  onNavigate?: () => void;
}

export type ComparisonValue = "Available" | "Limited" | "Not integrated" | "Not available" | "Review" | "—";

export interface ComparisonRow {
  aspect: string;
  protect: ComparisonValue;
  adapt: ComparisonValue;
  relocate: ComparisonValue;
}

const READINESS_TONE: Record<ReadinessStage["state"], string> = {
  available: "border-[#4c8ba8]/40 bg-[#4c8ba8]/10 text-[#7cb3cc]",
  "review-required": "border-vikalp-warning/40 bg-vikalp-warning/10 text-vikalp-warning",
  blocked: "border-[#8a7ca8]/40 bg-[#8a7ca8]/10 text-[#b0a4c8]",
  unavailable: "border-vikalp-border bg-vikalp-bg text-vikalp-text-secondary",
  "not-assessed": "border-[#5c7a94]/40 bg-[#5c7a94]/10 text-[#8fb0c8]",
};

const READINESS_LABEL: Record<ReadinessStage["state"], string> = {
  available: "Available",
  "review-required": "Review Required",
  blocked: "Blocked",
  unavailable: "Unavailable",
  "not-assessed": "Not Assessed",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-vikalp-text-secondary">
      {children}
    </h2>
  );
}

function EvidenceForDestination({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div>
      <SectionHeading>Evidence for Destination &amp; Relocation</SectionHeading>
      <div className="flex flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card">
        {rows.map((row) => {
          const content = (
            <>
              <span className="flex-1 text-sm text-vikalp-text">{row.label}</span>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </>
          );
          return row.onNavigate ? (
            <button
              key={row.label}
              type="button"
              onClick={row.onNavigate}
              className="flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-vikalp-bg"
            >
              {content}
            </button>
          ) : (
            <div key={row.label} className="flex items-center gap-2 px-3 py-2">
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
        Informational only. This workspace does not claim Relocate — or any pathway — is the best
        choice; the officer's decision remains explicit (see Decision Workspace).
      </p>
    </div>
  );
}

function RelocationReadinessCompact({ stages }: { stages: ReadinessStage[] }) {
  return (
    <div>
      <SectionHeading>Relocation Readiness</SectionHeading>
      <div className="flex flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card px-3">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center justify-between gap-2 py-2.5">
            <span className="text-sm text-vikalp-text-secondary">{stage.label}</span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${READINESS_TONE[stage.state]}`}
            >
              {READINESS_LABEL[stage.state]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DestinationIntelligenceRail({
  evidenceRows,
  comparisonRows,
  readinessStages,
}: {
  evidenceRows: EvidenceRow[];
  comparisonRows: ComparisonRow[];
  readinessStages: ReadinessStage[];
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-6 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6">
      <EvidenceForDestination rows={evidenceRows} />
      <PathwayComparison rows={comparisonRows} />
      <RelocationReadinessCompact stages={readinessStages} />
    </div>
  );
}
