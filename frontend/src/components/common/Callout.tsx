import type { ReactNode } from "react";

// Global UI refinement — the "officer review required" line appeared
// as plain critical-colored text on Risk/Decision/Destination/
// Relocation Planner, with no visual weight of its own. Extracted once
// as a proper callout (icon + tinted background) and reused across
// every page that shows this same real disclosure, instead of
// patching each copy of the plain-text version separately.
const TONE_CLASSES: Record<"warning" | "critical", string> = {
  warning: "border-vikalp-warning/30 bg-vikalp-warning/10 text-vikalp-warning",
  critical: "border-vikalp-critical/30 bg-vikalp-critical/10 text-vikalp-critical",
};

export function Callout({
  icon,
  tone = "critical",
  children,
}: {
  icon: ReactNode;
  tone?: "warning" | "critical";
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm font-medium ${TONE_CLASSES[tone]}`}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}
