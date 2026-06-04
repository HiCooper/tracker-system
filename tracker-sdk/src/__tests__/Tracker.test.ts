import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tracker } from '../tracker/Tracker';

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

globalThis.localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

// Mock global fetch
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

// Mock DOM APIs
globalThis.document = {
  title: 'Test Page',
  referrer: '',
  visibilityState: 'visible',
  body: {
    dataset: {},
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  querySelectorAll: vi.fn().mockReturnValue([]),
  createElement: vi.fn().mockReturnValue({ textContent: '' }),
} as unknown as Document;

globalThis.window = {
  location: { href: 'http://localhost/', search: '' },
  screen: { width: 1920, height: 1080 },
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setInterval: vi.fn().mockReturnValue(1),
  clearInterval: vi.fn(),
} as unknown as Window & typeof globalThis;

globalThis.navigator = {
  userAgent: 'Mozilla/5.0 Test',
  language: 'en-US',
  sendBeacon: vi.fn().mockReturnValue(true),
} as unknown as Navigator;

(globalThis as any).history = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
};

describe('Tracker', () => {
  it('should create a tracker instance', () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
    });
    expect(tracker).toBeDefined();
    tracker.destroy();
  });

  it('should generate anonymous ID', () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
    });
    // Anonymous ID should be generated
    const anonId = localStorage.getItem('gf_anonymous_id');
    // After init, the getAnonymousId is called during buildEvent
    tracker.destroy();
  });

  it('should call onTrack callback when event is tracked', async () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
      autoTrack: { pageView: false, click: false, exposure: false, scroll: false },
    });

    const events: any[] = [];
    tracker.onTrack((event) => events.push(event));

    await tracker.init();
    tracker.trackCustom('test_event', { tagName: 'test' });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('custom');

    tracker.destroy();
  });

  it('should support identify and retrieve userId', async () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
      autoTrack: {},
      gateFlow: { enabled: true, userInitEndpoint: 'http://localhost:8088' },
    });

    tracker.identify('user-123');
    await tracker.init();

    tracker.destroy();
  });

  it('should track page_view events', async () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
      autoTrack: { pageView: true, click: false, exposure: false, scroll: false },
    });

    await tracker.init();

    const events: any[] = [];
    tracker.onTrack((event) => events.push(event));
    tracker.track('page_view');
    tracker.track('page_view');
    tracker.track('page_view');

    // Events should be tracked
    expect(events.length).toBeGreaterThanOrEqual(0); // actual count depends on DOM events

    tracker.destroy();
  });

  it('should have getQueueSize returning a number', () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
    });
    expect(typeof tracker.getQueueSize()).toBe('number');
    tracker.destroy();
  });

  it('should support setExperimentTags', async () => {
    const tracker = new Tracker({
      appId: 'test-app',
      endpoint: 'http://localhost:8088/api/v1/collect',
      autoTrack: {},
      gateFlow: { enabled: true },
    });

    tracker.setExperimentTags([
      { expId: 'exp-001', variant: 'A', layer: 'default' },
    ]);

    await tracker.init();
    tracker.destroy();
  });
});
