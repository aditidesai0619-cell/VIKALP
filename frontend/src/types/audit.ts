// Shape of GET /api/audit — matches backend/app/schemas/audit.py.
// Never carries a password, token, or Authorization header.

export interface ApiAuditEvent {
  id: number;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  outcome: string;
  metadata: string | null;
}
