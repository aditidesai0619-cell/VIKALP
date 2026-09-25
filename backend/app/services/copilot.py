"""Copilot evidence-explanation foundation (Task 37).

This module builds the TRUSTED EVIDENCE LAYER a future AI Copilot would
read from. It calls NO external LLM/model API, performs NO RAG,
embeddings, or vector search, and computes NO new risk/hazard/decision/
destination result of its own — every value it exposes already comes
from risk.py, decision.py, destination.py (which in turn reuses
hazard_exposure.py's own result). This module only assembles and
explains those existing results.

Architecture (docs/DECISIONS.md "Task 37"):

    verified evidence -> deterministic VIKALP rules -> VIKALP output
        -> (this module: assembly + deterministic explanation)
        -> officer review -> audit trail

A future AI layer sits ABOVE this module, never below it: it may read
a CopilotContext and produce natural-language text from it, but it
cannot change any value in that context, and it is never the source of
the numbers/statuses the officer sees. See COPILOT_RULES below — these
are enforced by this module's own design, not merely documented.
"""

from __future__ import annotations

from ..models.settlement import Settlement
from .decision import assess_settlement_decision
from .destination import get_settlement_destinations
from .risk import assess_settlement_risk

# Same disclosure text used by SettlementGeoJSONProperties (schemas/settlement.py).
_DEMO_PLANNING_INPUT_NOTE = "Demo planning input — source validation pending"

# Provenance (Task 37 §G) — only sources actually used elsewhere in VIKALP
# today (see hazard_exposure.py's _SOURCE_DATASET_LABEL and report.py's
# citation block). Nothing invented; OSM is not currently used by VIKALP
# and is deliberately not listed here.
_OFFICIAL_SOURCES = [
    "GSI/NLFC field-validated landslide inventory, Pauri Garhwal district "
    "(Task 20 acquisition, see docs/DATA_PROVENANCE.md)",
    "ISRO/NRSC Bhuvan CartoDEM v3 R1 terrain data (elevation/slope evidence)",
    "geoBoundaries India ADM2 administrative boundary data (district/state "
    "boundaries), publisher: geoBoundaries (William & Mary geoLab)",
]
_DERIVED_CALCULATIONS = [
    "VIKALP risk assessment scoring (deterministic, rule-based — see "
    "docs/DECISIONS.md)",
    "VIKALP Hazard Exposure proximity/activity/density scoring "
    "(deterministic, rule-based — Task 21/22/23)",
]
_DEMO_PLANNING_INPUTS = [
    f"Settlement population, households, and location fields "
    f"({_DEMO_PLANNING_INPUT_NOTE})",
]

# Same static, already-documented fact used by report.py (Task 34) —
# not recalculated here, not exposed by any risk/decision/destination
# service call. See docs/DECISIONS.md Task 15/27.
_CARTODEM_DERIVED_SLOPE_DEGREES = 22.58

_POLICY_DISCLAIMER = (
    "This context reproduces evidence and results already produced by "
    "VIKALP's deterministic services. It is not a new analysis, not an "
    "AI-generated conclusion, and not an official government "
    "determination. Officer review is required for every decision."
)

# Task 37 §K — explicit, code-level constraints on what a future AI
# layer built on top of this module may and may not do. Enforced by
# this module's own design (it never computes/returns a risk score, a
# hazard record, a destination choice, a capacity number, or a
# relocation approval — those simply do not exist as operations this
# module can perform), not merely documented as a convention.
COPILOT_RULES: tuple[str, ...] = (
    "1. Only supplied VIKALP context may be used.",
    "2. Missing values must remain missing.",
    "3. No evidence must not become evidence of absence.",
    "4. Pending must remain pending.",
    "5. Deterministic outputs cannot be overridden.",
    "6. Copilot cannot calculate authoritative risk.",
    "7. Copilot cannot create hazard evidence.",
    "8. Copilot cannot choose destinations.",
    "9. Copilot cannot calculate authoritative carrying capacity.",
    "10. Copilot cannot approve relocation.",
    "11. Copilot cannot issue government orders.",
    "12. Officer remains final authority.",
)


def _find_hazard_exposure_detail(risk_dimensions: list[dict]) -> dict | None:
    for dimension in risk_dimensions:
        if dimension["dimension"] == "Hazard Exposure":
            return dimension.get("hazard_exposure_detail")
    return None


def _collect_missing_evidence(
    risk_result: dict, decision_result: dict, destination_result: dict
) -> list[str]:
    missing: list[str] = []
    for dimension in risk_result["dimensions"]:
        for item in dimension["missing_inputs"]:
            entry = f"{dimension['dimension']}: {item}"
            if entry not in missing:
                missing.append(entry)
    for item in decision_result["missing_evidence"]:
        if item not in missing:
            missing.append(item)
    for item in destination_result["missing_evidence"]:
        if item not in missing:
            missing.append(item)
    return missing


def _collect_limitations(
    hazard_detail: dict | None,
    risk_result: dict,
    decision_result: dict,
    destination_result: dict,
) -> list[str]:
    limitations: list[str] = []
    if hazard_detail is not None:
        for item in hazard_detail["limitations"]:
            if item not in limitations:
                limitations.append(item)
    if risk_result["assessment_status"] != "complete":
        limitations.append(
            "Overall risk assessment is pending — not every dimension has "
            "a scored result yet."
        )
    if decision_result["decision_status"] == "pending":
        limitations.append(
            "Decision workspace pathways (Protect/Adapt/Relocate) have not "
            "been evaluated."
        )
    if destination_result["analysis_status"] == "pending":
        limitations.append(
            "No destination candidate analysis has been performed for this "
            "settlement yet."
        )
    terrain_dimension = next(
        (
            d
            for d in risk_result["dimensions"]
            if d["dimension"] == "Terrain / Physical Susceptibility"
        ),
        None,
    )
    slope_evidence = (
        next(
            (e for e in terrain_dimension["evidence"] if e["input"] == "slope_degrees"),
            None,
        )
        if terrain_dimension is not None
        else None
    )
    if slope_evidence is not None:
        limitations.append(
            "Terrain slope discrepancy (disclosed, not resolved): the "
            f"settlement record's demo slope value is "
            f"{slope_evidence['value']:.2f}°, while the separately "
            f"processed CartoDEM-derived slope at this location is "
            f"{_CARTODEM_DERIVED_SLOPE_DEGREES:.2f}° (Task 15 raster "
            "analysis; not exposed via any current API). Terrain risk "
            "scoring remains pending until this discrepancy is resolved "
            "through governance review."
        )
    return limitations


def build_copilot_context(settlement: Settlement) -> dict:
    """Assemble the full Copilot context for one settlement.

    Calls only existing VIKALP services (risk/decision/destination,
    which itself already embeds the Hazard Exposure result) and
    reproduces their results verbatim. Computes nothing new and mutates
    nothing.
    """
    risk_result = assess_settlement_risk(settlement)
    decision_result = assess_settlement_decision(settlement)
    destination_result = get_settlement_destinations(settlement)
    hazard_detail = _find_hazard_exposure_detail(risk_result["dimensions"])

    missing_evidence = _collect_missing_evidence(
        risk_result, decision_result, destination_result
    )
    limitations = _collect_limitations(
        hazard_detail, risk_result, decision_result, destination_result
    )

    return {
        "settlement": {
            "settlement_id": settlement.id,
            "name": settlement.name,
            "district": settlement.district,
            "state": settlement.state,
            "population": settlement.population,
            "households": settlement.households,
            "latitude": settlement.latitude,
            "longitude": settlement.longitude,
            "data_note": _DEMO_PLANNING_INPUT_NOTE,
        },
        "risk_assessment": risk_result,
        "risk_dimensions": risk_result["dimensions"],
        "hazard_exposure": hazard_detail,
        "decision_workspace": decision_result,
        "destinations": destination_result,
        "provenance": {
            "official_sources": _OFFICIAL_SOURCES,
            "derived_calculations": _DERIVED_CALCULATIONS,
            "demo_planning_inputs": _DEMO_PLANNING_INPUTS,
            "unavailable_or_missing": missing_evidence,
        },
        "limitations": limitations,
        "missing_evidence": missing_evidence,
        "policy_disclaimer": _POLICY_DISCLAIMER,
    }


def _summarize_risk(risk_result: dict) -> str:
    if risk_result["assessment_status"] == "complete":
        return (
            f"Overall risk assessment is complete: overall score "
            f"{risk_result['overall_score']} ({risk_result['risk_level']})."
        )
    return (
        "Overall risk assessment is pending because the required scoring "
        f"evidence/rules are not yet complete for every dimension (data "
        f"completeness: {risk_result['data_completeness']})."
    )


def _summarize_hazard_exposure(hazard_detail: dict | None) -> str:
    if hazard_detail is None:
        return "Hazard Exposure evidence is not available for this settlement."

    status = hazard_detail["status"]
    if status == "scored":
        return (
            "Hazard Exposure (GSI/NLFC landslide inventory) is scored: "
            f"{hazard_detail['score']} of 100, based on "
            f"{hazard_detail['qualifying_record_count']} qualifying "
            f"record(s) within the {hazard_detail['scoring_radius_km']} km "
            "scoring radius."
        )
    if status == "no_evidence_found":
        sentence = (
            "Hazard Exposure (GSI/NLFC landslide inventory) found no "
            "qualifying record within the "
            f"{hazard_detail['scoring_radius_km']} km scoring radius "
            "(status: no_evidence_found; score: null)."
        )
        if hazard_detail["nearest_contextual_distance_km"] is not None:
            sentence += (
                " The nearest contextual (non-scoring) record is "
                f"{hazard_detail['nearest_contextual_distance_km']} km away, "
                f"with {hazard_detail['contextual_record_count']} contextual "
                f"record(s) found within "
                f"{hazard_detail['context_radius_km']} km."
            )
        sentence += (
            " This does not establish the absence of hazard: "
            + hazard_detail["inventory_bias_disclaimer"]
        )
        return sentence
    if status == "source_data_unavailable":
        return (
            "Hazard Exposure (GSI/NLFC landslide inventory) could not be "
            "evaluated: source data is unavailable for this settlement "
            "(status: source_data_unavailable; score: null)."
        )
    if status == "settlement_geometry_unavailable":
        return (
            "Hazard Exposure (GSI/NLFC landslide inventory) could not be "
            "evaluated: this settlement's location is unavailable (status: "
            "settlement_geometry_unavailable; score: null)."
        )
    return f"Hazard Exposure status: {status}."


def _summarize_decision(decision_result: dict) -> str:
    pathway_summary = ", ".join(
        f"{pathway['pathway']}: {pathway['status']}"
        for pathway in decision_result["pathways"]
    )
    if decision_result["decision_status"] == "pending":
        return (
            "Decision workspace status is pending: no Protect/Adapt/"
            f"Relocate pathway has been evaluated ({pathway_summary})."
        )
    return f"Decision workspace status: {decision_result['decision_status']} ({pathway_summary})."


def _summarize_destinations(destination_result: dict) -> str:
    candidate_count = len(destination_result["candidates"])
    if destination_result["analysis_status"] == "pending" or candidate_count == 0:
        return (
            "Destination analysis status is pending: no candidate "
            "destination data is currently available in VIKALP for this "
            "settlement."
        )
    return (
        f"Destination analysis status: "
        f"{destination_result['analysis_status']}, with {candidate_count} "
        "candidate(s) recorded."
    )


def explain_settlement(context: dict) -> dict:
    """Produce a "VIKALP Evidence Explanation" from an already-built
    CopilotContext dict.

    This is a DETERMINISTIC, RULE-BASED SUMMARY, not an AI-generated
    answer — no model is called here. Every sentence is built directly
    from context values already computed by risk.py/decision.py/
    destination.py/hazard_exposure.py; nothing is inferred, predicted,
    or invented, and "pending"/"no evidence found" statuses are always
    preserved rather than resolved into an affirmative conclusion.
    """
    settlement = context["settlement"]
    risk_result = context["risk_assessment"]
    hazard_detail = context["hazard_exposure"]
    decision_result = context["decision_workspace"]
    destination_result = context["destinations"]

    summary = " ".join(
        [
            f"VIKALP Evidence Explanation for {settlement['name']} "
            f"({settlement['district']}, {settlement['state']}).",
            _summarize_risk(risk_result),
            _summarize_hazard_exposure(hazard_detail),
            _summarize_decision(decision_result),
            _summarize_destinations(destination_result),
        ]
    )

    evidence: list[dict] = [
        {
            "item": "Population",
            "value": settlement["population"],
            "source": settlement["data_note"],
        },
        {
            "item": "Households",
            "value": settlement["households"],
            "source": settlement["data_note"],
        },
    ]
    if hazard_detail is not None:
        evidence.append(
            {
                "item": "Hazard Exposure qualifying record count "
                f"(within {hazard_detail['scoring_radius_km']} km)",
                "value": hazard_detail["qualifying_record_count"],
                "source": hazard_detail["source_dataset"],
            }
        )
        evidence.append(
            {
                "item": "Hazard Exposure contextual record count "
                f"(within {hazard_detail['context_radius_km']} km)",
                "value": hazard_detail["contextual_record_count"],
                "source": hazard_detail["source_dataset"],
            }
        )
        if hazard_detail["nearest_contextual_distance_km"] is not None:
            evidence.append(
                {
                    "item": "Nearest contextual landslide distance (km)",
                    "value": hazard_detail["nearest_contextual_distance_km"],
                    "source": hazard_detail["source_dataset"],
                }
            )

    return {
        "summary": summary,
        "evidence": evidence,
        "missing_evidence": context["missing_evidence"],
        "decision_status": decision_result["decision_status"],
        "limitations": context["limitations"],
        "officer_action": decision_result["officer_review_note"],
    }
