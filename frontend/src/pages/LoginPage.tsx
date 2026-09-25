import { useState, type FormEvent } from "react";
import { PilotDataBadge } from "../components/common/PilotDataBadge";
import { login } from "../services/auth";
import { setSession } from "../services/session";
import type { PageId } from "../types/navigation";

// Task 35 — real (if minimal) JWT login. Task 42 — this page's black +
// gold + white/neutral direction (originally applied here only, via
// literal hex values) is now the whole app's direction; rewritten here
// to use the shared vikalp-* theme tokens (styles/index.css) instead
// of duplicating the same palette in hex, so this page can never drift
// out of sync with the rest of VIKALP.

type LoginStatus = "idle" | "submitting" | "invalid-credentials" | "network-error";

export function LoginPage({
  onNavigate,
}: {
  onNavigate: (page: PageId) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");

  const isSubmitting = status === "submitting";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    try {
      const response = await login(username, password);
      setSession(response.access_token, response.user);
      onNavigate("overview");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      setStatus(
        message === "Invalid username or password."
          ? "invalid-credentials"
          : "network-error",
      );
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-vikalp-bg px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-2xl font-bold tracking-wide text-vikalp-text">VIKALP</span>
        <span className="h-px w-16 bg-vikalp-navy" />
        <span className="mt-2 text-sm text-vikalp-text-secondary">
          Safer Habitations. Stronger Tomorrow.
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-vikalp-border bg-vikalp-card p-6 shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="username"
            className="text-xs font-medium text-vikalp-text-secondary"
          >
            Officer ID
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
            className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-xs font-medium text-vikalp-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className="rounded-md border border-vikalp-border bg-vikalp-bg px-3 py-2 text-sm text-vikalp-text outline-none focus:border-vikalp-navy focus:ring-1 focus:ring-vikalp-navy disabled:opacity-60"
          />
        </div>

        {status === "invalid-credentials" && (
          <p className="text-xs font-medium text-vikalp-critical">
            Invalid Officer ID or password.
          </p>
        )}
        {status === "network-error" && (
          <p className="text-xs font-medium text-vikalp-critical">
            Could not reach the VIKALP backend. Check your connection and
            try again.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-vikalp-navy px-4 py-2 text-sm font-semibold text-vikalp-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs text-vikalp-text-secondary">
          Closed-access officer login. Contact your administrator for
          credentials.
        </p>
      </form>

      <PilotDataBadge />
    </div>
  );
}
