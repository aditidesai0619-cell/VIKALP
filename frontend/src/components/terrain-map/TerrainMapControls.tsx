// 40x40px buttons — same sizing convention as RelocationMap's custom
// zoom controls (Task 45.9), extended with pitch/tilt since this map
// is a 3D view. MapLibre's own NavigationControl (top-right, added in
// TerrainMap.tsx) already gives compass + a second zoom control; this
// panel is the primary, larger-target one for an officer on a tablet.
export function TerrainMapControls({
  onZoomIn,
  onZoomOut,
  onTiltUp,
  onTiltDown,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTiltUp: () => void;
  onTiltDown: () => void;
  onReset: () => void;
}) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-md border border-vikalp-border bg-vikalp-card/95 p-1">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        −
      </button>
      <div className="my-0.5 h-px bg-vikalp-border" />
      <button
        type="button"
        aria-label="Tilt up"
        onClick={onTiltUp}
        className="flex h-10 w-10 items-center justify-center rounded text-sm text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        ⤒
      </button>
      <button
        type="button"
        aria-label="Tilt down"
        onClick={onTiltDown}
        className="flex h-10 w-10 items-center justify-center rounded text-sm text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        ⤓
      </button>
      <div className="my-0.5 h-px bg-vikalp-border" />
      <button
        type="button"
        aria-label="Reset view"
        onClick={onReset}
        className="flex h-10 w-10 items-center justify-center rounded text-lg text-vikalp-navy transition-colors hover:bg-vikalp-bg"
      >
        ⟲
      </button>
    </div>
  );
}
