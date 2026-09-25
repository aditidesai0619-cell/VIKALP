"""Shared test-only fixtures for VIKALP's backend regression suite (Task 33).

Not a test module itself (`unittest discover`'s default `test*.py`
pattern does not match this filename, so it is never collected/run as
a test case on its own).

Provides an isolated, temporary SQLite database for API-layer tests so
the developer's real `backend/vikalp.db` is never read from or written
to by the test suite (Task 33 §6).

Also provides `TEST_OFFICER` (Task 36) — several route functions
(`get_settlement`, `get_settlement_risk`, `get_settlement_decision`,
`get_settlement_destination_analysis`, `get_boundaries`,
`get_settlement_report`) gained an `officer: AuthenticatedOfficer =
Depends(get_current_officer)` parameter in Task 36 so their route
bodies can record who accessed them. Real HTTP/ASGI requests get a
real officer via FastAPI's dependency injection; a direct Python call
(this project's established route-testing approach — see Tasks 33-35's
test docstrings) bypasses that injection entirely, so every existing
direct call to one of those functions with a real settlement id must
now pass `officer=TEST_OFFICER` explicitly, or it would receive the
unresolved `Depends(...)` sentinel object instead of a real officer and
raise `AttributeError` the moment the route tries to audit-log it.
"""

import os
import tempfile

from app.config import settings
from app.database import init_db, seed_demo_data
from app.services.auth import AuthenticatedOfficer

TEST_OFFICER = AuthenticatedOfficer(username="test.officer", role="officer")


class IsolatedDatabase:
    """Context manager: points `app.config.settings.database_path` at a
    fresh temporary SQLite file for the duration of the `with` block,
    then restores the original path and deletes the temp file.

    `settings` is a frozen dataclass *singleton* instance shared by
    every module that does `from .config import settings` (app.database,
    app.api.settlements, etc. all hold a reference to the same object),
    so patching the attribute here — via `object.__setattr__`, which
    bypasses the dataclass's own frozen check — takes effect everywhere
    immediately, regardless of which module was imported first. No
    production file is modified by this; it is a runtime test-fixture
    patch, scoped to the lifetime of this context manager.
    """

    def __enter__(self) -> str:
        self._original_path = settings.database_path
        fd, self._temp_path = tempfile.mkstemp(suffix=".db", prefix="vikalp_test_")
        os.close(fd)
        object.__setattr__(settings, "database_path", self._temp_path)
        init_db()
        seed_demo_data()
        return self._temp_path

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        object.__setattr__(settings, "database_path", self._original_path)
        try:
            os.remove(self._temp_path)
        except OSError:
            pass
        return False
