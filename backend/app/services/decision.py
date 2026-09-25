"""Protect / Adapt / Relocate decision workspace — structural framework only.

This module defines the three intervention pathways and their evidence
requirements. It does NOT implement pathway evaluation/scoring logic — no
such algorithm is approved yet (Task 08 scope: "create only the minimum
deterministic decision structure required... do not invent pathway
scores... do not invent feasibility values").

A pathway could only ever be evaluated once (a) the settlement's risk
assessment is complete (see services/risk.py — never true today, since no
risk dimension has an approved scoring rule) AND (b) an approved
pathway-evaluation rule exists (not approved for any pathway yet). Until
both are true, every pathway stays "not_evaluated" and the overall
decision stays "pending" — this is the correct behavior today, not a
placeholder bug. This is a decision-support structure, not an autonomous
decision maker: nothing here ever marks a pathway "recommended" without
that gate being met, and every response carries an explicit officer
review requirement.
"""

from ..models.settlement import Settlement
from .risk import assess_settlement_risk

# Pathway framework — definitions and evidence categories only, not a
# scoring model. See module docstring.
PATHWAY_FRAMEWORK: dict[str, dict] = {
    "protect": {
        "name": "Protect",
        "definition": (
            "Actions intended to reduce hazard impact while keeping the "
            "settlement in its existing location."
        ),
        "action_categories": [
            "drainage improvement",
            "slope stabilization",
            "protective infrastructure",
            "local hazard mitigation",
            "monitoring/maintenance",
        ],
        "evidence_required": [
            "completed risk assessment (hazard exposure)",
            "hazard severity and persistence evidence",
            "engineering feasibility of protective measures",
        ],
    },
    "adapt": {
        "name": "Adapt",
        "definition": (
            "Actions intended to reduce vulnerability/exposure through "
            "changes to settlement conditions, infrastructure, "
            "preparedness, or land use while retaining habitation."
        ),
        "action_categories": [
            "infrastructure adaptation",
            "safer building practices",
            "access improvements",
            "land-use controls",
            "preparedness measures",
        ],
        "evidence_required": [
            "completed risk assessment (vulnerability)",
            "infrastructure and access adequacy evidence",
            "preparedness capacity evidence",
        ],
    },
    "relocate": {
        "name": "Relocate",
        "definition": (
            "Moving habitation from an unsafe location to a safer "
            "suitable destination."
        ),
        # Not an "action category" pathway like Protect/Adapt — Relocate's
        # evaluation instead depends entirely on the evidence categories
        # below (destination analysis/capacity are explicitly out of
        # scope for this task).
        "action_categories": [],
        "evidence_required": [
            "severity/persistence of hazard risk",
            "settlement vulnerability",
            "feasibility of protection/adaptation",
            "availability of suitable alternative land",
            "destination suitability",
            "destination carrying capacity",
            "infrastructure/access",
            "social/land considerations",
        ],
    },
}

_DECISION_EXPLANATION = (
    "A pathway cannot be recommended until sufficient hazard, "
    "vulnerability, and supporting evidence is available."
)


def assess_settlement_decision(settlement: Settlement) -> dict:
    risk = assess_settlement_risk(settlement)
    risk_status = risk["assessment_status"]

    missing_evidence: list[str] = []
    if risk_status != "complete":
        missing_evidence.append(
            "Completed risk assessment (hazard exposure, historical "
            "disaster evidence, vulnerability) is required before any "
            "pathway can be evaluated."
        )
    missing_evidence.append(
        "No approved pathway-evaluation rule exists yet for Protect, "
        "Adapt, or Relocate — see docs/DECISIONS.md Task 08."
    )

    pathways = [
        {
            "pathway": spec["name"],
            "definition": spec["definition"],
            "action_categories": spec["action_categories"],
            "evidence_required": spec["evidence_required"],
            "status": "not_evaluated",
            "recommended": False,
        }
        for spec in PATHWAY_FRAMEWORK.values()
    ]

    return {
        "settlement_id": settlement.id,
        "settlement_name": settlement.name,
        "settlement_district": settlement.district,
        "settlement_state": settlement.state,
        "decision_status": "pending",
        "risk_assessment_status": risk_status,
        "pathways": pathways,
        "missing_evidence": missing_evidence,
        "explanation": _DECISION_EXPLANATION,
        "officer_review_required": True,
        "officer_review_note": "Officer review required.",
    }
