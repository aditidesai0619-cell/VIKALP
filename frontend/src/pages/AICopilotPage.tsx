import { useCallback, useEffect, useState } from "react";
import { Badge } from "../components/common/Badge";
import { CopilotEvidenceContextPanel } from "../components/copilot/CopilotEvidenceContextPanel";
import { CopilotGovernancePanel } from "../components/copilot/CopilotGovernancePanel";
import {
  buildCopilotAnswer,
  COPILOT_PROMPTS,
  type CopilotAnswer,
} from "../components/copilot/copilotPrompts";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import {
  fetchSettlementCopilotContext,
  fetchSettlementEvidenceExplanation,
} from "../services/copilot";
import { fetchSettlements } from "../services/settlements";
import { statusTone } from "../utils/statusTone";
import type { PageId } from "../types/navigation";
import type {
  CopilotContextRequestState,
  EvidenceExplanationRequestState,
} from "../types/copilot";
import type { ApiSettlement } from "../types/settlement";

type SettlementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; settlements: ApiSettlement[] };

interface ConversationTurn {
  key: string;
  promptLabel: string;
  answer: CopilotAnswer;
}

// Never surfaces the raw Error.message from apiFetch (which is already
// sanitized — no stack trace/path — but is still written for developers,
// not officers). Maps the small set of statuses this page can actually
// see to the exact copy Task 41 §15 asked for.
function friendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  if (raw.includes("session has expired")) return raw; // App.tsx is about to redirect anyway.
  if (raw.includes("HTTP 404")) return "This settlement could not be found.";
  if (raw.includes("Could not reach")) {
    return "Could not reach the VIKALP backend. Please check your connection and try again.";
  }
  return "VIKALP Copilot could not load right now. Please try again.";
}

export function AICopilotPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const [settlementsState, setSettlementsState] = useState<SettlementsState>({
    status: "loading",
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [contextState, setContextState] = useState<CopilotContextRequestState>({
    status: "loading",
  });
  const [explanationState, setExplanationState] = useState<EvidenceExplanationRequestState>({
    status: "loading",
  });
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [showEvidenceContext, setShowEvidenceContext] = useState(false);

  useEffect(() => {
    fetchSettlements()
      .then((settlements) => {
        setSettlementsState({ status: "success", settlements });
        setSelectedId((current) => current ?? settlements[0]?.id ?? null);
      })
      .catch((error: unknown) =>
        setSettlementsState({ status: "error", message: friendlyErrorMessage(error) }),
      );
  }, []);

  const runFetchCopilot = useCallback((id: number) => {
    setContextState({ status: "loading" });
    setExplanationState({ status: "loading" });
    setConversation([]);

    // Two independent, already-existing, already-authenticated backend
    // calls (Task 37) — each already records its own VIEW_COPILOT_CONTEXT/
    // VIEW_EVIDENCE_EXPLANATION audit event server-side. No new fetch or
    // audit mechanism is introduced here (Task 41 §16).
    fetchSettlementCopilotContext(id)
      .then((context) => setContextState({ status: "success", context }))
      .catch((error: unknown) =>
        setContextState({ status: "error", message: friendlyErrorMessage(error) }),
      );

    fetchSettlementEvidenceExplanation(id)
      .then((explanation) => setExplanationState({ status: "success", explanation }))
      .catch((error: unknown) =>
        setExplanationState({ status: "error", message: friendlyErrorMessage(error) }),
      );
  }, []);

  useEffect(() => {
    if (selectedId !== null) runFetchCopilot(selectedId);
  }, [selectedId, runFetchCopilot]);

  const handlePrompt = (promptId: string, promptLabel: string) => {
    if (contextState.status !== "success" || explanationState.status !== "success") return;
    // No network request here — a controlled prompt only selects which
    // already-fetched fields to display (see copilotPrompts.ts).
    const answer = buildCopilotAnswer(promptId, contextState.context, explanationState.explanation);
    setConversation((turns) => [
      ...turns,
      { key: `${promptId}-${turns.length}`, promptLabel, answer },
    ]);
  };

  const isLoadingCopilot = contextState.status === "loading" || explanationState.status === "loading";
  const isCopilotReady = contextState.status === "success" && explanationState.status === "success";

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-vikalp-navy">AI Copilot</h1>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">Controlled • Evidence grounded</Badge>
              <button
                type="button"
                onClick={() => onNavigate("reports")}
                className="rounded-md border border-vikalp-border px-3 py-1.5 text-xs font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
              >
                Generate Report →
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-vikalp-text-secondary">
            Evidence-grounded assistance for VIKALP assessments.
          </p>
          <p className="mt-2 rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-[11px] text-vikalp-text-secondary">
            Copilot answers are generated only from verified VIKALP
            assessment context. Missing evidence remains missing.
            Deterministic VIKALP rules remain the source of truth. This is
            a controlled explanation layer — powered by verified VIKALP
            assessment context, not an external AI model.
          </p>
        </div>

        <CopilotGovernancePanel />

        <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
            Settlement
          </h2>

          {settlementsState.status === "loading" && (
            <span className="mt-2 block text-xs text-vikalp-text-secondary">
              Loading settlements…
            </span>
          )}
          {settlementsState.status === "error" && (
            <span className="mt-2 block text-xs text-vikalp-critical">
              {settlementsState.message}
            </span>
          )}
          {settlementsState.status === "success" && (
            <div className="mt-2 flex flex-col gap-2">
              {settlementsState.settlements.map((settlement) => (
                <button
                  key={settlement.id}
                  type="button"
                  onClick={() => setSelectedId(settlement.id)}
                  className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
                    selectedId === settlement.id
                      ? "border-vikalp-navy bg-vikalp-navy/5"
                      : "border-vikalp-border bg-vikalp-card hover:bg-vikalp-bg"
                  }`}
                >
                  <span className="text-sm font-semibold text-vikalp-navy">
                    {settlement.name}
                  </span>
                  <span className="text-xs text-vikalp-text-secondary">
                    {settlement.district}, {settlement.state}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isCopilotReady && (
            <div className="mt-3 flex items-center gap-2 border-t border-vikalp-border pt-3">
              <span className="text-xs text-vikalp-text-secondary">Assessment status:</span>
              <Badge
                tone={statusTone(
                  contextState.status === "success" &&
                    contextState.context.risk_assessment.assessment_status === "complete"
                    ? "Assessment complete"
                    : "Assessment pending",
                )}
              >
                {contextState.status === "success" &&
                contextState.context.risk_assessment.assessment_status === "complete"
                  ? "Assessment complete"
                  : "Assessment pending"}
              </Badge>
            </div>
          )}
        </div>

        {isLoadingCopilot && (
          <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 text-center text-xs text-vikalp-text-secondary">
            Reviewing VIKALP evidence…
          </div>
        )}

        {contextState.status === "error" && (
          <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4 text-center text-xs font-medium text-vikalp-critical">
            {contextState.message}
          </div>
        )}

        {isCopilotReady && (
          <>
            <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
                Ask about this assessment
              </h2>
              <p className="mt-1 text-[11px] text-vikalp-text-secondary">
                These are controlled prompts only — Copilot does not accept
                free-form questions, and every answer below is built
                entirely from the evidence already returned for this
                settlement.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COPILOT_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    onClick={() => handlePrompt(prompt.id, prompt.label)}
                    className="rounded-full border border-vikalp-border px-3 py-1.5 text-xs font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>

            {conversation.length > 0 && (
              <div className="flex flex-col gap-3">
                {conversation.map((turn) => (
                  <div
                    key={turn.key}
                    className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4"
                  >
                    <span className="text-xs font-semibold text-vikalp-text-secondary">
                      {turn.promptLabel}
                    </span>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {turn.answer.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-sm text-vikalp-text">
                          {paragraph}
                        </p>
                      ))}
                      {turn.answer.bullets.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-1 text-xs text-vikalp-text-secondary">
                          {turn.answer.bullets.map((bullet) => (
                            <li key={bullet}>• {bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
              <button
                type="button"
                onClick={() => setShowEvidenceContext((v) => !v)}
                className="text-xs font-medium text-vikalp-navy underline decoration-vikalp-warning underline-offset-2"
              >
                {showEvidenceContext ? "Hide evidence context" : "View evidence context"}
              </button>
              {showEvidenceContext && (
                <div className="mt-3">
                  <CopilotEvidenceContextPanel context={contextState.context} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SimplePageLayout>
  );
}
