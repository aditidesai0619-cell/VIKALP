import type { BadgeTone } from "../components/common/Badge";

// Global UI refinement — semantic status color mapping, shared by
// every Badge/status-pill call site instead of each one hand-picking
// (almost always "warning"). Maps a status STRING's meaning to a
// BadgeTone: Available -> green, Limited/Partial/Review -> amber,
// Not integrated/Not available/Not started/no data -> grey,
// Required/Pending -> orange-red. Never changes the status text
// itself — purely a presentation lookup over strings already produced
// elsewhere from real data.
export function statusTone(value: string): BadgeTone {
  const v = value.trim().toLowerCase();

  if (
    v.startsWith("not ") ||
    v === "no data" ||
    v === "—" ||
    v === "unavailable" ||
    v.includes("unavailable") ||
    v.includes("no evidence") ||
    v.includes("no candidate")
  ) {
    return "neutral";
  }

  if (v.includes("required") || v === "pending" || v.endsWith(" pending")) {
    return "critical";
  }

  if (v.includes("limited") || v.includes("partial") || v.includes("review")) {
    return "warning";
  }

  if (
    v.includes("available") ||
    v.includes("complete") ||
    v.includes("saved") ||
    v.includes("identified") ||
    v.includes("selected for officer review")
  ) {
    return "safe";
  }

  return "neutral";
}
