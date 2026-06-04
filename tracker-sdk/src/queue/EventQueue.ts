import type { EventDTO } from '../types/EventTypes';
import type { OfflineConfig } from '../types/EventTypes';

interface QueueEntry extends EventDTO {
  _retryCount?: number;
}

const STORAGE_KEY = 'gf_tracker_queue';

export class EventQueue {
  private queue: QueueEntry[] = [];
  private maxSize: number;
  private maxRetries: number = 3;

  constructor(config: OfflineConfig) {
    this.maxSize = config.maxQueueSize ?? 100;
    this.loadFromStorage();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`[Tracker] Successfully sent ${events.length} events`);
      return true;
    } catch (error) {
      console.error('[Tracker] Failed to flush events:', error);
      // Re-enqueue on failure
      this.enqueueBatch(events);
      return false;
    }
  }

  /**
   * Immediately flush a single high-priority event (exposure/click) without waiting for batch threshold.
   * This ensures critical business metrics are reported in real-time.
   */
  async flushImmediate(event: EventDTO, endpoint: string): Promise<boolean> {
    console.log(`[Tracker] Immediately flushing ${event.eventType} event: ${event.eventId}`);


    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`[Tracker] Successfully sent immediate ${event.eventType} event`);
      return true;
    } catch (error) {
      console.error('[Tracker] Failed to flush immediate event:', error);
      // Event already in queue, will be retried by periodic flush
      return false;
    }
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
