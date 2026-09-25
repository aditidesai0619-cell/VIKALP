"""Destination Explorer — structural framework only, no candidate data.

No approved candidate-destination dataset exists anywhere in VIKALP.
This module defines the suitability-dimension framework (evaluation
categories a future dataset would be scored against) and always returns
an empty candidate list with an honest "pending" status — it never
fabricates a destination, a coordinate, a capacity figure, or a score.

No dimension weights are defined here. None are approved in project
documentation, and since no candidate is ever scored in this module,
none are needed yet — assigning them now would be inventing policy
config with no scoring logic to apply it to. If/when real ranking logic
is approved, weights become a separate decision at that time.
"""

from ..models.settlement import Settlement

# Suitability evaluation dimensions — categories a future ranking would
# assess candidates against, not a claim that any candidate/dataset
# exists or that these dimensions are weighted/scored today.
SUITABILITY_DIMENSIONS: list[dict] = [
    {
        "dimension": "Hazard Safety",
        "definition": (
            "Whether the candidate site itself is free of the hazards "
            "driving relocation from the origin settlement."
        ),
        "status": "not_evaluated",
    },
    {
        "dimension": "Land Suitability",
        "definition": (
            "Physical suitability of the land for habitation (terrain, "
            "soil, drainage, buildability)."
        ),
        "status": "not_evaluated",
    },
    {
        "dimension": "Available Capacity",
        "definition": (
            "How much of the candidate site's land/infrastructure "
            "capacity is unused and could accommodate a relocated "
            "population."
        ),
        "status": "not_evaluated",
    },
    {
        "dimension": "Accessibility",
        "definition": (
            "Road and transport access to and within the candidate site."
        ),
        "status": "not_evaluated",
    },
    {
        "dimension": "Infrastructure Availability",
        "definition": (
            "Presence of water, power, health, and education "
            "infrastructure at or near the candidate site."
        ),
        "status": "not_evaluated",
    },
    {
        "dimension": "Social/Administrative Feasibility",
        "definition": (
            "Land ownership, administrative jurisdiction, and social/"
            "community acceptance considerations."
        ),
        "status": "not_evaluated",
    },
]

_EXPLANATION = (
    "Destination analysis pending. No approved destination candidates "
    "are currently available."
)


def get_settlement_destinations(settlement: Settlement) -> dict:
    return {
        "settlement_id": settlement.id,
        "settlement_name": settlement.name,
        "settlement_district": settlement.district,
        "settlement_state": settlement.state,
        "analysis_status": "pending",
        "candidates": [],
        "ranking_status": "pending",
        "ranked_candidates": [],
        "suitability_dimensions": SUITABILITY_DIMENSIONS,
        "missing_evidence": [
            "No approved candidate destination dataset exists yet for "
            "this settlement.",
            "Destination suitability and carrying-capacity analysis "
            "will be performed when approved destination data is "
            "available.",
        ],
        "explanation": _EXPLANATION,
        "officer_review_required": True,
        "officer_review_note": "Officer review required.",
    }
