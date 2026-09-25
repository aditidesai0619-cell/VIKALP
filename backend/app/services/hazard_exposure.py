"""Hazard Exposure — GSI landslide-inventory proximity scoring.

Implements ONLY the landslide-inventory-evidence portion of the Hazard
Exposure dimension (Task 23), per the methodology designed in Task 21
and sensitivity-tested in Task 22 — see docs/DECISIONS.md for both.
Every numeric constant below is taken verbatim from docs/DECISIONS.md
Task 21 §5/§6/§7 (the same values re-validated, not changed, by Task
22). None are invented here.

flood_hazard_class, cloudburst_hazard_class, multi_hazard_overlay, and
the raster-based landslide_susceptibility_class remain entirely
unavailable and are NOT part of this module — see risk.py's
missing_inputs list for Hazard Exposure, which is left unchanged.

Reads the immutable raw GSI/NLFC inventory
(data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson,
Task 20) directly; never writes to it.
"""

import json
import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ..config import settings

# ---------------------------------------------------------------------------
# PROTOTYPE POLICY CONFIGURATION — approved Task 21 (docs/DECISIONS.md
# "Task 21 — Hazard Exposure scoring design", §5/§6/§7), sensitivity-tested
# Task 22, approved for MVP implementation Task 23. NOT an official
# government standard — see POLICY_DISCLAIMER below.
# ---------------------------------------------------------------------------

# Task 21 §5: "Recommended scoring radius: 1 km".
SCORING_RADIUS_KM = 1.0

# Task 19-21's contextual, non-scoring radius (records 1-5 km away are
# "explicitly treated as non-scoring context, not a lower-weight band" —
# Task 21 §5).
CONTEXT_RADIUS_KM = 5.0

# Task 21 §5 band definitions (score endpoints), linear interpolation
# within each band:
#   0-200 m:   base score 80 (at 200m) .. 100 (at 0m)
#   200-600 m: base score 50 (at 600m) .. 79 (at 200m)
#   600 m-1km: base score 20 (at 1km)  .. 49 (at 600m)
# Boundary convention (implementation detail, not a policy value): each
# band is [near, far) except the last, which is [near, far] since far
# (1km) is also the scoring-radius gate itself.
_PROXIMITY_BANDS: tuple[tuple[float, float, float, float, str], ...] = (
    (0.0, 0.2, 100.0, 80.0, "0-200m"),
    (0.2, 0.6, 79.0, 50.0, "200-600m"),
    (0.6, 1.0, 49.0, 20.0, "600m-1km"),
)

# Task 21 §7: bounded multiplicative activity modifier on the nearest
# qualifying record only.
_ACTIVITY_MODIFIERS: dict[str, float] = {
    "Active": 1.1,
    "Reactivated": 1.1,
    "Suspended": 0.85,
    "Dormant": 0.85,
    "Stabilized": 0.85,
    "Abandoned": 0.85,
}
# Task 21 §12: unpopulated/unrecognized activity -> neutral, never fabricated.
_ACTIVITY_MODIFIER_DEFAULT = 1.0

# Task 21 §6: "+5 (of 100) if the count within the 1 km scoring radius is
# >= 5", applied only after the evidence gate has passed.
DENSITY_BONUS_THRESHOLD = 5
DENSITY_BONUS_VALUE = 5.0

INVENTORY_BIAS_DISCLAIMER = (
    "Absence of a GSI inventory record within the scoring radius means no "
    "landslide event has been documented and mapped there in this "
    "dataset. It does NOT mean this location is safe from landslide "
    "hazard (docs/DECISIONS.md Task 21 §11)."
)

POLICY_DISCLAIMER = (
    "Scoring radius, proximity bands, activity modifier, and density "
    "bonus are VIKALP prototype policy configuration (docs/DECISIONS.md "
    "Task 21/22/23) — NOT an official government risk standard."
)

_LIMITATIONS = [
    "Covers only the GSI/NLFC landslide-inventory sub-evidence within "
    "Hazard Exposure; flood, cloudburst, and multi-hazard-overlay "
    "evidence remain entirely unavailable and are not reflected here.",
    "The inventory is a record of documented/mapped events, not a "
    "complete census of every slope that has failed or could fail — see "
    "the inventory-bias disclaimer.",
    "Distances use a spherical great-circle (haversine) calculation, "
    "consistent with the figures already published in Tasks 19-22 — an "
    "approximation of true WGS84 ellipsoidal distance, accurate to well "
    "under 1% at these ranges.",
    "This implementation does not distinguish a settlement genuinely "
    "outside the acquired inventory's geographic coverage (Pauri "
    "Garhwal district) from one inside it with zero nearby records — "
    "both currently report \"no_evidence_found\". A distinct "
    "\"not_covered\" status (Task 21 §12) is not implemented in this "
    "MVP.",
    "Every threshold/band/multiplier above is a VIKALP prototype policy "
    "configuration, not a validated or official standard.",
]

_SOURCE_DATASET_LABEL = (
    "GSI/NLFC field-validated landslide inventory, Pauri Garhwal district "
    "(Task 20 acquisition, see docs/DATA_PROVENANCE.md)"
)

# Haversine (spherical great-circle) — same radius used throughout this
# project's prior landslide-distance work (Tasks 19-22), for figures that
# stay reproducible/consistent with what's already documented.
_EARTH_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class LandslideRecord:
    slide_no: str | None
    latitude: float
    longitude: float
    activity: str | None
    triggering: str | None
    toposheet: str | None


def _blank_to_none(value: object) -> object | None:
    if value is None:
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


@lru_cache(maxsize=1)
def _load_records() -> tuple[LandslideRecord, ...]:
    path = Path(settings.gsi_landslides_geojson_path)
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if data.get("type") != "FeatureCollection" or "features" not in data:
        raise ValueError(
            f"GSI landslide dataset at {path} is not a valid GeoJSON "
            "FeatureCollection."
        )

    records = []
    for feature in data["features"]:
        geometry = feature.get("geometry")
        if not geometry or geometry.get("type") != "Point":
            continue
        coordinates = geometry.get("coordinates")
        if not coordinates or len(coordinates) < 2:
            continue
        lon, lat = coordinates[0], coordinates[1]
        props = feature.get("properties", {})
        records.append(
            LandslideRecord(
                slide_no=_blank_to_none(props.get("slide_no")),
                latitude=lat,
                longitude=lon,
                activity=_blank_to_none(props.get("activity")),
                triggering=_blank_to_none(props.get("triggering")),
                toposheet=_blank_to_none(props.get("toposheet")),
            )
        )

    if not records:
        raise ValueError(f"GSI landslide dataset at {path} contains no valid point records.")

    return tuple(records)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1r, lon1r, lat2r, lon2r = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2r - lat1r
    dlon = lon2r - lon1r
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1r) * math.cos(lat2r) * math.sin(dlon / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def _proximity_base_score(distance_km: float) -> float | None:
    for near, far, score_near, score_far, _label in _PROXIMITY_BANDS:
        in_band = near <= distance_km < far or (
            far == SCORING_RADIUS_KM and distance_km == far
        )
        if in_band:
            span = far - near
            frac = (distance_km - near) / span if span > 0 else 0.0
            return score_near + (score_far - score_near) * frac
    return None


def _proximity_band_label(distance_km: float) -> str | None:
    for near, far, _score_near, _score_far, label in _PROXIMITY_BANDS:
        in_band = near <= distance_km < far or (
            far == SCORING_RADIUS_KM and distance_km == far
        )
        if in_band:
            return label
    return None


def _activity_modifier(activity: str | None) -> tuple[float, str]:
    if activity is None:
        return _ACTIVITY_MODIFIER_DEFAULT, "unpopulated"
    modifier = _ACTIVITY_MODIFIERS.get(activity)
    if modifier is None:
        # Not one of the values seen/audited in Task 21/22 — never guess a
        # modifier for an unrecognized value; fall back to neutral.
        return _ACTIVITY_MODIFIER_DEFAULT, f"unrecognized value ({activity!r}), neutral fallback"
    return modifier, activity


def _pending_result(
    reason: str,
    detail: str,
    contextual_records: list[dict] | None = None,
    source_feature_count: int | None = None,
) -> dict:
    contextual_records = contextual_records or []
    return {
        "status": reason,
        "reason": reason,
        "reason_detail": detail,
        "score": None,
        "scoring_radius_km": SCORING_RADIUS_KM,
        "context_radius_km": CONTEXT_RADIUS_KM,
        "qualifying_record_count": 0,
        "nearest_qualifying_distance_km": None,
        "nearest_qualifying_slide_no": None,
        "proximity_band": None,
        "proximity_base_score": None,
        "activity_value_used": None,
        "activity_modifier_applied": None,
        "density_bonus_applied": False,
        "density_bonus_value": 0.0,
        "contextual_record_count": len(contextual_records),
        "nearest_contextual_distance_km": (
            contextual_records[0]["distance_km"] if contextual_records else None
        ),
        "contextual_records": contextual_records,
        "source_dataset": _SOURCE_DATASET_LABEL,
        "source_feature_count": source_feature_count,
        "inventory_bias_disclaimer": INVENTORY_BIAS_DISCLAIMER,
        "policy_disclaimer": POLICY_DISCLAIMER,
        "limitations": _LIMITATIONS,
    }


def score_hazard_exposure_landslide(
    settlement_lat: float | None, settlement_lon: float | None
) -> dict:
    """Score the landslide-inventory sub-evidence for one settlement point.

    Never fabricates a value: returns a "no_evidence_found" (or other
    pending-reason) result with score=None whenever the evidence gate is
    not satisfied, rather than a numeric 0 (Task 21 §11 / Task 23
    "MISSING DATA / EVIDENCE GATE").
    """
    if settlement_lat is None or settlement_lon is None:
        return _pending_result(
            "settlement_geometry_unavailable",
            "Settlement latitude/longitude is not available.",
        )

    try:
        records = _load_records()
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return _pending_result(
            "source_data_unavailable",
            f"GSI landslide inventory could not be loaded: {exc}",
        )

    qualifying: list[tuple[float, LandslideRecord]] = []
    contextual: list[tuple[float, LandslideRecord]] = []
    for record in records:
        distance_km = _haversine_km(
            settlement_lat, settlement_lon, record.latitude, record.longitude
        )
        if distance_km <= SCORING_RADIUS_KM:
            qualifying.append((distance_km, record))
        elif distance_km <= CONTEXT_RADIUS_KM:
            contextual.append((distance_km, record))

    contextual.sort(key=lambda pair: pair[0])
    contextual_records_out = [
        {
            "slide_no": record.slide_no,
            "distance_km": round(distance_km, 3),
            "activity": record.activity,
            "triggering": record.triggering,
            "toposheet": record.toposheet,
        }
        for distance_km, record in contextual
    ]

    if not qualifying:
        return _pending_result(
            "no_evidence_found",
            f"0 GSI landslide records within the {SCORING_RADIUS_KM:.0f} km "
            "scoring radius.",
            contextual_records=contextual_records_out,
            source_feature_count=len(records),
        )

    qualifying.sort(key=lambda pair: pair[0])
    nearest_distance_km, nearest_record = qualifying[0]
    qualifying_count = len(qualifying)

    base_score = _proximity_base_score(nearest_distance_km)
    band_label = _proximity_band_label(nearest_distance_km)
    activity_modifier, activity_value_used = _activity_modifier(nearest_record.activity)

    density_bonus_applied = qualifying_count >= DENSITY_BONUS_THRESHOLD
    density_bonus = DENSITY_BONUS_VALUE if density_bonus_applied else 0.0

    raw_score = base_score * activity_modifier + density_bonus
    final_score = max(0.0, min(100.0, raw_score))

    return {
        "status": "scored",
        "reason": None,
        "reason_detail": None,
        "score": round(final_score, 2),
        "scoring_radius_km": SCORING_RADIUS_KM,
        "context_radius_km": CONTEXT_RADIUS_KM,
        "qualifying_record_count": qualifying_count,
        "nearest_qualifying_distance_km": round(nearest_distance_km, 3),
        "nearest_qualifying_slide_no": nearest_record.slide_no,
        "proximity_band": band_label,
        "proximity_base_score": round(base_score, 2) if base_score is not None else None,
        "activity_value_used": activity_value_used,
        "activity_modifier_applied": activity_modifier,
        "density_bonus_applied": density_bonus_applied,
        "density_bonus_value": density_bonus,
        "contextual_record_count": len(contextual_records_out),
        "nearest_contextual_distance_km": (
            contextual_records_out[0]["distance_km"] if contextual_records_out else None
        ),
        "contextual_records": contextual_records_out,
        "source_dataset": _SOURCE_DATASET_LABEL,
        "source_feature_count": len(records),
        "inventory_bias_disclaimer": INVENTORY_BIAS_DISCLAIMER,
        "policy_disclaimer": POLICY_DISCLAIMER,
        "limitations": _LIMITATIONS,
    }
