import type {
  TrackerConfig,
  EventDTO,
  EventType,
  EventData,
  ContextData,
  ExperimentTag,
} from '../types/EventTypes';
import { PageCollector } from '../collectors/PageCollector';
import { ClickCollector } from '../collectors/ClickCollector';
import { ExposureCollector } from '../collectors/ExposureCollector';
import { ScrollCollector } from '../collectors/ScrollCollector';
import { SessionCollector } from '../collectors/SessionCollector';
import { StayCollector } from '../collectors/StayCollector';
import { ErrorCollector } from '../collectors/ErrorCollector';
import { EventQueue } from '../queue/EventQueue';
import { Sender } from '../sender/Sender';
import { GateFlowIntegration } from '../integration/GateFlowIntegration';

const SDK_VERSION = '1.0.0';
const IMMEDIATE_EVENT_TYPES: EventType[] = ['exposure', 'click'];

export type EventCallback = (event: EventDTO) => void;

interface Collector {
  start: () => void;
  stop: () => void;
}

export class Tracker {
  private config: Required<TrackerConfig>;
  private queue: EventQueue;
  private sender: Sender;
  private collectors: Collector[] = [];
  private gateFlow: GateFlowIntegration | null = null;
  private onEvent: EventCallback | null = null;

  constructor(config: TrackerConfig) {
    this.config = {
      endpoint: config.endpoint,
      appId: config.appId,
      autoTrack: config.autoTrack ?? {},
      batch: config.batch ?? { maxSize: 50, interval: 2000 },
      offline: config.offline ?? { enabled: true, maxQueueSize: 100 },
      debug: config.debug ?? false,
      gateFlow: config.gateFlow ?? { enabled: false },
    };

    this.queue = new EventQueue(this.config.offline);
    this.sender = new Sender(this.config.endpoint, this.queue);

    // GateFlow integration for userId + experiment tags
    if (this.config.gateFlow.enabled) {
      const gfEndpoint =
        this.config.gateFlow.userInitEndpoint ||
        this.config.endpoint;
      this.gateFlow = new GateFlowIntegration(gfEndpoint);
    }

    // Session collector (always enabled)
    const sessionCollector = new SessionCollector();
    this.collectors.push(sessionCollector);

    // Auto collectors
    if (this.config.autoTrack.pageView) {
      const pageConfig =
        typeof this.config.autoTrack.pageView === 'object'
          ? this.config.autoTrack.pageView
          : {};
      this.collectors.push(
        new PageCollector(pageConfig, (data) => this.track('page_view', data), this.config.endpoint)
      );
    }

    if (this.config.autoTrack.click) {
      const clickConfig =
        typeof this.config.autoTrack.click === 'object'
          ? this.config.autoTrack.click
          : { enabled: true };
      this.collectors.push(
        new ClickCollector({ enabled: true, ...clickConfig }, (data) => this.track('click', data))
      );
    }

    if (this.config.autoTrack.exposure) {
      const exposureConfig =
        typeof this.config.autoTrack.exposure === 'object'
          ? this.config.autoTrack.exposure
          : { enabled: true };
      this.collectors.push(
        new ExposureCollector(
          { enabled: true, threshold: 500, ...exposureConfig },
          (data) => this.track('exposure', data)
        )
      );
    }

    if (this.config.autoTrack.scroll) {
      const scrollConfig =
        typeof this.config.autoTrack.scroll === 'object'
          ? this.config.autoTrack.scroll
          : { enabled: true };
      this.collectors.push(
        new ScrollCollector(
          { enabled: true, thresholds: [25, 50, 75, 100], ...scrollConfig },
          (data) => this.track('scroll', data)
        )
      );
    }

    if (this.config.autoTrack.stay) {
      const stayConfig =
        typeof this.config.autoTrack.stay === 'object'
          ? this.config.autoTrack.stay
          : { enabled: true };
      this.collectors.push(
        new StayCollector(stayConfig, (data) => this.track('stay', data))
      );
    }

    if (this.config.autoTrack.error) {
      const errorConfig =
        typeof this.config.autoTrack.error === 'object'
          ? this.config.autoTrack.error
          : { enabled: true };
      this.collectors.push(
        new ErrorCollector(errorConfig, (data) => this.track('error', data))
      );
    }

    // Start sender
    this.sender.start(this.config.batch);
  }

  /**
   * Initialize the tracker. Starts all collectors and fetches GateFlow user context.
   */
  async init(): Promise<void> {
    console.log('[Tracker] Initializing with config:', {
      endpoint: this.config.endpoint,
      appId: this.config.appId,
      autoTrack: Object.keys(this.config.autoTrack),
      batch: this.config.batch,
      offline: this.config.offline,
      debug: !!this.config.debug,
      gateFlow: this.config.gateFlow.enabled,
    });

    // Fetch GateFlow user context (userId + experiment tags)
    if (this.gateFlow) {
      try {
        const ctx = await this.gateFlow.fetchUserContext();
        console.log('[Tracker] GateFlow user context loaded:', ctx.userId);
      } catch {
        console.warn('[Tracker] GateFlow user context fetch failed, continuing without');
      }
    }

    // Start all collectors
    this.collectors.forEach((c) => {
      try {
        console.log('[Tracker] Starting collector:', c.constructor.name);
        c.start();
      } catch (error) {
        console.warn('[Tracker] Failed to start collector:', c.constructor.name, error);
      }
    });

    // Network recovery: flush queue when back online
    window.addEventListener('online', () => {
      console.log('[Tracker] Network online, flushing queue');
      this.queue.flush(this.config.endpoint);
    });

    console.log('[Tracker] Initialization complete');
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /**
   * Track a standard event type with optional data.
   */
  track(eventType: EventType, data?: EventData): void {
    const event = this.buildEvent(eventType, data);
    console.log(`[Tracker] Event captured: ${eventType}`, event);

    // Notify debug listener
    if (this.onEvent) {
      this.onEvent(event);
    }

    // Record session activity
    this.getSessionCollector()?.recordActivity();

    if (IMMEDIATE_EVENT_TYPES.includes(eventType)) {
      this.queue.flushImmediate(event, this.config.endpoint).catch(() => {
        this.queue.enqueue(event);
      });
    } else {
      this.queue.enqueue(event);
    }
  }

  /**
   * Track a custom event with a free-form event type string.
   */
  trackCustom(eventType: string, data?: EventData): void {
    const event = this.buildEvent('custom', {
      ...data,
      tagName: eventType,
    });
    console.log(`[Tracker] Custom event: ${eventType}`, event);

    if (this.onEvent) {
      this.onEvent(event);
    }

    this.getSessionCollector()?.recordActivity();
    this.queue.enqueue(event);
  }

  /**
   * Identify the current user. Call after login or when user ID is known.
   */
  identify(userId: string): void {
    if (this.gateFlow) {
      this.gateFlow.identify(userId);
    }
  }

  /**
   * Manually set experiment tags for the current user.
   */
  setExperimentTags(tags: ExperimentTag[]): void {
    if (this.gateFlow) {
      this.gateFlow.setExperimentTags(tags);
    }
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | undefined {
    return this.getSessionCollector()?.getSessionInfo()?.sessionId;
  }

  /**
   * Subscribe to all tracked events (for DevTools or custom processing).
   */
  onTrack(callback: EventCallback): void {
    this.onEvent = callback;
  }

  /**
   * Immediately flush the event queue to the server.
   */
  async flush(): Promise<void> {
    await this.queue.flush(this.config.endpoint);
  }

  /**
   * Get the current event queue size.
   */
  getQueueSize(): number {
    return this.queue.size();
  }

  /**
   * Destroy the tracker, stopping all collectors and flushing remaining events.
   */
  destroy(): void {
    this.collectors.forEach((c) => {
      try {
        c.stop();
      } catch (error) {
        console.warn('[Tracker] Failed to stop collector:', c.constructor.name, error);
      }
    });
    this.sender.stop();
  }

  // ===================================================================
  // Internal
  // ===================================================================

  private buildEvent(eventType: EventType, data?: EventData): EventDTO {
    const sessionInfo = this.getSessionCollector()?.getSessionInfo();

    return {
      eventId: this.generateEventId(),
      eventType,
      userId: this.getUserId(),
      anonymousId: this.getAnonymousId(),
      timestamp: Date.now(),
      clientTime: Date.now(),
      platform: 'web',
      appVersion: this.config.appId,
      sdkVersion: SDK_VERSION,
      page: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
      },
      session: sessionInfo
        ? { sessionId: sessionInfo.sessionId, startTime: sessionInfo.startTime }
        : undefined,
      device: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
      },
      context: this.parseUTM(),
      experimentTags: this.getExperimentTags(),
      data,
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private getUserId(): string | undefined {
    if (this.gateFlow) {
      return this.gateFlow.getUserId();
    }
    // Fallback: check localStorage directly
    const stored = localStorage.getItem('gf_user_id');
    return stored || undefined;
  }

  private getExperimentTags(): ExperimentTag[] | undefined {
    if (this.gateFlow) {
      const tags = this.gateFlow.getExperimentTags();
      return tags.length > 0 ? tags : undefined;
    }
    // Fallback: check localStorage directly
    const stored = localStorage.getItem('gf_experiment_tags');
    if (stored) {
      try {
        const tags = JSON.parse(stored);
        return tags.length > 0 ? tags : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private getAnonymousId(): string {
    const key = 'gf_anonymous_id';
    let anonymousId = localStorage.getItem(key);
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      try {
        localStorage.setItem(key, anonymousId);
      } catch {
        // localStorage unavailable
      }
    }
    return anonymousId;
  }

  private getSessionCollector(): SessionCollector | undefined {
    return this.collectors.find((c) => c instanceof SessionCollector) as
      | SessionCollector
      | undefined;
  }

  private parseUTM(): ContextData {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        utmTerm: params.get('utm_term') || undefined,
        utmContent: params.get('utm_content') || undefined,
      };
    } catch {
      return {};
    }
  }
}

export default Tracker;
