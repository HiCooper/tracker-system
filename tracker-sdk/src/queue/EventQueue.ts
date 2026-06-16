import type { EventDTO, CollectRequest, CollectResponse } from '../types/EventTypes';
import type { OfflineConfig } from '../types/EventTypes';

interface QueueEntry extends EventDTO {
  _retryCount?: number;
}

/**
 * Auth context provided by the Tracker before each HTTP request.
 * Using getter functions so the EventQueue always reads the latest token
 * (which may have been refreshed since the last request).
 *
 * Two auth paths:
 * - {@code getSdkToken} — JWT for Server SDK (sends X-Sdk-Token header)
 * - {@code getAppKey} — write-only key for Browser SDK (sends X-App-Key header)
 * The SDK token takes precedence when both are available.
 */
export interface AuthContext {
  getSdkToken(): string | null;
  getAppKey(): string | null;
  getClientId(): string;
  /** Called by EventQueue when server returns 401. */
  onAuthFailed?(): void;
}

const STORAGE_KEY = 'gf_tracker_queue';

export class EventQueue {
  private queue: QueueEntry[] = [];
  private maxSize: number;
  private maxRetries: number = 3;
  private auth: AuthContext | null = null;

  constructor(config: OfflineConfig) {
    this.maxSize = config.maxQueueSize ?? 100;
    this.loadFromStorage();
  }

  /** Set the auth context for all subsequent HTTP requests. */
  setAuthContext(auth: AuthContext | null): void {
    this.auth = auth;
  }

  enqueue(event: EventDTO): void {
    const entry: QueueEntry = { ...event, _retryCount: 0 };
    this.queue.push(entry);

    // Enforce max size
    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    this.saveToStorage();
  }

  enqueueBatch(events: EventDTO[]): void {
    for (const event of events) {
      const existingRetry = (event as QueueEntry)._retryCount ?? 0;
      const entry: QueueEntry = { ...event, _retryCount: existingRetry + 1 };

      // Drop events that exceed max retries
      if (entry._retryCount! > this.maxRetries) {
        console.warn(`[Tracker] Event ${event.eventId} exceeded max retries (${this.maxRetries}), dropping`);
        continue;
      }

      this.queue.push(entry);
    }

    while (this.queue.length > this.maxSize) {
      this.queue.shift();
    }

    this.saveToStorage();
  }

  drain(): EventDTO[] {
    const events = this.queue.map((e) => {
      const { _retryCount, ...event } = e;
      return event as EventDTO;
    });
    this.queue = [];
    this.saveToStorage();
    return events;
  }

  size(): number {
    return this.queue.length;
  }

  async flush(endpoint: string): Promise<boolean> {
    if (this.queue.length === 0) return true;

    const events = this.drain();
    console.log(`[Tracker] Flushing ${events.length} events to ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(events)),
      });

      let result: CollectResponse = { code: response.status, message: '' };
      try {
        result = await response.json();
      } catch { /* non-JSON — fall through to status check */ }

      if (response.ok && (result.code === 200 || result.code === 0)) {
        const d = result.data;
        console.log(`[Tracker] Sent ${events.length} events — `
          + `accepted=${d?.accepted ?? '?'} duplicate=${d?.duplicate ?? '?'} rejected=${d?.rejected ?? '?'}`);
        return true;
      }

      if (response.status === 401) {
        console.warn('[Tracker] Auth failed (401)');
        this.auth?.onAuthFailed?.();
        this.enqueueBatch(events);
        return false;
      }

      throw new Error(`HTTP ${response.status}: ${result.message}`);
    } catch (error) {
      console.error('[Tracker] Failed to flush events:', error);
      this.enqueueBatch(events);
      return false;
    }
  }

  /**
   * Flush the queue on page unload using fetch + keepalive so auth
   * headers are included (unlike sendBeacon which cannot set custom headers).
   * Falls back to sendBeacon when fetch keepalive is unavailable.
   * Re-enqueues to localStorage on failure so events survive the unload.
   */
  flushBeacon(endpoint: string): void {
    if (this.queue.length === 0) return;

    const events = this.drain();
    const headers = this.buildHeaders();
    const payload = JSON.stringify(this.buildBody(events));

    // Prefer fetch+keepalive so auth headers are sent.
    // Supported in Chrome 66+, Firefox 66+, Safari 13+.
    if (typeof fetch === 'function') {
      try {
        fetch(endpoint, {
          method: 'POST',
          headers,
          body: payload,
          keepalive: true,
        }).catch(() => {
          this.enqueueBatch(events);
        });
        return;
      } catch {
        // Fall through to sendBeacon
      }
    }

    // Fallback: sendBeacon (no custom headers — token is lost)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const ok = navigator.sendBeacon(endpoint, blob);
        if (!ok) {
          this.enqueueBatch(events);
        }
      } catch {
        this.enqueueBatch(events);
      }
    } else {
      this.enqueueBatch(events);
    }
  }

  /**
   * Immediately flush a single high-priority event (exposure/click) without waiting for batch threshold.
   * This ensures critical business metrics are reported in real-time.
   * Returns false on failure so the caller can re-enqueue for retry.
   */
  async flushImmediate(event: EventDTO, endpoint: string): Promise<boolean> {
    console.log(`[Tracker] Immediately flushing ${event.eventType} event: ${event.eventId}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody([event])),
      });

      let result: CollectResponse = { code: response.status, message: '' };
      try {
        result = await response.json();
      } catch { /* non-JSON */ }

      if (response.ok && (result.code === 200 || result.code === 0)) {
        console.log(`[Tracker] Successfully sent immediate ${event.eventType} event`);
        return true;
      }

      if (response.status === 401) {
        console.warn('[Tracker] Auth failed (401) on immediate flush');
        this.auth?.onAuthFailed?.();
        return false;
      }

      throw new Error(`HTTP ${response.status}: ${result.message}`);
    } catch (error) {
      console.error('[Tracker] Failed to flush immediate event:', error);
      return false;
    }
  }

  /** Build auth headers for a collect request. */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timestamp': String(Date.now()),
    };
    const token = this.auth?.getSdkToken();
    if (token) {
      headers['X-Sdk-Token'] = token;
    } else {
      const appKey = this.auth?.getAppKey();
      if (appKey) {
        headers['X-App-Key'] = appKey;
      }
    }
    return headers;
  }

  private buildBody(events: EventDTO[]): CollectRequest {
    return {
      events,
      clientId: this.auth?.getClientId(),
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      // Storage full or unavailable
      console.warn('[Tracker] Failed to save queue to localStorage');
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }
}
