import sqlite3
from dataclasses import dataclass


@dataclass(frozen=True)
class Settlement:
    id: int
    name: str
    district: str
    state: str
    population: int
    households: int
    elevation_m: float
    slope_degrees: float
    latitude: float
    longitude: float

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Settlement":
        return cls(
            id=row["id"],
            name=row["name"],
            district=row["district"],
            state=row["state"],
            population=row["population"],
            households=row["households"],
            elevation_m=row["elevation_m"],
            slope_degrees=row["slope_degrees"],
            latitude=row["latitude"],
            longitude=row["longitude"],
        )
