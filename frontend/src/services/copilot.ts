// Task 37 — small, future-ready service layer for the Copilot evidence
// foundation. Not wired into a chatbot UI in this task; available for a
// future AI Copilot interface to call once that is separately approved
// (see docs/DECISIONS.md "Task 37" — no LLM/RAG is integrated here).

import type { ApiCopilotContext, ApiEvidenceExplanation } from "../types/copilot";
import { apiFetch } from "./apiClient";

export async function fetchSettlementCopilotContext(
  id: number,
): Promise<ApiCopilotContext> {
  return apiFetch<ApiCopilotContext>(`/api/settlements/${id}/copilot-context`);
}

export async function fetchSettlementEvidenceExplanation(
  id: number,
): Promise<ApiEvidenceExplanation> {
  return apiFetch<ApiEvidenceExplanation>(`/api/settlements/${id}/explanation`);
}
