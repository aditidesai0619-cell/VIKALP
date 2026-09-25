import type { WeatherRequestState } from "../../types/weather";
import { weatherGlyph } from "../../utils/weatherIcon";
import { OverviewCard } from "./OverviewCard";

const DAY_LABELS = ["Today", "Tomorrow", "Day 3"];

// Task 44 — real current conditions + 3-day forecast for Bhitai
// Malli's coordinates (GET /api/weather/pilot, Open-Meteo). Every value
// shown is exactly what the API returned; an unreachable/unexpected
// response shows "Weather data unavailable" rather than a guessed
// forecast (never hard-codes "Heavy rain" the way the reference mock
// does).
//
// Task 45.7 §6 — titled "Pilot Location Weather," not "Weather
// Forecast" or "Uttarakhand Weather": the backend only ever samples
// one point (Bhitai Malli), so the card title itself says so up front
// rather than relying on the officer to notice the location line
// underneath. Never implies statewide coverage.
export function WeatherForecastCard({ state, bare }: { state: WeatherRequestState; bare?: boolean }) {
  if (state.status === "loading") {
    return (
      <OverviewCard icon="☁" title="Pilot Location Weather" bare={bare}>
        <span className="text-[13px] text-vikalp-text-secondary">Loading…</span>
      </OverviewCard>
    );
  }

  if (state.status === "error") {
    return (
      <OverviewCard icon="☁" title="Pilot Location Weather" bare={bare}>
        <span className="text-[13px] text-vikalp-critical">Weather data unavailable</span>
        <span className="text-[12px] text-vikalp-text-secondary">{state.message}</span>
      </OverviewCard>
    );
  }

  const { weather } = state;

  return (
    <OverviewCard icon="☁" title="Pilot Location Weather" bare={bare}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {weatherGlyph(weather.weather_code)}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-medium text-vikalp-text">{weather.condition}</span>
            <span className="text-[12px] text-vikalp-text-secondary">
              {weather.location_name}
            </span>
          </div>
        </div>
        <span className="text-2xl font-semibold text-vikalp-text">
          {Math.round(weather.temperature_c)}°C
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px] text-vikalp-text-secondary">
        <span>Humidity {Math.round(weather.humidity_percent)}%</span>
        <span>Wind {Math.round(weather.wind_speed_kmh)} km/h</span>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-vikalp-border pt-3">
        {weather.daily.map((day, index) => (
          <div key={day.date} className="flex flex-col items-center gap-1 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wide text-vikalp-text-secondary">
              {DAY_LABELS[index] ?? day.date}
            </span>
            <span aria-hidden="true">{weatherGlyph(day.weather_code)}</span>
            <span className="text-[12px] text-vikalp-text">
              {Math.round(day.temp_min_c)}°–{Math.round(day.temp_max_c)}°
            </span>
          </div>
        ))}
      </div>

      <span className="text-[11px] text-vikalp-text-secondary">{weather.source}</span>
    </OverviewCard>
  );
}
