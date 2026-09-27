// Central authenticated-fetch helper (Task 35 §H). Every existing
// VIKALP data service (risk/settlements/gis/decision/destination)
// calls this instead of duplicating fetch/error-handling logic — same
// response handling and error messages as before, with a Bearer token
// attached and a uniform 401 -> "clear session, notify the app" path
// added. Never used for POST /api/auth/login (that request must not
// carry a token — see services/auth.ts, which calls fetch directly).

import { clearSession, getToken } from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Dispatched on `window` whenever a protected request comes back 401
// (missing/expired/invalid token). App.tsx listens for this once, at
// the top level, to clear the session and return to Login — a request
// is never silently retried.
export const SESSION_EXPIRED_EVENT = "vikalp:session-expired";

export async function apiFetch<T>(path: string): Promise<T> {
  let response: Response;
  try {
    const token = getToken();
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    throw new Error("Could not reach the VIKALP backend.");
  }

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(`Backend returned an error (HTTP ${response.status}).`);
  }

  return (await response.json()) as T;
}

export interface ApiBlobResponse {
  blob: Blob;
  // Parsed from the response's Content-Disposition header, if present
  // (the report endpoint always sets one — see api/report.py).
  filename: string | null;
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename="?([^";]+)"?/.exec(contentDisposition);
  return match ? match[1] : null;
}

// Same token/401/error-handling conventions as apiFetch above — a
// sibling function for binary (e.g. PDF) responses, not a second
// authentication mechanism (Task 40 §L).
export async function apiFetchBlob(path: string): Promise<ApiBlobResponse> {
  let response: Response;
  try {
    const token = getToken();
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    throw new Error("Could not reach the VIKALP backend.");
  }

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(`Backend returned an error (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const filename = extractFilename(response.headers.get("Content-Disposition"));
  return { blob, filename };
}
