"""Deterministic risk assessment scoring.

Approved model (Task 07B, per docs/DECISIONS.md Task 07A proposal): five
weighted dimensions, 0-100 overall score, Low/Moderate/High/Critical bands.

IMPORTANT — the weights and thresholds below are PROTOTYPE POLICY
CONFIGURATION for this SIH 2026 demo. They are NOT official government
standards and must never be presented as such.

As of Task 23, one dimension — Hazard Exposure — has an approved,
implemented scoring rule (the GSI landslide-inventory proximity/activity/
density rule designed in Task 21, sensitivity-tested in Task 22; see
`hazard_exposure.py`). Every other dimension still has no approved rule
for converting its raw inputs into a score (see docs/DECISIONS.md Task
07A §3's caveat), so their `score` stays `None`. Hazard Exposure itself
can also produce `score = None` (statuses "no_evidence_found" etc.) when
its own evidence gate is not satisfied — this is never a fabricated
number substituted in its place. The overall assessment still requires
every dimension to be scored before producing an overall_score/risk_level
(see `assess_settlement_risk` below) — a single implemented dimension
does not let a partial overall score leak out.
"""

from dataclasses import dataclass

from ..models.settlement import Settlement
from .hazard_exposure import score_hazard_exposure_landslide

# PROTOTYPE POLICY CONFIGURATION — approved Task 07B. Not an official
# government standard. Weights sum to 1.0.
DIMENSION_WEIGHTS: dict[str, float] = {
    "Terrain / Physical Susceptibility": 0.20,
    "Hazard Exposure": 0.30,
    "Historical Disaster Evidence": 0.15,
    "Population / Household Exposure": 0.20,
    "Vulnerability": 0.15,
}

# PROTOTYPE POLICY CONFIGURATION — approved Task 07B. Not an official
# government standard. Inclusive upper bounds, 0-100 range.
RISK_BANDS: list[tuple[int, str]] = [
    (24, "Low"),
    (49, "Moderate"),
    (74, "High"),
    (100, "Critical"),
]

_RULE_REFERENCE_NOTE = (
    "No approved scoring rule exists yet for this dimension — "
    "see docs/DECISIONS.md Task 07A proposal."
)


@dataclass(frozen=True)
class _DimensionSpec:
    name: str
    weight: float
    # required_input -> (value_getter, source_label). Only inputs the
    # backend actually has today are listed with a getter; every other
    # conceptually-required input for this dimension is listed as a
    # bare name with no getter, meaning it is genuinely unavailable.
    available_inputs: dict[str, float]
    missing_inputs: list[str]


def _dimension_specs(settlement: Settlement) -> list[_DimensionSpec]:
    return [
        _DimensionSpec(
            name="Terrain / Physical Susceptibility",
            weight=DIMENSION_WEIGHTS["Terrain / Physical Susceptibility"],
            available_inputs={
                "slope_degrees": settlement.slope_degrees,
                "elevation_m": settlement.elevation_m,
            },
            missing_inputs=[
                "geology",
                "aspect",
                "dem_derived_susceptibility_index",
            ],
        ),
        _DimensionSpec(
            name="Hazard Exposure",
            weight=DIMENSION_WEIGHTS["Hazard Exposure"],
            available_inputs={},
            missing_inputs=[
                "landslide_susceptibility_class",
                "flood_hazard_class",
                "cloudburst_hazard_class",
                "multi_hazard_overlay",
            ],
        ),
        _DimensionSpec(
            name="Historical Disaster Evidence",
            weight=DIMENSION_WEIGHTS["Historical Disaster Evidence"],
            available_inputs={},
            missing_inputs=[
                "past_incident_count",
                "past_incident_severity",
                "most_recent_incident_recency",
            ],
        ),
        _DimensionSpec(
            name="Population / Household Exposure",
            weight=DIMENSION_WEIGHTS["Population / Household Exposure"],
            available_inputs={
                "population": float(settlement.population),
                "households": float(settlement.households),
            },
            missing_inputs=["vulnerable_subgroup_counts"],
        ),
        _DimensionSpec(
            name="Vulnerability",
            weight=DIMENSION_WEIGHTS["Vulnerability"],
            available_inputs={},
            missing_inputs=[
                "housing_construction_type",
                "distance_to_hospital",
                "distance_to_road",
                "economic_vulnerability_index",
            ],
        ),
    ]


def _score_dimension(
    spec: _DimensionSpec, settlement_source: str
) -> dict:
    # No approved scoring rule yet for this dimension (see module
    # docstring), so score is always None — this function never
    # fabricates one, never substitutes 0/50, and never infers a score
    # from raw values alone.
    status = "no_scoring_rule" if spec.available_inputs else "no_data"

    return {
        "dimension": spec.name,
        "weight": spec.weight,
        "status": status,
        "score": None,
        "inputs_used": sorted(spec.available_inputs.keys()),
        "missing_inputs": spec.missing_inputs,
        "evidence": [
            {"input": key, "value": value, "source": settlement_source}
            for key, value in sorted(spec.available_inputs.items())
        ],
        "rule_reference": _RULE_REFERENCE_NOTE,
        "hazard_exposure_detail": None,
    }


_HAZARD_EXPOSURE_RULE_REFERENCE = (
    "GSI landslide-inventory proximity/activity/density rule — designed "
    "Task 21, sensitivity-tested Task 22, implemented Task 23. See "
    "docs/DECISIONS.md. Covers landslide-inventory evidence only; "
    "flood/cloudburst/multi-hazard evidence remains unavailable."
)


def _score_hazard_exposure_dimension(
    spec: _DimensionSpec, settlement: Settlement, settlement_source: str
) -> dict:
    result = score_hazard_exposure_landslide(settlement.latitude, settlement.longitude)

    if result["status"] == "scored":
        available_inputs = {
            "landslide_inventory_nearest_distance_km": result[
                "nearest_qualifying_distance_km"
            ],
            "landslide_inventory_qualifying_count": float(
                result["qualifying_record_count"]
            ),
        }
    else:
        # Evidence gate not satisfied (or source unavailable) — never a
        # fabricated "input used" and never a numeric score (Task 21
        # §11 / Task 23 evidence-gate requirement).
        available_inputs = {}

    return {
        "dimension": spec.name,
        "weight": spec.weight,
        "status": result["status"],
        "score": result["score"],
        "inputs_used": sorted(available_inputs.keys()),
        "missing_inputs": spec.missing_inputs,
        "evidence": [
            {"input": key, "value": value, "source": settlement_source}
            for key, value in sorted(available_inputs.items())
        ],
        "rule_reference": _HAZARD_EXPOSURE_RULE_REFERENCE,
        "hazard_exposure_detail": result,
    }


def classify_risk_level(score: float) -> str:
    for upper_bound, label in RISK_BANDS:
        if score <= upper_bound:
            return label
    return RISK_BANDS[-1][1]


def assess_settlement_risk(settlement: Settlement) -> dict:
    settlement_source = f"GET /api/settlements/{settlement.id}"
    dimensions = [
        _score_hazard_exposure_dimension(spec, settlement, settlement_source)
        if spec.name == "Hazard Exposure"
        else _score_dimension(spec, settlement_source)
        for spec in _dimension_specs(settlement)
    ]

    dimensions_with_evidence = sum(1 for d in dimensions if d["inputs_used"])
    all_scored = all(d["score"] is not None for d in dimensions)

    if dimensions_with_evidence == 0:
        data_completeness = "none"
    elif all_scored:
        data_completeness = "complete"
    else:
        data_completeness = "partial"

    if all_scored:
        # Deterministic weighted sum — only reached once every dimension
        # has an approved score. Weights are fixed policy config that
        # already sum to 1.0, so no renormalization is needed or applied.
        overall_score = round(
            sum(d["score"] * d["weight"] for d in dimensions), 2
        )
        risk_level = classify_risk_level(overall_score)
        assessment_status = "complete"
    else:
        overall_score = None
        risk_level = None
        assessment_status = "pending"

    return {
        "settlement_id": settlement.id,
        "settlement_name": settlement.name,
        "assessment_status": assessment_status,
        "overall_score": overall_score,
        "risk_level": risk_level,
        "score_range": [0, 100],
        "data_completeness": data_completeness,
        "dimensions": dimensions,
        "methodology_note": (
            "Deterministic weighted scoring across five dimensions. "
            "An overall score is only produced once every dimension has "
            "an approved rule and sufficient evidence — partial data is "
            "never averaged or substituted."
        ),
        "policy_disclaimer": (
            "Dimension weights and risk-band thresholds are prototype "
            "policy configuration for this SIH 2026 demo. They are NOT "
            "official government standards."
        ),
        "officer_review_required": True,
        "officer_review_note": "Officer review required.",
    }
