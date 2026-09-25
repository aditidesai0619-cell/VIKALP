import { NavTabs } from "../navigation/NavTabs";
import { recordLogout } from "../../services/audit";
import { clearSession, getUser } from "../../services/session";
import type { PageId } from "../../types/navigation";

export function Header({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const user = getUser();

  const handleLogout = () => {
    // Best-effort audit record while the token is still present —
    // fire-and-forget, never blocks the actual logout below.
    void recordLogout();
    clearSession();
    onNavigate("login");
  };

  return (
    <header className="flex min-h-15 flex-wrap items-center justify-between gap-y-2 border-b border-vikalp-border bg-vikalp-card px-4 py-2 min-[701px]:min-h-16 min-[701px]:px-8">
      <button
        type="button"
        onClick={() => onNavigate("overview")}
        className="flex items-center gap-2.5"
      >
        {/* Official VIKALP mark — a symbol only (no wordmark baked in),
            so it sits beside the "VIKALP" text rather than replacing
            it. Square source asset (1254x1254, brand/LOGO (2).jpeg),
            aspect ratio preserved via aspect-square + object-contain. */}
        <img
          src="/vikalp-logo.jpeg"
          alt="VIKALP"
          className="aspect-square h-9 w-9 shrink-0 rounded-md border border-vikalp-border object-contain"
        />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[21px] font-bold tracking-wide text-vikalp-navy">VIKALP</span>
          <span className="text-xs text-vikalp-text-secondary">
            Safer Habitations. Stronger Tomorrow.
          </span>
        </span>
      </button>

      {/* Desktop nav collapses below 700px (brief's mobile breakpoint)
          rather than squashing into an unreadable wrapped mess — no
          replacement hamburger menu exists yet, so navigation on that
          size stays reachable via the VIKALP logo (returns to
          Overview) until one is built. */}
      <div className="max-[700px]:hidden">
        <NavTabs activePage={activePage} onNavigate={onNavigate} />
      </div>

      {/* One grouped user chip — Team Vikalp/SIH + username/logout used
          to be two separately-bordered blocks; now a single tidy
          cluster. */}
      <div className="flex items-center gap-3 rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-1.5">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-vikalp-text">Team Vikalp</span>
          <span className="text-xs text-vikalp-text-secondary">SIH 26191</span>
        </div>
        {user && (
          <>
            <span className="h-7 w-px bg-vikalp-border" aria-hidden="true" />
            <span className="text-xs text-vikalp-text-secondary">{user.username}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-vikalp-border px-2.5 py-1.5 text-xs font-medium text-vikalp-text-secondary transition-colors hover:bg-vikalp-card hover:text-vikalp-navy"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
