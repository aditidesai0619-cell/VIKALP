// Task 36 — small, future-ready audit service. Not wired into a
// dashboard/page in this task (backend accountability is the point,
// not UI work); available for a future Reports/Evidence-area section.

import type { ApiAuditEvent } from "../types/audit";
import { apiFetch } from "./apiClient";
import { getToken } from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchAuditEvents(limit = 50): Promise<ApiAuditEvent[]> {
  return apiFetch<ApiAuditEvent[]>(`/api/audit?limit=${limit}`);
}

// Records the officer's own logout while their token is still valid.
// Deliberately best-effort and fire-and-forget (see Header.tsx): a
// failed/slow request here must never block or fail the actual
// client-side logout (clearing the session and returning to Login).
// Does not go through apiFetch, since apiFetch's 401 handling would
// otherwise clear the session and dispatch a redirect event in the
// middle of an already-in-progress logout.
export async function recordLogout(): Promise<void> {
  const token = getToken();
  if (!token) {
    return;
  }
  try {
    await fetch(`${API_BASE_URL}/api/audit/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort only.
  }
}
