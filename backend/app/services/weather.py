"""Real current-weather + 3-day forecast for Bhitai Malli's verified
coordinates (Task 44), fetched from Open-Meteo (open-meteo.com) — a
free, keyless public weather API. Not an official India Meteorological
Department (IMD) forecast; every response discloses this via its own
`source` field.

Weather is fetched for Bhitai Malli's single verified coordinate pair
only. It is NEVER presented as a state-wide Uttarakhand average or
forecast — a single point several hundred kilometres from, say,
Uttarkashi or Champawat cannot honestly represent weather there, and
VIKALP has no other settlement's coordinates to sample from.

Uses the Python standard library only (`urllib.request`) — no new pip
dependency. `requests`/`httpx` were never approved for this project and
are not installed (see tests/test_api_settlements_and_gis.py's own
docstring on why no HTTP client dependency exists here).

Cached in-process with a short TTL — weather changes over hours, not
seconds, so re-fetching on every dashboard poll would be wasteful and
risks tripping Open-Meteo's fair-use rate limit.
"""

import json
import time
import urllib.error
import urllib.request

from ..config import settings

# Bhitai Malli's own verified coordinates (see database.py seed data).
_LATITUDE = 30.167112
_LONGITUDE = 78.781266

_CACHE_TTL_SECONDS = 900  # 15 minutes

# WMO weather interpretation codes — Open-Meteo's own documented code
# table (itself the public WMO 4677 standard), not an invented mapping.
# A code not listed here falls back to "Unknown" rather than guessing.
_WMO_CONDITIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm, slight hail",
    99: "Thunderstorm, heavy hail",
}


def _condition_label(code: int | None) -> str:
    if code is None:
        return "Unknown"
    return _WMO_CONDITIONS.get(code, "Unknown")


class WeatherUnavailable(Exception):
    """Raised when Open-Meteo cannot be reached or returns an
    unexpected shape. Callers must surface this as an honest
    "unavailable" state — never fall back to a guessed/fabricated
    forecast."""


def _fetch_raw() -> dict:
    """The one function that actually talks to the network — isolated
    in its own small function so tests can replace it (via
    unittest.mock.patch) without making a real HTTP call."""
    params = (
        f"latitude={_LATITUDE}&longitude={_LONGITUDE}"
        "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
        "&timezone=auto&forecast_days=3"
    )
    url = f"{settings.weather_api_base_url}?{params}"
    try:
        with urllib.request.urlopen(url, timeout=6) as response:
            if response.status != 200:
                raise WeatherUnavailable(f"Open-Meteo returned HTTP {response.status}.")
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise WeatherUnavailable(f"Could not reach Open-Meteo: {exc}") from exc


_cache: dict | None = None
_cache_fetched_at: float = 0.0


def get_pilot_weather(*, force_refresh: bool = False) -> dict:
    """Real current conditions + 3-day forecast for Bhitai Malli.

    Cached for _CACHE_TTL_SECONDS. `force_refresh` bypasses the cache —
    not currently exposed to any route; reserved for a future manual
    refresh action.
    """
    global _cache, _cache_fetched_at

    now = time.monotonic()
    if not force_refresh and _cache is not None and (now - _cache_fetched_at) < _CACHE_TTL_SECONDS:
        return _cache

    raw = _fetch_raw()

    try:
        current = raw["current"]
        daily = raw["daily"]
        result = {
            "location_name": "Bhitai Malli, Pauri Garhwal",
            "latitude": _LATITUDE,
            "longitude": _LONGITUDE,
            "observed_at": current["time"],
            "temperature_c": current["temperature_2m"],
            "humidity_percent": current["relative_humidity_2m"],
            "wind_speed_kmh": current["wind_speed_10m"],
            "precipitation_mm": current["precipitation"],
            "weather_code": current["weather_code"],
            "condition": _condition_label(current["weather_code"]),
            "daily": [
                {
                    "date": daily["time"][i],
                    "weather_code": daily["weather_code"][i],
                    "condition": _condition_label(daily["weather_code"][i]),
                    "temp_min_c": daily["temperature_2m_min"][i],
                    "temp_max_c": daily["temperature_2m_max"][i],
                    "precipitation_mm": daily["precipitation_sum"][i],
                }
                for i in range(len(daily["time"]))
            ],
            "source": "Open-Meteo (open-meteo.com) — public weather API, not an official IMD forecast",
        }
    except (KeyError, IndexError, TypeError) as exc:
        raise WeatherUnavailable(f"Unexpected Open-Meteo response shape: {exc}") from exc

    _cache = result
    _cache_fetched_at = now
    return result
