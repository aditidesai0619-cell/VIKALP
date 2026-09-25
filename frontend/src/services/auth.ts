// POST /api/auth/login — deliberately NOT routed through apiFetch
// (services/apiClient.ts): the login request must never carry an
// Authorization header (Task 35 §H), and there is no session yet to
// attach one from.

import type { ApiLoginResponse } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function login(username: string, password: string): Promise<ApiLoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("Could not reach the VIKALP backend.");
  }

  if (response.status === 401) {
    throw new Error("Invalid username or password.");
  }

  if (!response.ok) {
    throw new Error(`Backend returned an error (HTTP ${response.status}).`);
  }

  // Never log the response body (it does not contain the password,
  // but avoid a habit of logging auth responses at all).
  return (await response.json()) as ApiLoginResponse;
}
