from pydantic import BaseModel


class DailyWeather(BaseModel):
    date: str
    weather_code: int
    condition: str
    temp_min_c: float
    temp_max_c: float
    precipitation_mm: float


class WeatherSummary(BaseModel):
    """Real weather for Bhitai Malli's coordinates only — see
    services/weather.py's module docstring for why this is never
    presented as a state-wide Uttarakhand figure."""

    location_name: str
    latitude: float
    longitude: float
    observed_at: str
    temperature_c: float
    humidity_percent: float
    wind_speed_kmh: float
    precipitation_mm: float
    weather_code: int
    condition: str
    daily: list[DailyWeather]
    source: str
