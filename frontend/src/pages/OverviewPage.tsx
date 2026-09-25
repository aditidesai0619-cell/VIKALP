import { AppShell } from "../components/layout/AppShell";
import type { PageId } from "../types/navigation";

export function OverviewPage({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return <AppShell activePage={activePage} onNavigate={onNavigate} />;
}
