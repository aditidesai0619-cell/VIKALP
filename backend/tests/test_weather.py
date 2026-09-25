"""Task 44 — real Open-Meteo-backed weather for Bhitai Malli's
coordinates. Never makes a real network call in tests — `services.
weather._fetch_raw` (the one function that talks to the network) is
replaced with a canned response via unittest.mock.patch, matching the
project's own no-new-HTTP-dependency constraint (see
tests/test_api_settlements_and_gis.py's docstring) while still
exercising the real parsing/caching/error-handling logic.

Run with: python -m unittest discover -s tests   (from backend/)
"""

import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.api.auth import get_current_officer
from app.api.weather import get_pilot_area_weather
from app.services import weather as weather_service
from tests.fixtures import TEST_OFFICER, IsolatedDatabase

_SAMPLE_OPEN_METEO_RESPONSE = {
    "current": {
        "time": "2026-09-19T12:00",
        "temperature_2m": 21.4,
        "relative_humidity_2m": 78,
        "precipitation": 0.6,
        "weather_code": 61,
        "wind_speed_10m": 9.2,
    },
    "daily": {
        "time": ["2026-09-19", "2026-09-20", "2026-09-21"],
        "weather_code": [61, 3, 1],
        "temperature_2m_max": [24.1, 22.8, 23.5],
        "temperature_2m_min": [16.2, 15.9, 16.0],
        "precipitation_sum": [4.2, 0.8, 0.0],
    },
}


class TestWeatherService(unittest.TestCase):
    def setUp(self):
        weather_service._cache = None
        weather_service._cache_fetched_at = 0.0

    def test_parses_real_shaped_response_into_summary(self):
        with patch.object(weather_service, "_fetch_raw", return_value=_SAMPLE_OPEN_METEO_RESPONSE):
            result = weather_service.get_pilot_weather()
        self.assertEqual(result["location_name"], "Bhitai Malli, Pauri Garhwal")
        self.assertAlmostEqual(result["latitude"], 30.167112)
        self.assertAlmostEqual(result["longitude"], 78.781266)
        self.assertEqual(result["temperature_c"], 21.4)
        self.assertEqual(result["condition"], "Slight rain")
        self.assertEqual(len(result["daily"]), 3)
        self.assertEqual(result["daily"][0]["condition"], "Slight rain")
        self.assertIn("Open-Meteo", result["source"])
        self.assertIn("not an official IMD forecast", result["source"])

    def test_unknown_weather_code_falls_back_to_unknown_not_invented(self):
        response = {
            **_SAMPLE_OPEN_METEO_RESPONSE,
            "current": {**_SAMPLE_OPEN_METEO_RESPONSE["current"], "weather_code": 9999},
        }
        with patch.object(weather_service, "_fetch_raw", return_value=response):
            result = weather_service.get_pilot_weather()
        self.assertEqual(result["condition"], "Unknown")

    def test_network_failure_raises_weather_unavailable_not_a_fake_forecast(self):
        with patch.object(
            weather_service, "_fetch_raw", side_effect=weather_service.WeatherUnavailable("boom")
        ):
            with self.assertRaises(weather_service.WeatherUnavailable):
                weather_service.get_pilot_weather()

    def test_malformed_response_raises_weather_unavailable(self):
        with patch.object(weather_service, "_fetch_raw", return_value={"current": {}, "daily": {}}):
            with self.assertRaises(weather_service.WeatherUnavailable):
                weather_service.get_pilot_weather()

    def test_result_is_cached_between_calls(self):
        with patch.object(
            weather_service, "_fetch_raw", return_value=_SAMPLE_OPEN_METEO_RESPONSE
        ) as mock_fetch:
            weather_service.get_pilot_weather()
            weather_service.get_pilot_weather()
        mock_fetch.assert_called_once()

    def test_force_refresh_bypasses_cache(self):
        with patch.object(
            weather_service, "_fetch_raw", return_value=_SAMPLE_OPEN_METEO_RESPONSE
        ) as mock_fetch:
            weather_service.get_pilot_weather()
            weather_service.get_pilot_weather(force_refresh=True)
        self.assertEqual(mock_fetch.call_count, 2)


class TestWeatherRoute(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._db = IsolatedDatabase()
        cls._db.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls._db.__exit__(None, None, None)

    def setUp(self):
        weather_service._cache = None
        weather_service._cache_fetched_at = 0.0

    def test_route_returns_summary_on_success(self):
        with patch.object(weather_service, "_fetch_raw", return_value=_SAMPLE_OPEN_METEO_RESPONSE):
            result = get_pilot_area_weather(officer=TEST_OFFICER)
        self.assertEqual(result["condition"], "Slight rain")

    def test_route_raises_503_on_unavailable(self):
        with patch.object(
            weather_service, "_fetch_raw", side_effect=weather_service.WeatherUnavailable("down")
        ):
            with self.assertRaises(HTTPException) as ctx:
                get_pilot_area_weather(officer=TEST_OFFICER)
        self.assertEqual(ctx.exception.status_code, 503)

    def test_authentication_required(self):
        with self.assertRaises(HTTPException) as ctx:
            get_current_officer(credentials=None)
        self.assertEqual(ctx.exception.status_code, 401)
        from app.api.weather import router as weather_router

        calls = [d.call for route in weather_router.routes for d in route.dependant.dependencies]
        self.assertIn(get_current_officer, calls)


if __name__ == "__main__":
    unittest.main()
