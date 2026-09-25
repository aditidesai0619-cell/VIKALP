import type { EvidenceCategory } from "../../types/evidence";

// Gold ("warning" tone, --color-vikalp-warning) is used strategically —
// only for the two categories that genuinely need officer attention
// (unvalidated demo input, missing evidence). Source-backed and derived
// evidence stay neutral. No "safe"/green tone is used anywhere on this
// page — a data-provenance distinction is not a risk-safety claim.
export const CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  "source-backed": "Source-backed",
  derived: "VIKALP-derived",
  "demo-input": "Demo planning input",
  missing: "Missing / unavailable",
};

export const CATEGORY_BADGE_TONE: Record<
  EvidenceCategory,
  "neutral" | "warning"
> = {
  "source-backed": "neutral",
  derived: "neutral",
  "demo-input": "warning",
  missing: "warning",
};
