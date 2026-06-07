export interface DebugEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  userId: string;
  anonymousId: string;
  sessionId: string;
  platform: string;
  pageUrl: string;
  spmCode: string;
  elementId?: string;
  elementText?: string;
  properties: Record<string, unknown>;
}

export interface DebugSession {
  deviceId: string;
  userId: string;
  platform: string;
  startTime: string;
  eventCount: number;
}

export interface DebugFilter {
  deviceId?: string;
  userId?: string;
  eventType?: string;
}

export interface DebugEventStats {
  total: number;
  byType: Record<string, number>;
}
