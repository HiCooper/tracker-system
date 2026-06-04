import type { PageViewConfig, EventData } from '../types/EventTypes';

type PageViewCallback = (data: EventData) => void;

export class PageCollector {
  private config: Required<PageViewConfig>;
  private callback: PageViewCallback;
  private endpoint: string;
  private lastUrl: string = '';
  private pageEnterTime: number = 0;
  private currentStayDuration: number = 0;

  constructor(config: PageViewConfig, callback: PageViewCallback, endpoint: string) {
    this.config = {
      SPA: config.SPA ?? false,
      referrer: config.referrer ?? true,
    };
    this.callback = callback;
    this.endpoint = endpoint;
  }

  start(): void {
    try {
      this.pageEnterTime = Date.now();
      this.lastUrl = window.location.href;

      // Listen for page load
      window.addEventListener('load', this.handlePageLoad);

      // Listen for visibility change
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Listen for beforeunload (use sendBeacon for reliability)
      window.addEventListener('beforeunload', this.handleUnload);
      window.addEventListener('pagehide', this.handleUnload);

      // SPA routing detection
      this.interceptHistory();
      window.addEventListener('popstate', this.handleRouteChange);

      // Initial page view
      this.reportPageView();
    } catch (error) {
      console.warn('[PageCollector] Failed to start:', error);
    }
  }

  stop(): void {
    window.removeEventListener('load', this.handlePageLoad);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleUnload);
    window.removeEventListener('pagehide', this.handleUnload);
    window.removeEventListener('popstate', this.handleRouteChange);
  }

  private handlePageLoad = (): void => {
    this.pageEnterTime = Date.now();
    this.reportPageView();
  };

  private handleRouteChange = (): void => {
    if (window.location.href !== this.lastUrl) {
      // Report stay duration for previous page
      this.reportStayDuration();

      // Report new page view
      this.pageEnterTime = Date.now();
      this.lastUrl = window.location.href;
      this.reportPageView();
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.reportStayDuration();
    } else if (document.visibilityState === 'visible') {
      this.pageEnterTime = Date.now();
    }
  };

  private handleUnload = (): void => {
    this.reportStayDuration();
    const data = this.buildPageViewData();
    const blob = new Blob([JSON.stringify({ events: [data] })], { type: 'application/json' });
    navigator.sendBeacon?.(this.endpoint, blob);
  };

  private reportStayDuration(): void {
    const duration = Math.round((Date.now() - this.pageEnterTime) / 1000);
    this.currentStayDuration = duration;
  }

  private buildPageViewData(): EventData {
    const spmData = this.extractBodySpmData();
    return {
      url: window.location.href,
      title: document.title,
      referrer: this.config.referrer ? document.referrer : undefined,
      stayDuration: this.currentStayDuration,
      ...spmData,
    };
  }

  private reportPageView(): void {
    this.callback(this.buildPageViewData());
  }

  private interceptHistory(): void {
    try {
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);

      history.pushState = (...args) => {
        originalPushState(...args);
        this.handleRouteChange();
      };

      history.replaceState = (...args) => {
        originalReplaceState(...args);
        // Only track if URL actually changed
        if (args[2] && args[2] !== this.lastUrl) {
          this.handleRouteChange();
        }
      };
    } catch {
      // History API interception not available
    }
  }

  private extractBodySpmData(): { spmCode?: string; spmLevel?: number } {
    const body = document.body;
    const spmAttr = body?.dataset?.trackSpm;
    if (spmAttr) {
      const parts = spmAttr.split('@');
      return {
        spmCode: parts[0] || undefined,
        spmLevel: parts[1] ? parseInt(parts[1]) : undefined,
      };
    }
    return {};
  }
}
