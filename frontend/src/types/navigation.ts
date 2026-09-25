export type PageId =
  | "login"
  | "overview"
  | "map-intelligence"
  | "risk-analysis"
  | "decision-workspace"
  | "destination-explorer"
  | "relocation-planner"
  | "reports"
  | "data-governance"
  | "copilot"
  | "terrain-3d";

export interface NavItem {
  id: PageId;
  label: string;
}
