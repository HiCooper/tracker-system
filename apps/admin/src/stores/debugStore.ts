import { create } from 'zustand';
import type { DebugEvent } from '../types/debug';

export type SessionStatus = 'idle' | 'creating' | 'waiting' | 'connected' | 'closed';

interface DebugState {
  sessionId: string | null;
  sessionStatus: SessionStatus;
  appCode: string;
  events: DebugEvent[];
  paused: boolean;
  connected: boolean;
  ws: WebSocket | null;

  setAppCode: (code: string) => void;
  createSession: (appCode: string) => Promise<void>;
  closeSession: () => void;
  addEvent: (event: DebugEvent) => void;
  clearEvents: () => void;
  setPaused: (p: boolean) => void;
  getFilteredEvents: () => DebugEvent[];
  getStats: () => { total: number; byType: Record<string, number> };
}

const WS_BASE = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;

export const useDebugStore = create<DebugState>((set, get) => ({
  sessionId: null,
  sessionStatus: 'idle',
  appCode: '',
  events: [],
  paused: false,
  connected: false,
  ws: null,

  setAppCode: (code) => set({ appCode: code }),

  createSession: async (appCode) => {
    set({ sessionStatus: 'creating' });
    try {
      const resp = await fetch('/api/v1/engineering/debug/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appCode }),
      });
      const json = await resp.json();
      const sessionId = json.data.sessionId;
      if (!sessionId) throw new Error('No sessionId');

      set({ sessionId, sessionStatus: 'waiting', appCode });

      const wsUrl = `${WS_BASE}/ws/debug/view/${sessionId}`;
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => set({ connected: true });
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === 'device_connected') {
            set({ sessionStatus: 'connected' });
          } else if (data.type === 'session_closed' || data.type === 'device_disconnected') {
            set({ sessionStatus: 'waiting' });
          } else if (data.type !== 'viewer_ready') {
            get().addEvent({
              eventId: data.eventId || `evt_${Date.now()}`,
              eventType: data.eventType || 'unknown',
              timestamp: data._receivedAt ? new Date(data._receivedAt).toISOString() : new Date().toISOString(),
              userId: data.userId || '',
              anonymousId: data.anonymousId || '',
              sessionId: data.sessionId || sessionId,
              platform: data.platform || '',
              pageUrl: data.pageUrl || '',
              spmCode: data.spma || data.spmCode || '',
              elementId: data.elementId,
              elementText: data.elementText,
              properties: data.properties || data,
            });
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => set({ connected: false });
      ws.onerror = () => set({ connected: false });
      set({ ws });
    } catch (err) {
      set({ sessionStatus: 'idle' });
      throw err;
    }
  },

  closeSession: () => {
    const { sessionId, ws } = get();
    if (ws) { ws.close(); set({ ws: null }); }
    if (sessionId) {
      fetch(`/api/v1/engineering/debug/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    }
    set({ sessionId: null, sessionStatus: 'closed', connected: false });
  },

  addEvent: (event) => {
    if (get().paused) return;
    set((s) => ({ events: [...s.events.slice(-500), event] }));
  },

  clearEvents: () => set({ events: [] }),
  setPaused: (paused) => set({ paused }),

  getFilteredEvents: () => get().events,

  getStats: () => {
    const events = get().events;
    const byType: Record<string, number> = {};
    events.forEach((e) => {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    });
    return { total: events.length, byType };
  },
}));
