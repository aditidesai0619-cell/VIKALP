// Evidence Locker / Data Provenance (Task 39) — read-only trust and
// traceability records. Content mirrors already-documented facts from
// docs/DATA_PROVENANCE.md, docs/DECISIONS.md, and the same provenance
// strings backend/app/services/{hazard_exposure,report,copilot}.py
// already use. Nothing here is invented, and this file is never
// user-editable — there is no upload/edit/delete UI anywhere in VIKALP.

export type EvidenceCategory = "source-backed" | "derived" | "demo-input" | "missing";

export interface EvidenceRecord {
  id: string;
  title: string;
  category: EvidenceCategory;
  source: string;
  dataset: string;
  geographicScope: string;
  description: string;
  usageInVikalp: string;
  // A short, meaningful label — never a generic risk-implying color name.
  // e.g. "Verified source" | "Derived" | "Demo planning input" |
  // "Unavailable" | "Pending validation"
  status: string;
  attribution?: string;
  limitations: string[];
  affectedModules: string[];
}
