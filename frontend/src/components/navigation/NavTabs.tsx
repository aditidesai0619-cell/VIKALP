import { primaryNavItems } from "../../data/navigation";
import type { PageId } from "../../types/navigation";

// Task 45.6 — "relocation-planner" has no primary tab of its own (it's
// reached from inside Destination Explorer), but the "Destination &
// Relocation" tab should still read as active while the officer is on
// that page, the same way the tab stays "current" for its own id.
const ALIASED_ACTIVE_PAGES: Partial<Record<PageId, PageId>> = {
  "relocation-planner": "destination-explorer",
  // "terrain-3d" has no primary tab either — it's reached from inside
  // Settlement (Map Intelligence), same pattern as relocation-planner.
  "terrain-3d": "map-intelligence",
};

export function NavTabs({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const effectiveActivePage = ALIASED_ACTIVE_PAGES[activePage] ?? activePage;

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {primaryNavItems.map((item) => {
        const isActive = item.id === effectiveActivePage;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-vikalp-navy text-vikalp-bg"
                : "text-vikalp-text-secondary hover:bg-vikalp-bg hover:text-vikalp-navy"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
