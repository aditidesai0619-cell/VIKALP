import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "safe" | "warning" | "critical";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-vikalp-border/40 text-vikalp-text-secondary border-vikalp-border",
  safe: "bg-vikalp-safe/10 text-vikalp-safe border-vikalp-safe/30",
  warning: "bg-vikalp-warning/10 text-vikalp-warning border-vikalp-warning/30",
  critical: "bg-vikalp-critical/10 text-vikalp-critical border-vikalp-critical/30",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
