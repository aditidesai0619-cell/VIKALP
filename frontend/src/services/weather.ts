import type { ApiWeatherSummary } from "../types/weather";
import { apiFetch } from "./apiClient";

export async function fetchPilotWeather(): Promise<ApiWeatherSummary> {
  return apiFetch<ApiWeatherSummary>("/api/weather/pilot");
}
