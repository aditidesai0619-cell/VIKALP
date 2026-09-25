import { useCallback, useEffect, useRef, useState } from "react";
import { Callout } from "../components/common/Callout";
import { AlertTriangleIcon } from "../components/common/icons";
import { SimplePageLayout } from "../components/layout/SimplePageLayout";
import { generateSettlementReport } from "../services/report";
import { fetchSettlements } from "../services/settlements";
import type { PageId } from "../types/navigation";
import type { ApiSettlement } from "../types/settlement";

type SettlementsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; settlements: ApiSettlement[] };

type GenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string }
  | { status: "success"; url: string; filename: string };

// Matches the actual sections backend/app/services/report.py builds
// (Task 34) — nothing here is invented or reordered. This list exists
// only to explain the report's contents; the PDF itself is never
// reproduced/duplicated in the frontend (Task 40 §N).
const REPORT_SECTIONS = [
  "Settlement context",
  "GIS evidence sources",
  "Five-dimension risk assessment status",
  "Hazard Exposure detail",
  "Decision Workspace status",
  "Destination / capacity status",
  "Governance / provenance",
  "Limitations",
  "Officer review",
];

export function ReportsPage({
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
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: "idle",
  });
  const objectUrlRef = useRef<string | null>(null);

  const runFetchSettlements = useCallback(() => {
    setSettlementsState({ status: "loading" });
    fetchSettlements()
      .then((settlements) => {
        setSettlementsState({ status: "success", settlements });
        setSelectedId((current) => current ?? settlements[0]?.id ?? null);
      })
      .catch((error: unknown) =>
        setSettlementsState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error.",
        }),
      );
  }, []);

  useEffect(() => {
    runFetchSettlements();
  }, [runFetchSettlements]);

  // Release the previous PDF's object URL on unmount — the backend
  // remains the only source of the document; the frontend never stores
  // it beyond the current page view (Task 40 §E).
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleGenerate = () => {
    if (selectedId === null || generationState.status === "generating") return;
    setGenerationState({ status: "generating" });
    generateSettlementReport(selectedId)
      .then(({ blob, filename }) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setGenerationState({
          status: "success",
          url,
          filename: filename ?? "VIKALP_Evidence_Assessment.pdf",
        });
      })
      .catch(() => {
        setGenerationState({
          status: "error",
          message: "Unable to generate the report. Please try again.",
        });
      });
  };

  const handleOpen = () => {
    if (generationState.status !== "success") return;
    window.open(generationState.url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (generationState.status !== "success") return;
    const link = document.createElement("a");
    link.href = generationState.url;
    link.download = generationState.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SimplePageLayout activePage={activePage} onNavigate={onNavigate}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-[22px] font-semibold text-vikalp-navy">
              Evidence Assessment Reports
            </h1>
            <button
              type="button"
              onClick={() => onNavigate("risk-analysis")}
              className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:border-vikalp-warning hover:bg-vikalp-warning/10"
            >
              ← Return to Assessment
            </button>
          </div>
          <p className="mt-1 text-[15px] text-vikalp-text-secondary">
            Generate an officer-ready evidence assessment from the current
            VIKALP outputs.
          </p>
        </div>

        {/* One grouped workspace panel for report configuration
            (settlement + contents) instead of two separately-boxed
            cards — both are the same "what will this report contain"
            concern, just split into readable sections via a divider. */}
        <div className="flex flex-col divide-y divide-vikalp-border rounded-vikalp-card border border-vikalp-border bg-vikalp-card">
          <div className="p-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Settlement
            </h2>

            {settlementsState.status === "loading" && (
              <span className="mt-2 block text-[14px] text-vikalp-text-secondary">
                Loading settlements…
              </span>
            )}

            {settlementsState.status === "error" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[14px] text-vikalp-critical">
                  {settlementsState.message}
                </span>
                <button
                  type="button"
                  onClick={runFetchSettlements}
                  className="rounded-md border border-vikalp-border px-2.5 py-1 text-[12px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
                >
                  Retry
                </button>
              </div>
            )}

            {settlementsState.status === "success" && (
              <div className="mt-2 flex flex-col gap-2">
                {settlementsState.settlements.map((settlement) => (
                  <button
                    key={settlement.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(settlement.id);
                      setGenerationState({ status: "idle" });
                    }}
                    className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors ${
                      selectedId === settlement.id
                        ? "border-vikalp-navy bg-vikalp-navy/5"
                        : "border-vikalp-border bg-vikalp-card hover:bg-vikalp-bg"
                    }`}
                  >
                    <span className="text-[16px] font-semibold text-vikalp-navy">
                      {settlement.name}
                    </span>
                    <span className="text-[14px] text-vikalp-text-secondary">
                      {settlement.district}, {settlement.state}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-vikalp-text-secondary">
              Evidence included
            </h2>
            <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[14px] text-vikalp-text sm:grid-cols-2">
              {REPORT_SECTIONS.map((section) => (
                <li key={section}>• {section}</li>
              ))}
            </ul>
          </div>
        </div>

        <Callout icon={<AlertTriangleIcon className="h-4 w-4" />} tone="warning">
          <span className="font-medium text-vikalp-text">
            Evidence-backed VIKALP assessment — not an emergency order, not an automatic
            relocation order, and not a government-certified risk declaration.
          </span>{" "}
          <span className="text-vikalp-text-secondary">
            Presents currently available evidence and the current assessment status only; it
            does not certify a final risk level. Pending or unavailable evidence is never
            interpreted as low risk — absence of evidence is not evidence of safety. Officer
            review is required before any protection, adaptation, or relocation decision is
            made.
          </span>
        </Callout>

        <div className="flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={selectedId === null || generationState.status === "generating"}
            className="self-start rounded-md bg-vikalp-navy px-4 py-2 text-sm font-semibold text-vikalp-bg transition-colors hover:bg-vikalp-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generationState.status === "generating"
              ? "Generating…"
              : "Generate Evidence Assessment"}
          </button>

          {generationState.status === "error" && (
            <span className="text-[13px] font-medium text-vikalp-critical">
              {generationState.message}
            </span>
          )}

          {generationState.status === "success" && (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-vikalp-text">
                Evidence assessment generated.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpen}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
                >
                  Open PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-md border border-vikalp-border px-3 py-1.5 text-[13px] font-medium text-vikalp-navy transition-colors hover:bg-vikalp-bg"
                >
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimplePageLayout>
  );
}
