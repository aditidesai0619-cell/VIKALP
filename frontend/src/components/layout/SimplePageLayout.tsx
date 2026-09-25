import type { ReactNode } from "react";
import type { PageId } from "../../types/navigation";
import { Header } from "./Header";

// Full-screen composition pass — the previous 1440px centered cap
// read as "the app floating in the middle of the screen" on any
// monitor wider than that (1536px/1920px+ are both common desktop
// sizes). This is now a fluid application workspace: no max-width
// cap, just the same responsive horizontal gutters (32px desktop /
// 24px tablet / 16px mobile) and 24px top / 32px bottom padding,
// so the workspace genuinely occupies the available viewport instead
// of leaving large empty margins on either side. Two modes share the
// exact same width/gutters/padding, differing only in how their
// height behaves:
//   - "scroll" (default): natural document height — the officer's
//     content (cards, evidence, forms) simply grows, and this
//     container is the single scroll owner. No page should nest its
//     own `overflow-y-auto` wrapper anymore; that was the source of
//     the double/nested scroll region with the mismatched default
//     scrollbar.
//   - "fill": a bounded height (fills the viewport below the header,
//     no page scroll) for map-first workspaces (Overview, Settlement,
//     Risk, 3D Terrain) whose internal map needs a definite height to
//     size against, not a growing document.
export function SimplePageLayout({
  activePage,
  onNavigate,
  children,
  mode = "scroll",
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
  mode?: "scroll" | "fill";
}) {
  // 16px gutters below 700px, 24px from 700-1100px, 32px above 1100px
  // — the same three-tier gutter scale on every page, in both modes.
  const gutters = "px-4 min-[701px]:px-6 min-[1101px]:px-8";

  return (
    <div className="flex h-screen flex-col bg-vikalp-bg">
      <Header activePage={activePage} onNavigate={onNavigate} />
      {mode === "fill" ? (
        // overflow-y-auto (not -hidden) is a safety net, not the normal
        // path: on desktop this bounded box fits its content exactly
        // (the map's own flex-1 min-h-0 chain sizes to it, no
        // scrollbar). It only engages if a narrow/stacked responsive
        // layout makes the stacked content taller than the viewport —
        // without it that content would be silently clipped instead of
        // reachable by scrolling.
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={`flex h-full min-h-full flex-col pt-6 pb-8 ${gutters}`}>{children}</div>
        </div>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className={`pt-6 pb-8 ${gutters}`}>{children}</div>
        </main>
      )}
    </div>
  );
}
