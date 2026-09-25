// Controlled Copilot prompts (Task 41 §8). These are NOT free-form
// chatbot input — there is no text box that sends an arbitrary string
// anywhere. Each prompt below simply selects which already-fetched,
// already-verified fields of the current settlement's CopilotContext/
// EvidenceExplanation (Task 37's deterministic backend) to display.
// No new network request happens per prompt click, no value here is
// computed/derived beyond string formatting of an existing field, and
// nothing is ever sent to an LLM (there is no LLM in this codebase).

import type { ApiCopilotContext, ApiEvidenceExplanation } from "../../types/copilot";

export interface CopilotPrompt {
  id: string;
  label: string;
}

export const COPILOT_PROMPTS: CopilotPrompt[] = [
  { id: "explain-assessment", label: "Explain the current assessment." },
  { id: "evidence-available", label: "What evidence is available?" },
  { id: "why-pending", label: "Why is the assessment pending?" },
  { id: "evidence-missing", label: "What evidence is missing?" },
  { id: "landslide-evidence", label: "Explain the landslide evidence." },
  {
    id: "officer-review",
    label: "What should an officer review before making a decision?",
  },
];

export interface CopilotAnswer {
  paragraphs: string[];
  bullets: string[];
}

export function buildCopilotAnswer(
  promptId: string,
  context: ApiCopilotContext,
  explanation: ApiEvidenceExplanation,
): CopilotAnswer {
  switch (promptId) {
    case "explain-assessment":
      return { paragraphs: [explanation.summary], bullets: [] };

    case "evidence-available": {
      const bullets = [
        ...context.provenance.official_sources,
        ...context.provenance.derived_calculations,
        ...context.provenance.demo_planning_inputs,
      ];
      return {
        paragraphs: [
          bullets.length > 0
            ? "Evidence reviewed for this explanation:"
            : "No evidence is currently on record for this settlement.",
        ],
        bullets,
      };
    }

    case "why-pending": {
      const scoredCount = context.risk_dimensions.filter((d) => d.score !== null).length;
      const totalCount = context.risk_dimensions.length;
      return {
        paragraphs: [
          `Overall risk assessment status: ${context.risk_assessment.assessment_status}. ` +
            `Data completeness: ${context.risk_assessment.data_completeness}.`,
          `${scoredCount} of ${totalCount} risk dimensions currently have a scored result.`,
        ],
        bullets: context.risk_dimensions.map(
          (dimension) =>
            `${dimension.dimension}: ${dimension.status}` +
            (dimension.score !== null ? ` (score ${dimension.score})` : ""),
        ),
      };
    }

    case "evidence-missing":
      return {
        paragraphs: [
          context.missing_evidence.length > 0
            ? "VIKALP cannot make a complete assessment from the currently " +
              "available evidence. The following evidence is missing:"
            : "No missing-evidence items are currently recorded for this settlement.",
        ],
        bullets: context.missing_evidence,
      };

    case "landslide-evidence": {
      const hazard = context.hazard_exposure;
      if (!hazard) {
        return {
          paragraphs: ["Hazard Exposure evidence is not available for this settlement."],
          bullets: [],
        };
      }
      const bullets = [
        `Qualifying records within ${hazard.scoring_radius_km} km: ${hazard.qualifying_record_count}`,
      ];
      if (hazard.nearest_contextual_distance_km !== null) {
        bullets.push(
          `Nearest contextual record: ${hazard.nearest_contextual_distance_km} km away`,
        );
      }
      bullets.push(
        `Contextual records within ${hazard.context_radius_km} km: ${hazard.contextual_record_count}`,
      );
      return {
        paragraphs: [`Hazard Exposure status: ${hazard.status}.`, hazard.inventory_bias_disclaimer],
        bullets,
      };
    }

    case "officer-review":
      return {
        paragraphs: [explanation.officer_action],
        bullets: context.limitations,
      };

    default:
      return { paragraphs: [], bullets: [] };
  }
}
