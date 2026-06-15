/**
 * Exchanges an appKey for a JWT token from the tracker-service auth endpoint.
 * Token is cached and auto-refreshed before expiry.
 *
 * Mirrors the Java SDK {@code com.gateflow.sdk.auth.AuthClient} behavior:
 * - POST {baseUrl}/api/v1/collect/auth with X-App-Key header
 * - Caches {sdkToken, expiresIn} response
 * - Refreshes 60s before expiry
 * - Invalidates on 401 response
 */
export interface AuthResponse {
  sdkToken: string;
  expiresIn: number;
}

export class AuthClient {
  private readonly authUrl: string;
  private readonly appKey: string;
  private token: string | null = null;
  private expiresAt: number = 0; // epoch millis

  /**
   * @param baseUrl  Base URL of the tracker server
   * @param appKey   Application key for authentication
   */
  constructor(baseUrl: string, appKey: string) {
    this.authUrl = baseUrl.replace(/\/+$/, '') + '/api/v1/collect/auth';
    this.appKey = appKey;
  }

  /**
   * Returns a valid token, refreshing if absent or within 60s of expiry.
   * Throws if the auth request fails.
   */
  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': this.appKey,
      },
      body: '{}',
    });

    if (!response.ok) {
      throw new Error(`Auth failed: HTTP ${response.status} ${await response.text()}`);
    }

    const body: AuthResponse = await response.json();
    this.token = body.sdkToken;
    this.expiresAt = Date.now() + body.expiresIn * 1000;

    return this.token!;
  }

  /**
   * Synchronous getter — returns the cached token or null.
   * Does NOT trigger a refresh. Use getToken() for guaranteed-fresh token.
   */
  getCachedToken(): string | null {
    if (this.token && Date.now() < this.expiresAt - 60_000) {
      return this.token;
    }
    return null;
  }

  /** Force token refresh on next getToken(). */
  invalidate(): void {
    this.token = null;
    this.expiresAt = 0;
  }
}
