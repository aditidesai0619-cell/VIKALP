import type { ReactNode } from "react";

// Full-screen composition pass — these 5 cards used to each be their
// own independently-bordered, independently-shadowed box with a gap
// between them: exactly the "floating cards" pattern this task exists
// to remove. `bare` renders the same icon+title+content structure
// without its own border/rounded/background, so AppShell can group
// all 5 inside ONE outer workspace panel (divide-y between sections)
// instead of 5 disconnected objects. Non-bare usage is unchanged for
// any other caller.
export function OverviewCard({
  icon,
  title,
  children,
  onClick,
  bare = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  onClick?: () => void;
  bare?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-vikalp-navy" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-[17px] font-semibold text-vikalp-text">{title}</h3>
      </div>
      {children}
    </>
  );

  const className = bare
    ? "flex flex-col gap-3 px-5 py-4"
    : "flex flex-col gap-3 rounded-vikalp-card border border-vikalp-border bg-vikalp-card p-5";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${className} text-left transition-colors hover:bg-vikalp-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vikalp-warning ${bare ? "" : "hover:border-vikalp-warning"}`}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
