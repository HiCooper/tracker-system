import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClickCollector } from '../collectors/ClickCollector';
import { StayCollector } from '../collectors/StayCollector';
import { ErrorCollector } from '../collectors/ErrorCollector';
import { SessionCollector } from '../collectors/SessionCollector';

describe('ClickCollector', () => {
  it('should create with default config', () => {
    const collector = new ClickCollector(
      { enabled: true },
      () => {}
    );
    expect(collector).toBeDefined();
    collector.stop();
  });

  it('should not track when disabled', () => {
    const callback = vi.fn();
    const collector = new ClickCollector({ enabled: false }, callback);
    collector.start();
    expect(callback).not.toHaveBeenCalled();
    collector.stop();
  });
});

describe('StayCollector', () => {
  it('should create with default config', () => {
    const collector = new StayCollector(
      { enabled: true, threshold: 3 },
      () => {}
    );
    expect(collector).toBeDefined();
    collector.stop();
  });

  it('should not report stays below threshold', () => {
    const callback = vi.fn();
    const collector = new StayCollector(
      { enabled: true, threshold: 9999 },
      callback
    );
    collector.start();
    // Simulate visibility hidden (not enough time passed)
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).not.toHaveBeenCalled();
    collector.stop();
  });
});

describe('ErrorCollector', () => {
  it('should create with default config', () => {
    const collector = new ErrorCollector(
      { enabled: true },
      () => {}
    );
    expect(collector).toBeDefined();
    collector.stop();
  });

  it('should deduplicate identical errors', () => {
    const callback = vi.fn();
    const collector = new ErrorCollector(
      { enabled: true, dedup: true },
      callback
    );
    collector.start();

    const errorEvent = new ErrorEvent('error', {
      message: 'Test error',
      error: new Error('Test error'),
      lineno: 1,
      filename: 'test.js',
    });

    window.dispatchEvent(errorEvent);
    window.dispatchEvent(errorEvent);
    window.dispatchEvent(errorEvent);

    // Only first should be reported
    expect(callback).toHaveBeenCalledTimes(1);
    collector.stop();
  });
});

describe('SessionCollector', () => {
  it('should generate a session ID', () => {
    const collector = new SessionCollector();
    const info = collector.getSessionInfo();
    expect(info.sessionId).toBeDefined();
    expect(info.sessionId).toMatch(/^sess_/);
    collector.stop();
  });

  it('should increment event count on recordActivity', () => {
    const collector = new SessionCollector();
    collector.recordActivity();
    collector.recordActivity();
    const info = collector.getSessionInfo();
    expect(info.eventCount).toBe(2);
    collector.stop();
  });
});
