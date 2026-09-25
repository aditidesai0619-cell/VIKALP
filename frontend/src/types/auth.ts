// Shape of POST /api/auth/login — matches backend/app/schemas/auth.py.
// Never add a password field here — the backend never returns one.

export interface ApiAuthenticatedUser {
  username: string;
  role: string;
}

export interface ApiLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: ApiAuthenticatedUser;
}
