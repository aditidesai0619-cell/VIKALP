"""Navigation label regression test (Task 33 Part I; relabeled Task 45.6).

No frontend test framework (Jest/Vitest/Playwright/etc.) is installed
anywhere in `frontend/package.json`, and Task 33 explicitly forbids
introducing one just for this. Per Task 33 §3.I's own fallback
instruction ("If frontend testing would require adding a new
framework/dependency, skip this test and document that decision"),
this is implemented as a plain source-text check instead: it reads the
relevant `.ts`/`.tsx` files as text and asserts the expected label
strings are present/absent. This is deliberately not a real component
render/behavior test — it protects against a stale label reappearing,
nothing more, using only the Python standard library (no Node, no new
dependency of any kind).

Task 45.6 (global UI foundation) intentionally replaced Task 32's
function-literal labels ("Map Intelligence", "Risk Analysis", etc.)
with the officer-workflow terms ("Settlement", "Risk", etc.) and — a
genuine, deliberate reversal of Task 32's own choice — made "Overview"
a `primaryNavItems` tab in its own right instead of being reachable
only via the header logo (the logo's `onNavigate("overview")` click
still works too; both are true at once, not a contradiction). This
test was updated alongside that change, in the same commit, to assert
the *new* intentional state — a stale-label regression test is only
useful when it tracks which state is currently correct.
"""

import unittest
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_NAVIGATION_TS = _REPO_ROOT / "frontend" / "src" / "data" / "navigation.ts"
_HEADER_TSX = _REPO_ROOT / "frontend" / "src" / "components" / "layout" / "Header.tsx"

_CURRENT_REQUIRED_LABELS = [
    "Overview",
    "Settlement",
    "Evidence",
    "Risk",
    "Decision",
    "Destination & Relocation",
    "Reports",
]

# Everything Task 45.6 explicitly retired as a *primary nav* concept —
# some of these (e.g. "Map Intelligence", "Evidence Locker") remain
# real, working pages, just no longer their own top-level tab; others
# (e.g. "Scenario Lab") never existed and must never reappear either.
_STALE_LABELS = [
    "Scenario Lab",
    "Capacity Intelligence",
    "Intelligence Map",
    "Map Intelligence",
    "Risk Analysis",
    "Decision Workspace",
    "Destination Explorer",
    "Relocation Planner",
    "Evidence Locker",
    "AI Copilot",
]


class TestNavigationLabelsMatchActualFunctionality(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.navigation_source = _NAVIGATION_TS.read_text(encoding="utf-8")
        cls.header_source = _HEADER_TSX.read_text(encoding="utf-8")

    def test_navigation_file_exists_and_is_readable(self):
        self.assertTrue(_NAVIGATION_TS.is_file())

    def test_current_correct_labels_are_present(self):
        for label in _CURRENT_REQUIRED_LABELS:
            self.assertIn(
                f'label: "{label}"',
                self.navigation_source,
                f"Expected nav label {label!r} not found in navigation.ts",
            )

    def test_stale_labels_are_absent_from_navigation(self):
        # Checked as a quoted `label: "..."` assignment, not a bare
        # substring — navigation.ts deliberately leaves explanatory
        # code comments naming old/retired labels (e.g. this exact
        # docstring), and a bare substring search would false-positive
        # on those comments. What must genuinely never reappear is a
        # nav item actually using the stale label as its value.
        for stale in _STALE_LABELS:
            self.assertNotIn(
                f'label: "{stale}"',
                self.navigation_source,
                f"Stale label {stale!r} reappeared as an actual nav item "
                "label in navigation.ts",
            )

    def test_overview_is_a_primary_nav_tab(self):
        # Task 45.6 deliberately reversed Task 32's choice here —
        # Overview now gets its own primaryNavItems tab, not just the
        # header-logo affordance (see this file's own docstring).
        self.assertIn('{ id: "overview", label: "Overview" }', self.navigation_source)

    def test_overview_is_also_reachable_via_the_header_logo(self):
        # Still true and still intentional — the logo click is a
        # redundant, harmless convenience alongside the explicit tab,
        # not replaced by it.
        self.assertIn('onNavigate("overview")', self.header_source)


if __name__ == "__main__":
    unittest.main()
