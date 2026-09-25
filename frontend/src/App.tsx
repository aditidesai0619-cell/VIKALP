import { useEffect } from "react";
import { PageRouter } from "./components/navigation/PageRouter";
import { useHashRoute } from "./components/navigation/useHashRoute";
import { SESSION_EXPIRED_EVENT } from "./services/apiClient";
import { hasSession } from "./services/session";
import { HistoricalReplayProvider } from "./state/historicalReplayContext";
import { SelectionProvider } from "./state/selectionContext";
import type { PageId } from "./types/navigation";

// Task 35 — minimal route guard, no router library added. Every page
// except "login" requires a session; a hash pointing at a protected
// page with no session renders Login immediately (no flash of the
// protected page) and corrects the hash to match.
const PUBLIC_PAGES: ReadonlySet<PageId> = new Set(["login"]);

function App() {
  const [activePage, navigate] = useHashRoute();
  const authorized = PUBLIC_PAGES.has(activePage) || hasSession();
  const effectivePage: PageId = authorized ? activePage : "login";

  useEffect(() => {
    if (!authorized) {
      navigate("login");
    }
  }, [authorized, navigate]);

  useEffect(() => {
    // A protected API request coming back 401 (expired/invalid token)
    // clears the session and returns here — never silently retried.
    function handleSessionExpired() {
      navigate("login");
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [navigate]);

  return (
    <SelectionProvider>
      <HistoricalReplayProvider>
        <PageRouter activePage={effectivePage} onNavigate={navigate} />
      </HistoricalReplayProvider>
    </SelectionProvider>
  );
}

export default App;
