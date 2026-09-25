import { useEffect, useState } from "react";
import type { PageId } from "../../types/navigation";

const DEFAULT_PAGE: PageId = "login";
const VALID_PAGES: PageId[] = [
  "login",
  "overview",
  "map-intelligence",
  "risk-analysis",
  "decision-workspace",
  "destination-explorer",
  "relocation-planner",
  "reports",
  "data-governance",
  "copilot",
  "terrain-3d",
];

function readHash(): PageId {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.includes(raw as PageId) ? (raw as PageId) : DEFAULT_PAGE;
}

export function useHashRoute(): [PageId, (page: PageId) => void] {
  const [page, setPage] = useState<PageId>(readHash);

  useEffect(() => {
    const onHashChange = () => setPage(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (next: PageId) => {
    window.location.hash = `/${next}`;
  };

  return [page, navigate];
}
