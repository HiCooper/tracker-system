import type { ClickConfig, EventData } from '../types/EventTypes';

type ClickCallback = (data: EventData) => void;

export class ClickCollector {
  private config: Required<ClickConfig>;
  private callback: ClickCallback;
  private boundHandler: (e: Event) => void;
  private throttleTimer: number | null = null;
  private lastClickTime: number = 0;

  // Throttle: 300ms
  private readonly THROTTLE_MS = 300;

  constructor(config: ClickConfig, callback: ClickCallback) {
    this.config = {
      enabled: config.enabled ?? true,
      selector: config.selector ?? ['[data-track]', 'button', 'a', 'input[type="submit"]'],
      excludeSelector: config.excludeSelector ?? [],
      trackText: config.trackText ?? true,
      trackPosition: config.trackPosition ?? true,
    };
    this.callback = callback;
    this.boundHandler = this.handleClick.bind(this);
  }

  start(): void {
    if (!this.config.enabled) return;
    document.addEventListener('click', this.boundHandler, true);
  }

  stop(): void {
    document.removeEventListener('click', this.boundHandler, true);
  }

  private handleClick(e: Event): void {
    const mouseEvent = e as MouseEvent;
    const target = e.target as HTMLElement;
    if (!target) return;

    // Check if element should be tracked
    if (!this.shouldTrack(target)) return;

    // Throttle
    const now = Date.now();
    if (now - this.lastClickTime < this.THROTTLE_MS) return;
    this.lastClickTime = now;

    // Extract SPM info from data-track-spm attribute
    const spmData = this.extractSpmData(target);

    // Build click data
    const rect = target.getBoundingClientRect();
    const data: EventData = {
      elementId: target.dataset.track || target.id,
      elementType: target.tagName.toLowerCase(),
      elementText: this.config.trackText ? (target.textContent?.slice(0, 100) || '') : undefined,
      ...spmData,
    };

    if (this.config.trackPosition) {
      data.clickX = Math.round(mouseEvent.clientX - rect.left);
      data.clickY = Math.round(mouseEvent.clientY - rect.top);
    }

    this.callback(data);
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

  private shouldTrack(element: HTMLElement): boolean {
    // Check if element or its parent matches selector
    for (const sel of this.config.selector) {
      if (element.matches(sel) || element.closest(sel)) {
        // Check exclude
        for (const excl of this.config.excludeSelector) {
          if (element.matches(excl) || element.closest(excl)) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }
}
