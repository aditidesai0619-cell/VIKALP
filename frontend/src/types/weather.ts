// Shape of GET /api/weather/pilot — matches backend/app/schemas/weather.py.
// Real weather for Bhitai Malli's coordinates only, sourced from
// Open-Meteo — never a fabricated forecast, never a state-wide
// Uttarakhand figure (see backend/app/services/weather.py). Do not add
// fields the backend doesn't return.

export interface ApiDailyWeather {
  date: string;
  weather_code: number;
  condition: string;
  temp_min_c: number;
  temp_max_c: number;
  precipitation_mm: number;
}

export interface ApiWeatherSummary {
  location_name: string;
  latitude: number;
  longitude: number;
  observed_at: string;
  temperature_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  precipitation_mm: number;
  weather_code: number;
  condition: string;
  daily: ApiDailyWeather[];
  source: string;
}

export type WeatherRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; weather: ApiWeatherSummary };
