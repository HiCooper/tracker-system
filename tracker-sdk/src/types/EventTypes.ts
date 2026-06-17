export interface ExperimentTag {
  expId: string;
  variant: string;
  layer: string;
}

export interface EventDTO {
  eventId: string;
  eventType: string;
  userId?: string;
  anonymousId?: string;
  timestamp: number;
  clientTime?: number;
  platform?: string;
  appVersion?: string;
  sdkVersion?: string;
  page?: PageData;
  session?: SessionData;
  device?: DeviceData;
  context?: ContextData;
  data?: EventData;
  experimentTags?: ExperimentTag[];
}

export interface PageData {
  url: string;
  title?: string;
  referrer?: string;
}

export interface SessionData {
  sessionId: string;
  startTime?: number;
}

export interface DeviceData {
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
}

export interface ContextData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface EventData {
  scrollDepth?: number;
  stayDuration?: number;
  elementId?: string;
  elementType?: string;
  elementText?: string;
  clickX?: number;
  clickY?: number;
  exposureDuration?: number;
  exposureRatio?: number;
  spmCode?: string;
  spmLevel?: number;
  errorMessage?: string;
  errorStack?: string;
  errorType?: string;
  tagName?: string;
  [key: string]: unknown;
}

export interface TrackerConfig {
  appId: string;
  /**
   * Base URL of the tracker server, e.g. `https://tracker.example.com`.
   * The SDK appends the collect path (`/api/v1/collect`) automatically.
   * A full collect URL is also tolerated for backward compatibility.
   */
  serverUrl: string;
  /**
   * Pre-obtained JWT SDK token (from tracker-admin).
   * The application backend obtains this token with its apiKey and injects
   * it into the page. This is the recommended production approach — do NOT
   * embed apiKey/appKey in browser code.
   *
   * When provided, the SDK sends it as the `X-Sdk-Token` header on every
   * collect request.  The server requires this header and returns 401
   * without it.
   */
  sdkToken?: string;
  /**
   * Application key for auto-authentication.  For development/demo use
   * only — embedding appKey in browser code exposes it to users.
   * When provided (and sdkToken is absent), the SDK will call
   * POST /api/v1/collect/auth to exchange it for a JWT token.
   */
  appKey?: string;
  /**
   * Client identifier for multi-tenant tracking, e.g. `"web-app"`,
   * `"order-service"`.  Sent in the collect request body so the server
   * can partition events by source.  Matches the Java SDK `clientId`.
   */
  clientId?: string;
  autoTrack?: AutoTrackConfig;
  batch?: BatchConfig;
  offline?: OfflineConfig;
  debug?: boolean | DebugConfig;
  gateFlow?: GateFlowConfig;
}

export interface AutoTrackConfig {
  pageView?: boolean | PageViewConfig;
  click?: boolean | ClickConfig;
  exposure?: boolean | ExposureConfig;
  scroll?: boolean | ScrollConfig;
  stay?: boolean | StayConfig;
  error?: boolean | ErrorConfig;
}

export interface PageViewConfig {
  SPA?: boolean;
  referrer?: boolean;
}

export interface ClickConfig {
  enabled?: boolean;
  selector?: string[];
  excludeSelector?: string[];
  trackText?: boolean;
  trackPosition?: boolean;
}

export interface ExposureConfig {
  enabled?: boolean;
  selector?: string[];
  threshold?: number;
  thresholdRatio?: number;
}

export interface ScrollConfig {
  enabled?: boolean;
  thresholds?: number[];
  throttle?: number;
}

export interface StayConfig {
  enabled?: boolean;
  threshold?: number;
}

export interface ErrorConfig {
  enabled?: boolean;
  dedup?: boolean;
}

export interface BatchConfig {
  maxSize?: number;
  interval?: number;
}

export interface OfflineConfig {
  enabled?: boolean;
  maxQueueSize?: number;
}

export interface DebugConfig {
  enabled?: boolean;
  maxLogEntries?: number;
}

export interface GateFlowConfig {
  enabled?: boolean;
  userInitEndpoint?: string;
}

export type EventType =
  | 'page_view'
  | 'click'
  | 'exposure'
  | 'scroll'
  | 'stay'
  | 'error'
  | 'custom'
  | 'session_start'
  | 'session_end'
  | 'session_heartbeat'
  | '$identify';

// ── Wire format (aligns with server EventRequest / EventResponse) ──

/** Request body for POST /api/v1/collect.  Mirrors Java SDK CollectRequest. */
export interface CollectRequest {
  events: EventDTO[];
  clientId?: string;
}

/** Response body from POST /api/v1/collect.  Mirrors server EventResponse. */
export interface CollectResponse {
  code: number;
  message: string;
  data?: {
    accepted: number;
    duplicate: number;
    rejected: number;
    dlq: number;
  };
}
