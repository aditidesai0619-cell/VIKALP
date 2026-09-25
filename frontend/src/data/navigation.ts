import type { NavItem } from "../types/navigation";

// Task 45.6 (global UI foundation) — the primary nav now mirrors the
// officer's actual workflow name-for-name: Overview -> Settlement ->
// Evidence -> Risk -> Decision -> Destination & Relocation -> Reports.
// The underlying page-ids (map-intelligence, data-governance, etc.)
// are UNCHANGED on purpose — they're already wired through
// PageRouter/useHashRoute/every onNavigate() call across the app, and
// renaming them would touch far more than "the global foundation."
// Only the LABEL an officer sees, and which concepts get their own
// primary tab, changed:
//   - "map-intelligence" is labeled "Settlement" (its actual content —
//     settlement context, terrain/DEM status, the live map — is a
//     settlement-level workspace, not a generic "map tool").
//   - "data-governance" is labeled "Evidence" (it already was the
//     Evidence Locker; this just matches the workflow's own term).
//   - "destination-explorer" carries the merged "Destination &
//     Relocation" tab; "relocation-planner" no longer gets its own
//     primary tab — it's reached from inside Destination Explorer
//     (its "View Relocation Plan ->" button) exactly as Map
//     Intelligence is already reached from inside other pages.
//   - "copilot" is REMOVED from primary nav — it's contextual (reached
//     from Overview's Ask Copilot card, Evidence Locker's toolbar,
//     etc.), never a workflow step of its own (Task 41/44's own
//     reasoning, now applied consistently).
//   - "overview" gets an explicit tab too (previously reachable only
//     via the VIKALP wordmark) so it visibly leads the workflow.
export const primaryNavItems: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "map-intelligence", label: "Settlement" },
  { id: "data-governance", label: "Evidence" },
  { id: "risk-analysis", label: "Risk" },
  { id: "decision-workspace", label: "Decision" },
  { id: "destination-explorer", label: "Destination & Relocation" },
  { id: "reports", label: "Reports" },
];

export const locationExplorerTree = {
  label: "India",
  children: [
    {
      label: "Uttarakhand",
      children: [
        {
          label: "Pauri Garhwal",
          children: [{ label: "Bhitai Malli" }],
        },
      ],
    },
  ],
};

