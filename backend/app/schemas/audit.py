from pydantic import BaseModel


class AuditEvent(BaseModel):
    """One append-only audit record — never a password, token, or
    Authorization header (see services/audit.py)."""

    id: int
    timestamp: str
    actor: str
    role: str
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    outcome: str
    metadata: str | None = None
