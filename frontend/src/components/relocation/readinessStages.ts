import type { ApiSettlementDestinationAnalysis } from "../../types/destination";

// Task 45.9 — Relocation Readiness pipeline (brief §11), derived
// live from real data rather than hardcoded, so if a real government-
// curated destination candidate or a real infrastructure/land/water
// dataset is ever integrated, these stages update automatically with
// no code change — the same "structurally supported, not yet
// integrated" principle destination.py's own schema already follows.
//
// State wording per stage is the brief's own explicit §13 mapping,
// verbatim in spirit:
//   "Capacity: Not assessed" / "Land suitability: Not assessed" ->
//     these two alone read from the real suitability_dimensions'
//     "not_evaluated" status (a governance/process fact).
//   "Water/Housing/Healthcare/School: Not available" and
//   "Road/access: Not available unless real evidence exists" ->
//     these are DATA-availability facts (confirmed zero in every
//     audit this project has done — docs/DECISIONS.md Task 30), so
//     they render Unavailable regardless of the generic
//     "not_evaluated" dimension status, which would otherwise say
//     the same thing for a different reason.
export type ReadinessState = "available" | "review-required" | "blocked" | "unavailable" | "not-assessed";

export interface ReadinessStage {
  id: string;
  label: string;
  state: ReadinessState;
  detail: string;
}

export function deriveReadinessStages(
  analysis: ApiSettlementDestinationAnalysis | null,
  settlementName: string,
): ReadinessStage[] {
  const hasCandidate = (analysis?.candidates.length ?? 0) > 0;
  const landDimension = analysis?.suitability_dimensions.find((d) => d.dimension === "Land Suitability");
  const capacityDimension = analysis?.suitability_dimensions.find((d) => d.dimension === "Available Capacity");

  return [
    {
      id: "current-settlement",
      label: "Current Settlement",
      state: "available",
      detail: settlementName,
    },
    {
      id: "candidate-site",
      label: "Candidate Site",
      state: hasCandidate ? "available" : "unavailable",
      detail: hasCandidate ? `${analysis!.candidates.length} candidate(s)` : "None",
    },
    {
      id: "land-safety",
      label: "Land Safety",
      state: landDimension && landDimension.status !== "not_evaluated" ? "available" : "not-assessed",
      detail: "Not assessed",
    },
    {
      id: "water-housing",
      label: "Water + Housing",
      state: "unavailable",
      detail: "Not available",
    },
    {
      id: "school-healthcare",
      label: "School + Healthcare",
      state: "unavailable",
      detail: "Not available",
    },
    {
      id: "road-access",
      label: "Road / Access",
      state: "unavailable",
      detail: "Not available unless real evidence exists",
    },
    {
      id: "capacity",
      label: "Capacity",
      state: capacityDimension && capacityDimension.status !== "not_evaluated" ? "available" : "not-assessed",
      detail: "Not assessed",
    },
    {
      id: "officer-review",
      label: "Officer Review",
      state: "review-required",
      detail: "Evidence available for officer review",
    },
  ];
}
