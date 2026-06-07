import { create } from 'zustand';
import type { DebugEvent, DebugEventStats } from '../types/debug';

interface DebugState {
  events: DebugEvent[];
  paused: boolean;
  connected: boolean;
  filter: { eventType?: string; userId?: string };

  addEvent: (event: DebugEvent) => void;
  clearEvents: () => void;
  setPaused: (p: boolean) => void;
  setConnected: (c: boolean) => void;
  setFilter: (f: { eventType?: string; userId?: string }) => void;
  getFilteredEvents: () => DebugEvent[];
  getStats: () => DebugEventStats;
}

let nextId = 1;

export function generateMockEvent(overrides?: Partial<DebugEvent>): DebugEvent {
  const types = ['page_view', 'click', 'exposure', 'scroll', 'custom'];
  const pages = ['/home', '/product/123', '/cart', '/checkout', '/user/profile', '/search?q=phone'];
  const users = ['user_001', 'user_002', 'user_003', 'anon_abc', 'anon_def'];
  const spms = ['a_web.b_home.c_banner', 'a_web.b_product.c_action', 'a_web.b_cart.c_checkout'];

  return {
    eventId: `evt_${Date.now()}_${nextId++}`,
    eventType: types[Math.floor(Math.random() * types.length)],
    timestamp: new Date().toISOString(),
    userId: users[Math.floor(Math.random() * users.length)],
    anonymousId: `anon_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: `sess_${Math.random().toString(36).slice(2, 10)}`,
    platform: ['web', 'mobile'][Math.floor(Math.random() * 2)],
    pageUrl: pages[Math.floor(Math.random() * pages.length)],
    spmCode: spms[Math.floor(Math.random() * spms.length)],
    elementId: Math.random() > 0.5 ? `el_${Math.floor(Math.random() * 100)}` : undefined,
    elementText: Math.random() > 0.5 ? ['购买', '加入购物车', '搜索', '返回首页'][Math.floor(Math.random() * 4)] : undefined,
    properties: { price: Math.floor(Math.random() * 1000), currency: 'CNY' },
    ...overrides,
  };
}

export const useDebugStore = create<DebugState>((set, get) => ({
  events: [],
  paused: false,
  connected: true,
  filter: {},

  addEvent: (event) => {
    if (get().paused) return;
    set((s) => ({ events: [...s.events.slice(-500), event] }));
  },

  clearEvents: () => set({ events: [] }),

  setPaused: (paused) => set({ paused }),

  setConnected: (connected) => set({ connected }),

  setFilter: (filter) => set({ filter }),

  getFilteredEvents: () => {
    const { events, filter } = get();
    return events.filter((e) => {
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.userId && e.userId !== filter.userId) return false;
      return true;
    });
  },

  getStats: () => {
    const events = get().getFilteredEvents();
    const byType: Record<string, number> = {};
    events.forEach((e) => {
      byType[e.eventType] = (byType[e.eventType] || 0) + 1;
    });
    return { total: events.length, byType };
  },
}));
