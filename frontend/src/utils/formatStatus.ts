// Task 42 — shared status-label formatter. Turns a backend snake_case
// status value (e.g. "not_evaluated", "no_evidence_found") into a
// readable Title Case label ("Not Evaluated", "No Evidence Found")
// with ONE consistent capitalization convention across every page,
// instead of each page hand-writing its own literal string that can
// drift out of sync with the real status value. Never invents a status
// — only reformats whatever string the backend already returned.
//
// Task 43 §5 — a small, explicit set of raw backend status codes get a
// specific officer-facing phrase instead of a generic Title Case
// reformat, since e.g. "no_scoring_rule" → "No Scoring Rule" still
// reads as internal/technical rather than as something an officer
// would say. Only the five codes named in the task are translated;
// every other status still falls back to the Title Case reformat
// below — this never invents a phrase for a status the table doesn't
// name. The underlying raw status is never discarded: it stays
// available wherever the full dimension/pathway record is already
// shown (rule_reference, evidence lists, an expandable "Details" view).
const STATUS_PHRASES: Record<string, string> = {
  no_scoring_rule: "Assessment rule pending",
  no_data: "Data unavailable",
  not_evaluated: "Not assessed",
  insufficient_evidence: "More evidence needed",
  source_data_unavailable: "Source unavailable",
};

export function formatStatusLabel(status: string): string {
  const phrase = STATUS_PHRASES[status];
  if (phrase) return phrase;

  return status
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
