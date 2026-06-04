import type { StayConfig, EventData } from '../types/EventTypes';

type StayCallback = (data: EventData) => void;

export class StayCollector {
  private config: Required<StayConfig>;
  private callback: StayCallback;
  private pageEnterTime: number = 0;
  private reported: boolean = false;

  constructor(config: StayConfig, callback: StayCallback) {
    this.config = {
      enabled: config.enabled ?? true,
      threshold: config.threshold ?? 3,
    };
    this.callback = callback;
  }

  start(): void {
    if (!this.config.enabled) return;
    this.pageEnterTime = Date.now();
    this.reported = false;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('pagehide', this.handleBeforeUnload);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handleBeforeUnload);
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.reportStay();
    } else if (document.visibilityState === 'visible') {
      // Reset timer when user returns to page
      this.pageEnterTime = Date.now();
      this.reported = false;
    }
  };

  private handleBeforeUnload = (): void => {
    this.reportStay();
  };

  private reportStay(): void {
    if (this.reported) return;

    const duration = Math.round((Date.now() - this.pageEnterTime) / 1000);
    if (duration < this.config.threshold) return;

    this.reported = true;
    this.callback({
      stayDuration: duration,
    });
  }
}
