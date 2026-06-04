import type { ErrorConfig, EventData } from '../types/EventTypes';

type ErrorCallback = (data: EventData) => void;

interface ErrorRecord {
  message: string;
  count: number;
  lastSeen: number;
}

const DEDUP_WINDOW_MS = 10_000;
const MAX_DEDUP_ENTRIES = 100;

export class ErrorCollector {
  private config: Required<ErrorConfig>;
  private callback: ErrorCallback;
  private seenErrors: Map<string, ErrorRecord> = new Map();
  private boundOnerror: ((event: ErrorEvent) => void) | null = null;
  private boundUnhandledRejection: ((e: PromiseRejectionEvent) => void) | null = null;

  constructor(config: ErrorConfig, callback: ErrorCallback) {
    this.config = {
      enabled: config.enabled ?? true,
      dedup: config.dedup ?? true,
    };
    this.callback = callback;
  }

  start(): void {
    if (!this.config.enabled) return;

    this.boundOnerror = this.handleError.bind(this);
    this.boundUnhandledRejection = this.handleRejection.bind(this);

    window.addEventListener('error', this.boundOnerror as EventListener);
    window.addEventListener('unhandledrejection', this.boundUnhandledRejection);
  }

  stop(): void {
    if (this.boundOnerror) {
      window.removeEventListener('error', this.boundOnerror as EventListener);
    }
    if (this.boundUnhandledRejection) {
      window.removeEventListener('unhandledrejection', this.boundUnhandledRejection);
    }
  }

  private handleError(event: ErrorEvent): void {
    const message = event.message || 'Unknown error';
    const filename = event.filename || '';
    const fullMessage = filename ? `${message} (${filename}:${event.lineno})` : message;

    if (!this.shouldReport(fullMessage)) return;

    this.callback({
      errorMessage: message,
      errorStack: event.error?.stack?.slice(0, 1000) || '',
      errorType: 'js_error',
      elementText: filename,
    });
  }

  private handleRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    let message = 'Unhandled Promise Rejection';

    if (reason instanceof Error) {
      message = reason.message;
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      try {
        message = JSON.stringify(reason).slice(0, 200);
      } catch {
        message = 'Unhandled Promise Rejection';
      }
    }

    if (!this.shouldReport(message)) return;

    this.callback({
      errorMessage: message,
      errorStack: reason instanceof Error ? reason.stack?.slice(0, 1000) || '' : '',
      errorType: 'promise_rejection',
    });
  }

  /**
   * Deduplicate identical errors within a time window to avoid flooding.
   */
  private shouldReport(message: string): boolean {
    if (!this.config.dedup) return true;

    const now = Date.now();

    // Clean up old entries
    if (this.seenErrors.size > MAX_DEDUP_ENTRIES) {
      for (const [key, record] of this.seenErrors) {
        if (now - record.lastSeen > DEDUP_WINDOW_MS) {
          this.seenErrors.delete(key);
        }
      }
    }

    const existing = this.seenErrors.get(message);
    if (existing && now - existing.lastSeen < DEDUP_WINDOW_MS) {
      existing.count++;
      existing.lastSeen = now;
      // Report on first occurrence only; subsequent ones are deduped
      return false;
    }

    this.seenErrors.set(message, { message, count: 1, lastSeen: now });
    return true;
  }
}
