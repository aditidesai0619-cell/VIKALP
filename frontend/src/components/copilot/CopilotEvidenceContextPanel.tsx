import type { ReactNode } from "react";
import type { ApiCopilotContext } from "../../types/copilot";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
        {label}
      </span>
      <span className="text-xs text-vikalp-text">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-vikalp-border pb-3 last:border-b-0 last:pb-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Everything shown here comes directly from the CopilotContext object
// already returned by GET /api/settlements/{id}/copilot-context (Task
// 37) — no field is recomputed, and nothing internal (tokens, stack
// traces, filesystem paths) is exposed (Task 41 §13).
export function CopilotEvidenceContextPanel({ context }: { context: ApiCopilotContext }) {
  return (
    <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
      <Section title="Settlement">
        <Field
          value={`${context.settlement.name} — ${context.settlement.district}, ${context.settlement.state}`}
          label="Identity"
        />
        <Field
          value={`Population ${context.settlement.population}, households ${context.settlement.households}`}
          label="Population / households"
        />
        <Field label="Data status" value={context.settlement.data_note} />
      </Section>

      <Section title="Risk assessment">
        <Field label="Assessment status" value={context.risk_assessment.assessment_status} />
        <Field label="Data completeness" value={context.risk_assessment.data_completeness} />
        <Field
          label="Overall score / level"
          value={`${context.risk_assessment.overall_score ?? "null"} / ${
            context.risk_assessment.risk_level ?? "null"
          }`}
        />
      </Section>

      <Section title="Risk dimensions">
        <ul className="flex flex-col gap-0.5 text-xs text-vikalp-text">
          {context.risk_dimensions.map((dimension) => (
            <li key={dimension.dimension}>
              {dimension.dimension}: {dimension.status}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hazard exposure">
        {context.hazard_exposure ? (
          <>
            <Field label="Status" value={context.hazard_exposure.status} />
            <Field
              label="Qualifying / contextual records"
              value={`${context.hazard_exposure.qualifying_record_count} qualifying, ${context.hazard_exposure.contextual_record_count} contextual`}
            />
          </>
        ) : (
          <span className="text-xs text-vikalp-text-secondary">Not available.</span>
        )}
      </Section>

      <Section title="Decision workspace">
        <Field label="Decision status" value={context.decision_workspace.decision_status} />
        <ul className="flex flex-col gap-0.5 text-xs text-vikalp-text">
          {context.decision_workspace.pathways.map((pathway) => (
            <li key={pathway.pathway}>
              {pathway.pathway}: {pathway.status}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Destinations">
        <Field label="Analysis status" value={context.destinations.analysis_status} />
        <Field
          label="Candidates"
          value={`${context.destinations.candidates.length} candidate(s) recorded`}
        />
      </Section>

      <Section title="Provenance">
        <Field
          label="Source-backed"
          value={context.provenance.official_sources.join("; ") || "None recorded"}
        />
        <Field
          label="VIKALP-derived"
          value={context.provenance.derived_calculations.join("; ") || "None recorded"}
        />
        <Field
          label="Demo planning input"
          value={context.provenance.demo_planning_inputs.join("; ") || "None recorded"}
        />
      </Section>

      <Section title="Missing evidence">
        {context.missing_evidence.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-xs text-vikalp-text">
            {context.missing_evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-vikalp-text-secondary">None recorded.</span>
        )}
      </Section>

      <Section title="Limitations">
        <ul className="flex flex-col gap-1 text-xs text-vikalp-text-secondary">
          {context.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </Section>

      <Section title="Policy disclaimer">
        <p className="text-xs text-vikalp-text-secondary">{context.policy_disclaimer}</p>
      </Section>
    </div>
  );
}
