import type { ScrollConfig, EventData } from '../types/EventTypes';

type ScrollCallback = (data: EventData) => void;

export class ScrollCollector {
  private config: Required<ScrollConfig>;
  private callback: ScrollCallback;
  private maxScrollDepth: number = 0;
  private lastScrollTime: number = 0;
  private throttleTimer: number | null = null;

  // Throttle: 500ms
  private readonly THROTTLE_MS = 500;

  constructor(config: ScrollConfig, callback: ScrollCallback) {
    this.config = {
      enabled: config.enabled ?? true,
      thresholds: config.thresholds ?? [25, 50, 75, 100],
      throttle: config.throttle ?? 500,
    };
    this.callback = callback;
  }

  start(): void {
    if (!this.config.enabled) return;
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  stop(): void {
    window.removeEventListener('scroll', this.handleScroll);
    if (this.throttleTimer !== null) {
      clearTimeout(this.throttleTimer);
    }
  }

  private handleScroll = (): void => {
    // Throttle
    if (this.throttleTimer !== null) return;

    this.throttleTimer = window.setTimeout(() => {
      this.throttleTimer = null;
      this.reportScrollDepth();
    }, this.config.throttle);
  };

  private reportScrollDepth(): void {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;

    const scrollPercent = Math.round((scrollTop / (docHeight - windowHeight)) * 100);

    if (scrollPercent > this.maxScrollDepth) {
      // Check if we crossed a threshold
      for (const threshold of this.config.thresholds.sort((a, b) => a - b)) {
        if (this.maxScrollDepth < threshold && scrollPercent >= threshold) {
          this.callback({
            scrollDepth: threshold,
          });
        }
      }
      this.maxScrollDepth = scrollPercent;
    }
  }
}
