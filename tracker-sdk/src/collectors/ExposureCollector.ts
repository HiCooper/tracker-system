import type { ExposureConfig, EventData } from '../types/EventTypes';

type ExposureCallback = (data: EventData) => void;

interface ExposureRecord {
  startTime: number;
}

export class ExposureCollector {
  private config: Required<ExposureConfig>;
  private callback: ExposureCallback;
  private observer: IntersectionObserver | null = null;
  private exposedElements: Map<Element, ExposureRecord> = new Map();

  constructor(config: ExposureConfig, callback: ExposureCallback) {
    this.config = {
      enabled: config.enabled ?? true,
      selector: config.selector ?? ['[data-exposure]'],
      threshold: config.threshold ?? 500,
      thresholdRatio: config.thresholdRatio ?? 0.5,
    };
    this.callback = callback;
  }

  start(): void {
    if (!this.config.enabled) return;

    try {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          threshold: [0, this.config.thresholdRatio],
          rootMargin: '0px',
        }
      );

      const elements = document.querySelectorAll(this.config.selector.join(','));
      console.log(
        `[Exposure] Observing ${elements.length} elements with selector: ${this.config.selector.join(', ')}`
      );
      elements.forEach((el) => this.observer?.observe(el));

      // Observe dynamically added elements
      this.observeMutations();
    } catch (error) {
      console.warn('[Exposure] Failed to start:', error);
    }
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.exposedElements.clear();
  }

  /**
   * Observe DOM mutations to pick up dynamically added elements that match our selectors.
   */
  private observeMutations(): void {
    try {
      const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              for (const sel of this.config.selector) {
                if (node.matches(sel)) {
                  this.observer?.observe(node);
                }
                // Also check children
                node.querySelectorAll(sel).forEach((el) => {
                  this.observer?.observe(el);
                });
              }
            }
          }
        }
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch {
      // MutationObserver not available
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      const el = entry.target as HTMLElement;
      const trackId = el.dataset.exposure || el.dataset.trackId;

      const isVisible =
        entry.isIntersecting && entry.intersectionRatio >= this.config.thresholdRatio;

      if (isVisible) {
        // Element became visible — record start time if first exposure
        if (!this.exposedElements.has(el)) {
          this.exposedElements.set(el, { startTime: Date.now() });

          const spmData = this.extractSpmData(el);
          console.log(
            `[Exposure] Captured: ${trackId} (ratio: ${Math.round(entry.intersectionRatio * 100)}%)`
          );
          this.callback({
            elementId: trackId,
            elementType: el.tagName.toLowerCase(),
            elementText: el.textContent?.slice(0, 100) || '',
            exposureDuration: 0,
            exposureRatio: entry.intersectionRatio,
            ...spmData,
          });
        }
      } else {
        // Element left viewport — report duration if previously exposed
        const record = this.exposedElements.get(el);
        if (record) {
          const duration = Date.now() - record.startTime;
          if (duration >= this.config.threshold) {
            const spmData = this.extractSpmData(el);
            this.callback({
              elementId: trackId,
              elementType: el.tagName.toLowerCase(),
              elementText: el.textContent?.slice(0, 100) || '',
              exposureDuration: duration,
              exposureRatio: 0,
              ...spmData,
            });
          }
          this.exposedElements.delete(el);
        }
      }
    });
  }

  private extractSpmData(element: HTMLElement): { spmCode?: string; spmLevel?: number } {
    const spmAttr = element.dataset.trackSpm;
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
