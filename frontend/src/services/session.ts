// Current-browser-session auth state (Task 35 §G). Uses sessionStorage,
// not localStorage, so the token does not persist once the tab/browser
// is closed. Never put the token in a URL/hash.

import type { ApiAuthenticatedUser } from "../types/auth";

const TOKEN_KEY = "vikalp.session.token";
const USER_KEY = "vikalp.session.user";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // sessionStorage can throw (e.g. some private-browsing modes) —
    // treat as "no session" rather than crashing the app.
    return null;
  }
}

export function getUser(): ApiAuthenticatedUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ApiAuthenticatedUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: ApiAuthenticatedUser): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // If storage isn't available, the session just won't persist
    // across a reload — never throw out of a successful login.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function hasSession(): boolean {
  return getToken() !== null;
}
