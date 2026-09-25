import { Badge } from "../common/Badge";
import { statusTone } from "../../utils/statusTone";

// Decision Workspace redesign — Officer Review (brief §15). VIKALP has
// no backend endpoint to persist a pathway selection or officer notes
// (confirmed: no POST/PATCH exists on /api/settlements/{id}/decision,
// and the brief explicitly forbids adding new backend APIs for this
// redesign). Rather than wire a "Save" button to nothing — or silently
// pretend it persisted — this keeps the review genuinely functional
// (it updates real, visible page state the rest of the workspace reads
// from) while disclosing plainly that it is session-only. That is the
// brief's own instruction at work: "if approval functionality does not
// exist, communicate that honestly rather than creating fake controls."
export const OFFICER_REVIEW_PANEL_ID = "officer-review-panel";

const PATHWAY_NAMES = ["Protect", "Adapt", "Relocate"] as const;

export function OfficerReviewPanel({
  selectedPathway,
  onSelectPathway,
  notes,
  onNotesChange,
  rationale,
  onRationaleChange,
  saved,
  savedAt,
  onSave,
}: {
  selectedPathway: string | null;
  onSelectPathway: (pathway: string | null) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  rationale: string;
  onRationaleChange: (value: string) => void;
  saved: boolean;
  savedAt: string | null;
  onSave: () => void;
}) {
  const reviewStatus = saved ? "Saved (session only)" : selectedPathway || notes || rationale ? "Draft" : "Not started";

  return (
    <div
      id={OFFICER_REVIEW_PANEL_ID}
      className="flex flex-col gap-4 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-vikalp-navy">Officer Review</h2>
        <Badge tone={statusTone(reviewStatus)}>{reviewStatus}</Badge>
      </div>

      <p className="text-sm text-vikalp-text-secondary">
        The officer remains the final decision-maker. VIKALP does not select a pathway
        automatically — a pathway is only "selected" here once you explicitly choose one.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Selected pathway
          </span>
          <select
            value={selectedPathway ?? ""}
            onChange={(event) => onSelectPathway(event.target.value || null)}
            className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy"
          >
            <option value="">Not selected</option>
            {PATHWAY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-vikalp-text-secondary">
            Review status
          </span>
          <span className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text">
            {saved && savedAt ? `Saved for this session at ${savedAt}` : reviewStatus}
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-vikalp-text-secondary">
          Officer notes
        </span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={3}
          placeholder="Observations, open questions, or evidence gaps to follow up on…"
          className="resize-none rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-vikalp-text-secondary">
          Rationale
        </span>
        <textarea
          value={rationale}
          onChange={(event) => onRationaleChange(event.target.value)}
          rows={3}
          placeholder="Why this pathway (once selected) — cite the specific evidence above…"
          className="resize-none rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {/* Filled primary button — the brand accent reserved for the
            active nav item and primary actions like this one. */}
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-vikalp-navy px-5 py-2.5 text-sm font-semibold text-vikalp-bg transition-colors hover:bg-vikalp-navy/90"
        >
          Save review
        </button>
        <span className="text-xs text-vikalp-text-secondary">
          Saved for this browser session only — VIKALP does not yet persist officer review
          submissions to a backend approval workflow.
        </span>
      </div>
    </div>
  );
}
