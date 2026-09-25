// Subtle "ARCHIVED EVIDENCE VIEW" watermark, overlaid on any map shown
// while Historical Replay is active (brief §2). Deliberately not
// interactive (pointer-events-none) and low-contrast — a disclosure,
// not a decoration.
export function MapWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-1200 flex items-center justify-center"
      aria-hidden="true"
    >
      <span className="select-none text-2xl font-semibold uppercase tracking-[0.35em] text-vikalp-warning/15">
        Archived Evidence View
      </span>
    </div>
  );
}
