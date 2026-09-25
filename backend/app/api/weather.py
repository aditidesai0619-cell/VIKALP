from fastapi import APIRouter, Depends, HTTPException

from ..schemas.weather import WeatherSummary
from ..services.audit import ACTION_VIEW_WEATHER, OUTCOME_SUCCESS, record_audit_event
from ..services.weather import WeatherUnavailable, get_pilot_weather
from .auth import AuthenticatedOfficer, get_current_officer

# Protected (Task 35 §E) — see api/settlements.py.
router = APIRouter(
    prefix="/api/weather", tags=["weather"], dependencies=[Depends(get_current_officer)]
)


@router.get("/pilot", response_model=WeatherSummary)
def get_pilot_area_weather(
    officer: AuthenticatedOfficer = Depends(get_current_officer),
) -> dict:
    """Real current conditions + 3-day forecast for Bhitai Malli's
    coordinates (Task 44), sourced from Open-Meteo — never a fabricated
    forecast, and never a state-wide Uttarakhand figure. See
    services/weather.py for the full rationale.
    """
    try:
        result = get_pilot_weather()
    except WeatherUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    record_audit_event(
        actor=officer.username,
        role=officer.role,
        action=ACTION_VIEW_WEATHER,
        outcome=OUTCOME_SUCCESS,
        resource_type="weather",
        resource_id="pilot_area",
    )
    return result
