// Reusable status banners — exact wording as specified, never an
// empty/blank map with no explanation of why.
export type MapStatusBannerKind = "loading" | "terrain-unavailable" | "evidence-unavailable";

const MESSAGES: Record<MapStatusBannerKind, string> = {
  loading: "Loading terrain and map layers…",
  "terrain-unavailable": "3D terrain is unavailable. The map is shown in 2D mode.",
  "evidence-unavailable": "Historical evidence is currently unavailable.",
};

export function MapStatusBanner({ kind }: { kind: MapStatusBannerKind }) {
  const tone = kind === "loading" ? "text-vikalp-text-secondary" : "text-vikalp-warning";
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-3 z-1200 -translate-x-1/2 rounded-md border border-vikalp-border bg-vikalp-card/95 px-3 py-1.5 text-[12px] font-medium ${tone}`}
    >
      {MESSAGES[kind]}
    </div>
  );
}
