// Task 44 — maps Open-Meteo's WMO weather_code to a small icon glyph
// and intensity category, shared by WeatherForecastCard and StateMap's
// weather marker so both agree on the same visual for the same code.
// Never invents a condition label — the human-readable text always
// comes from the backend's own `condition` field (services/weather.py),
// this only picks a glyph/visual weight for a given numeric code.

export type WeatherIntensity = "clear" | "cloudy" | "drizzle" | "rain" | "heavy-rain" | "snow" | "storm" | "fog";

export function weatherIntensity(code: number): WeatherIntensity {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55].includes(code)) return "drizzle";
  if ([61, 63, 80].includes(code)) return "rain";
  if ([65, 66, 67, 81, 82].includes(code)) return "heavy-rain";
  if ([71, 73, 75].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloudy";
}

const GLYPHS: Record<WeatherIntensity, string> = {
  clear: "☀",
  cloudy: "☁",
  fog: "〰",
  drizzle: "🌦",
  rain: "🌧",
  "heavy-rain": "⛈",
  snow: "❄",
  storm: "⛈",
};

export function weatherGlyph(code: number): string {
  return GLYPHS[weatherIntensity(code)];
}

export function isRaining(code: number): boolean {
  const intensity = weatherIntensity(code);
  return intensity === "drizzle" || intensity === "rain" || intensity === "heavy-rain" || intensity === "storm";
}
