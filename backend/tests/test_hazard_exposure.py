"""Deterministic tests for the Hazard Exposure landslide-inventory
scoring rule (Task 23 implementation of the Task 21 design / Task 22
sensitivity check — see docs/DECISIONS.md).

Uses the real, immutable acquired GSI dataset
(data/raw/static/hazards/gsi_nlfc_field_validated_landslides_pauri_garhwal.geojson,
813 records) as ground truth throughout — no synthetic/fabricated
landslide records are created anywhere in this file. Where a test needs
a settlement point in a specific proximity band, it constructs a
synthetic *query coordinate* near a real record's own location (clearly
marked as test-construction-only, never a claim about a real
settlement) — the underlying hazard evidence itself is always real.

Run with: python -m unittest discover -s tests   (from backend/)
No new test-framework dependency was added — this uses only the
standard library's unittest, consistent with the project's existing
"don't add a dependency unless required" convention.
"""

import inspect
import unittest
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.models.settlement import Settlement
from app.services import hazard_exposure as hz
from app.services.risk import DIMENSION_WEIGHTS, assess_settlement_risk

BHITAI_MALLI_LAT = 30.167112
BHITAI_MALLI_LON = 78.781266


def _offset_north(lat: float, lon: float, meters: float) -> tuple[float, float]:
    """Construct a synthetic TEST query point ~`meters` due north of
    (lat, lon). Approximate planar conversion (1 deg latitude ~= 111.32
    km) — adequate for placing a test point inside/outside a known
    band; not used anywhere in the production scoring path."""
    delta_lat_deg = (meters / 1000.0) / 111.32
    return lat + delta_lat_deg, lon


@lru_cache(maxsize=1)
def _dataset_geometry_stats():
    """One-time O(n^2) pass over the real 813-record dataset: nearest-
    neighbor distance and density (count within 1km) for every record.
    Cached so every test that needs a well-isolated or a dense-cluster
    anchor point reuses the same single computation."""
    records = hz._load_records()
    n = len(records)
    nn_dist = [None] * n
    density_1km = [0] * n
    for i in range(n):
        best = None
        count = 0
        for j in range(n):
            if i == j:
                continue
            d = hz._haversine_km(
                records[i].latitude,
                records[i].longitude,
                records[j].latitude,
                records[j].longitude,
            )
            if best is None or d < best:
                best = d
            if d <= 1.0:
                count += 1
        nn_dist[i] = best
        density_1km[i] = count
    return records, nn_dist, density_1km


def _find_isolated_record(min_nn_km: float = 2.5):
    """A real record with no other real record within `min_nn_km` —
    used as a safe anchor for band tests so a synthetic offset point
    can't be accidentally confounded by an unrelated nearby record."""
    records, nn_dist, _density = _dataset_geometry_stats()
    for record, distance in zip(records, nn_dist):
        if distance is not None and distance >= min_nn_km:
            return record
    raise AssertionError(f"No record with nearest-neighbor distance >= {min_nn_km}km found.")


def _find_dense_cluster_center(min_neighbors: int = 4):
    """A real record with >= `min_neighbors` other real records within
    1km (so querying at its own coordinates yields qualifying_count
    >= min_neighbors + 1)."""
    records, _nn_dist, density_1km = _dataset_geometry_stats()
    for record, count in zip(records, density_1km):
        if count >= min_neighbors:
            return record
    raise AssertionError(f"No record with >= {min_neighbors} neighbors within 1km found.")


class TestProximityBandMath(unittest.TestCase):
    """Test 8: exact boundary behavior at 200m / 600m / 1km."""

    def test_exact_boundary_scores(self):
        self.assertAlmostEqual(hz._proximity_base_score(0.0), 100.0)
        self.assertAlmostEqual(hz._proximity_base_score(0.2), 79.0)
        self.assertAlmostEqual(hz._proximity_base_score(0.6), 49.0)
        self.assertAlmostEqual(hz._proximity_base_score(1.0), 20.0)
        self.assertIsNone(hz._proximity_base_score(1.0000001))

    def test_band_labels(self):
        self.assertEqual(hz._proximity_band_label(0.05), "0-200m")
        self.assertEqual(hz._proximity_band_label(0.35), "200-600m")
        self.assertEqual(hz._proximity_band_label(0.85), "600m-1km")
        self.assertIsNone(hz._proximity_band_label(1.5))

    def test_no_large_discontinuity_at_band_boundaries(self):
        just_below_200 = hz._proximity_base_score(0.1999)
        just_at_200 = hz._proximity_base_score(0.2)
        self.assertLess(abs(just_below_200 - just_at_200), 2.0)

        just_below_600 = hz._proximity_base_score(0.5999)
        just_at_600 = hz._proximity_base_score(0.6)
        self.assertLess(abs(just_below_600 - just_at_600), 2.0)


class TestActivityModifier(unittest.TestCase):
    def test_active_and_reactivated_get_the_boost(self):
        self.assertEqual(hz._activity_modifier("Active")[0], 1.1)
        self.assertEqual(hz._activity_modifier("Reactivated")[0], 1.1)

    def test_suspended_dormant_stabilized_abandoned_get_the_discount(self):
        for value in ("Suspended", "Dormant", "Stabilized", "Abandoned"):
            self.assertEqual(hz._activity_modifier(value)[0], 0.85)

    def test_missing_activity_is_neutral(self):
        modifier, label = hz._activity_modifier(None)
        self.assertEqual(modifier, 1.0)
        self.assertEqual(label, "unpopulated")

    def test_unrecognized_activity_value_falls_back_neutral_never_guessed(self):
        modifier, _label = hz._activity_modifier("SomeValueNotInTask21Audit")
        self.assertEqual(modifier, 1.0)


class TestBhitaiMalli(unittest.TestCase):
    """Test 1 + 6: 0 records within 1km, 21 within 5km -> Assessment
    Pending, never a numeric score. Uses Bhitai Malli's real pilot
    coordinates and the real acquired dataset."""

    def test_no_evidence_within_1km(self):
        result = hz.score_hazard_exposure_landslide(BHITAI_MALLI_LAT, BHITAI_MALLI_LON)
        self.assertEqual(result["status"], "no_evidence_found")
        self.assertEqual(result["reason"], "no_evidence_found")
        self.assertIsNone(result["score"])
        self.assertEqual(result["qualifying_record_count"], 0)
        # Ground truth established in Task 20/21/22.
        self.assertEqual(result["contextual_record_count"], 21)
        self.assertAlmostEqual(result["nearest_contextual_distance_km"], 2.04, delta=0.01)

    def test_score_is_none_never_a_fabricated_zero(self):
        result = hz.score_hazard_exposure_landslide(BHITAI_MALLI_LAT, BHITAI_MALLI_LON)
        self.assertIsNone(result["score"])
        self.assertNotEqual(result["score"], 0)
        self.assertNotEqual(result["score"], 0.0)

    def test_through_full_risk_engine(self):
        settlement = Settlement(
            id=1,
            name="Bhitai Malli",
            district="Pauri Garhwal",
            state="Uttarakhand",
            population=383,
            households=86,
            elevation_m=991.0,
            slope_degrees=18.91,
            latitude=BHITAI_MALLI_LAT,
            longitude=BHITAI_MALLI_LON,
        )
        assessment = assess_settlement_risk(settlement)

        self.assertEqual(assessment["assessment_status"], "pending")
        self.assertIsNone(assessment["overall_score"])
        self.assertIsNone(assessment["risk_level"])

        hazard_dim = next(
            d for d in assessment["dimensions"] if d["dimension"] == "Hazard Exposure"
        )
        self.assertEqual(hazard_dim["status"], "no_evidence_found")
        self.assertIsNone(hazard_dim["score"])
        self.assertEqual(hazard_dim["weight"], 0.30)
        self.assertIsNotNone(hazard_dim["hazard_exposure_detail"])
        self.assertEqual(hazard_dim["hazard_exposure_detail"]["reason"], "no_evidence_found")

        # Other four dimensions must be completely unaffected.
        for other in assessment["dimensions"]:
            if other["dimension"] == "Hazard Exposure":
                continue
            self.assertIn(other["status"], ("no_scoring_rule", "no_data"))
            self.assertIsNone(other["score"])
            self.assertIsNone(other["hazard_exposure_detail"])

    def test_overall_weights_unchanged(self):
        self.assertEqual(
            DIMENSION_WEIGHTS,
            {
                "Terrain / Physical Susceptibility": 0.20,
                "Hazard Exposure": 0.30,
                "Historical Disaster Evidence": 0.15,
                "Population / Household Exposure": 0.20,
                "Vulnerability": 0.15,
            },
        )
        self.assertAlmostEqual(sum(DIMENSION_WEIGHTS.values()), 1.0)


class TestProximityBandsAgainstRealRecords(unittest.TestCase):
    """Tests 2/3/4/9: exercise each band end-to-end via the public
    scoring function, anchored on real GSI records."""

    def test_point_at_a_real_record_scores_in_0_200m_band(self):
        records, _nn, _density = _dataset_geometry_stats()
        record = records[0]
        result = hz.score_hazard_exposure_landslide(record.latitude, record.longitude)
        self.assertEqual(result["status"], "scored")
        self.assertEqual(result["proximity_band"], "0-200m")
        self.assertGreaterEqual(result["proximity_base_score"], 80.0)

    def test_point_400m_from_an_isolated_record_scores_in_200_600m_band(self):
        anchor = _find_isolated_record(min_nn_km=2.5)
        lat, lon = _offset_north(anchor.latitude, anchor.longitude, 400)
        result = hz.score_hazard_exposure_landslide(lat, lon)
        self.assertEqual(result["status"], "scored")
        self.assertEqual(result["proximity_band"], "200-600m")
        self.assertEqual(result["qualifying_record_count"], 1)
        self.assertEqual(result["nearest_qualifying_slide_no"], anchor.slide_no)

    def test_point_800m_from_an_isolated_record_scores_in_600m_1km_band(self):
        anchor = _find_isolated_record(min_nn_km=2.5)
        lat, lon = _offset_north(anchor.latitude, anchor.longitude, 800)
        result = hz.score_hazard_exposure_landslide(lat, lon)
        self.assertEqual(result["status"], "scored")
        self.assertEqual(result["proximity_band"], "600m-1km")

    def test_record_just_beyond_1km_does_not_contribute(self):
        anchor = _find_isolated_record(min_nn_km=2.5)
        lat, lon = _offset_north(anchor.latitude, anchor.longitude, 1050)
        result = hz.score_hazard_exposure_landslide(lat, lon)
        self.assertEqual(result["status"], "no_evidence_found")
        self.assertIsNone(result["score"])
        self.assertEqual(result["qualifying_record_count"], 0)
        # It must still show up as context (1-5km), not disappear entirely.
        self.assertGreaterEqual(result["contextual_record_count"], 1)


class TestDensityBonus(unittest.TestCase):
    """Test 5: >=5 qualifying records -> density bonus applied."""

    def test_density_bonus_applies_at_a_real_dense_cluster(self):
        anchor = _find_dense_cluster_center(min_neighbors=4)
        result = hz.score_hazard_exposure_landslide(anchor.latitude, anchor.longitude)
        self.assertEqual(result["status"], "scored")
        self.assertGreaterEqual(result["qualifying_record_count"], hz.DENSITY_BONUS_THRESHOLD)
        self.assertTrue(result["density_bonus_applied"])
        self.assertEqual(result["density_bonus_value"], hz.DENSITY_BONUS_VALUE)

    def test_no_density_bonus_for_an_isolated_record(self):
        records, _nn, density_1km = _dataset_geometry_stats()
        isolated = next(
            (r for r, count in zip(records, density_1km) if count == 0), None
        )
        self.assertIsNotNone(isolated, "No isolated (0-neighbor) record found in dataset.")
        result = hz.score_hazard_exposure_landslide(isolated.latitude, isolated.longitude)
        self.assertEqual(result["status"], "scored")
        self.assertFalse(result["density_bonus_applied"])
        self.assertEqual(result["density_bonus_value"], 0.0)


class TestMissingActivityFallback(unittest.TestCase):
    """Test 7: a real record with blank activity -> neutral fallback."""

    def test_blank_activity_record_gets_neutral_modifier(self):
        records, _nn, _density = _dataset_geometry_stats()
        blank_record = next((r for r in records if r.activity is None), None)
        if blank_record is None:
            self.skipTest("No blank-activity record present in the current acquired dataset.")
        result = hz.score_hazard_exposure_landslide(blank_record.latitude, blank_record.longitude)
        self.assertEqual(result["status"], "scored")
        self.assertEqual(result["activity_modifier_applied"], 1.0)
        self.assertEqual(result["activity_value_used"], "unpopulated")


class TestNonContributingFields(unittest.TestCase):
    """Tests 10/11/12: casualty/damage, triggering, and recency must
    never affect the numeric score."""

    def test_landslide_record_has_no_casualty_or_date_fields(self):
        field_names = set(hz.LandslideRecord.__dataclass_fields__.keys())
        self.assertEqual(
            field_names,
            {"slide_no", "latitude", "longitude", "activity", "triggering", "toposheet"},
        )

    def test_scoring_helpers_never_reference_excluded_fields(self):
        source = inspect.getsource(hz._proximity_base_score) + inspect.getsource(
            hz._activity_modifier
        )
        for forbidden in ("triggering", "toposheet", "casualty", "peopledead", "initiation", "reactivat"):
            self.assertNotIn(forbidden, source)

    def test_score_is_fully_reproducible_from_distance_activity_count_alone(self):
        records, _nn, _density = _dataset_geometry_stats()
        candidate_points = [
            (BHITAI_MALLI_LAT, BHITAI_MALLI_LON),
            (records[0].latitude, records[0].longitude),
            (records[len(records) // 2].latitude, records[len(records) // 2].longitude),
        ]
        for lat, lon in candidate_points:
            result = hz.score_hazard_exposure_landslide(lat, lon)
            if result["status"] != "scored":
                self.assertIsNone(result["score"])
                continue
            base = result["proximity_base_score"]
            activity_mod = result["activity_modifier_applied"]
            density = result["density_bonus_value"]
            expected = round(max(0.0, min(100.0, base * activity_mod + density)), 2)
            self.assertEqual(result["score"], expected)


class TestSourceDataImmutability(unittest.TestCase):
    def test_raw_geojson_untouched_by_scoring(self):
        import hashlib

        path = Path(settings.gsi_landslides_geojson_path)
        digest_before = hashlib.sha256(path.read_bytes()).hexdigest()
        hz.score_hazard_exposure_landslide(BHITAI_MALLI_LAT, BHITAI_MALLI_LON)
        digest_after = hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(digest_before, digest_after)


if __name__ == "__main__":
    unittest.main()
