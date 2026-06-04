interface SessionInfo {
  sessionId: string;
  startTime: number;
  lastActiveTime: number;
  eventCount: number;
}

export class SessionCollector {
  private sessionId: string;
  private startTime: number;
  private lastActiveTime: number;
  private eventCount: number = 0;
  private heartbeatTimer: number | null = null;

  private readonly TIMEOUT_MS = 30 * 60 * 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.lastActiveTime = this.startTime;
  }

  start(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.recordActivity();
      }
    }, 30000);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getSessionInfo(): SessionInfo {
    if (Date.now() - this.lastActiveTime > this.TIMEOUT_MS) {
      this.sessionId = this.generateSessionId();
      this.startTime = Date.now();
      this.lastActiveTime = this.startTime;
      this.eventCount = 0;
    }

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      lastActiveTime: this.lastActiveTime,
      eventCount: this.eventCount,
    };
  }

  recordActivity(): void {
    this.lastActiveTime = Date.now();
    this.eventCount++;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.recordActivity();
    }
  };
}
