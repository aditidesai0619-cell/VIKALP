import sqlite3

from .config import settings

# Bhitai Malli — approved demo planning inputs (see docs/VIKALP_MASTER_SPEC.md).
# Do not add fields or settlements beyond what's documented.
BHITAI_MALLI = {
    "name": "Bhitai Malli",
    "district": "Pauri Garhwal",
    "state": "Uttarakhand",
    "population": 383,
    "households": 86,
    "elevation_m": 991.0,
    "slope_degrees": 18.91,
    "latitude": 30.167112,
    "longitude": 78.781266,
}


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settlements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                district TEXT NOT NULL,
                state TEXT NOT NULL,
                population INTEGER NOT NULL,
                households INTEGER NOT NULL,
                elevation_m REAL NOT NULL,
                slope_degrees REAL NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL
            )
            """
        )
        # Append-only audit trail (Task 36). No application code path
        # ever issues UPDATE/DELETE against this table — see
        # services/audit.py.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                actor TEXT NOT NULL,
                role TEXT NOT NULL,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                outcome TEXT NOT NULL,
                metadata TEXT
            )
            """
        )


def seed_demo_data() -> None:
    # UNIQUE(name) + INSERT OR IGNORE makes this idempotent: restarting the
    # backend never creates a duplicate Bhitai Malli row.
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO settlements
                (name, district, state, population, households,
                 elevation_m, slope_degrees, latitude, longitude)
            VALUES (:name, :district, :state, :population, :households,
                    :elevation_m, :slope_degrees, :latitude, :longitude)
            """,
            BHITAI_MALLI,
        )
