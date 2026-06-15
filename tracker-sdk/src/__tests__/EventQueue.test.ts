import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventQueue } from '../queue/EventQueue';
import type { EventDTO } from '../types/EventTypes';

function createEvent(overrides: Partial<EventDTO> = {}): EventDTO {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    eventType: 'page_view',
    anonymousId: 'anon_test',
    timestamp: Date.now(),
    platform: 'web',
    page: { url: 'http://localhost/test', title: 'Test' },
    ...overrides,
  };
}

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

describe('EventQueue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    queue = new EventQueue({ enabled: true, maxQueueSize: 100 });
    queue.clear();
  });

  it('should enqueue events', () => {
    const event = createEvent();
    queue.enqueue(event);
    expect(queue.size()).toBe(1);
  });

  it('should respect max queue size', () => {
    const smallQueue = new EventQueue({ enabled: true, maxQueueSize: 3 });
    for (let i = 0; i < 5; i++) {
      smallQueue.enqueue(createEvent({ eventId: `evt_${i}` }));
    }
    expect(smallQueue.size()).toBeLessThanOrEqual(3);
  });

  it('should drain all events', () => {
    queue.enqueue(createEvent({ eventId: 'a' }));
    queue.enqueue(createEvent({ eventId: 'b' }));
    const events = queue.drain();
    expect(events).toHaveLength(2);
    expect(queue.size()).toBe(0);
  });

  it('should save and load from localStorage', () => {
    queue.enqueue(createEvent({ eventId: 'stored' }));

    const queue2 = new EventQueue({ enabled: true, maxQueueSize: 100 });
    expect(queue2.size()).toBe(1);
  });

  it('should enqueue events with retry count tracking', () => {
    const event = createEvent({ eventId: 'retry-test' });
    queue.enqueue(event);
    const drained = queue.drain();
    // Re-enqueue with retry tracking
    queue.enqueueBatch(drained);
    // Should have 1 event with _retryCount incremented
    expect(queue.size()).toBe(1);
    // Drain should strip _retryCount from output
    const drained2 = queue.drain();
    expect(drained2[0]).not.toHaveProperty('_retryCount');
  });

  it('should drain only clean events (no _retryCount)', () => {
    queue.enqueue(createEvent({ eventId: 'clean' }));
    const events = queue.drain();
    expect(events[0]).not.toHaveProperty('_retryCount');
  });

  describe('flushImmediate', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('posts the event and resolves true on success', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal('fetch', fetchMock);

      const event = createEvent({ eventId: 'immediate-ok', eventType: 'click' });
      const ok = await queue.flushImmediate(event, 'http://x/api/v1/collect');

      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({ events: [event] });
    });

    it('resolves false (does not throw) on failure so caller can re-enqueue', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const event = createEvent({ eventId: 'immediate-fail', eventType: 'click' });
      const ok = await queue.flushImmediate(event, 'http://x/api/v1/collect');

      expect(ok).toBe(false);
      // caller is responsible for re-enqueue; queue itself stays empty here
      expect(queue.size()).toBe(0);
    });
  });

  describe('flushBeacon', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('drains the queue via sendBeacon on success', () => {
      const beacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', { sendBeacon: beacon });

      queue.enqueue(createEvent({ eventId: 'beacon-a' }));
      queue.enqueue(createEvent({ eventId: 'beacon-b' }));
      queue.flushBeacon('http://x/api/v1/collect');

      expect(beacon).toHaveBeenCalledTimes(1);
      expect(queue.size()).toBe(0);
    });

    it('re-enqueues when sendBeacon returns false', () => {
      vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) });

      queue.enqueue(createEvent({ eventId: 'beacon-fail' }));
      queue.flushBeacon('http://x/api/v1/collect');

      expect(queue.size()).toBe(1);
    });
  });
});
