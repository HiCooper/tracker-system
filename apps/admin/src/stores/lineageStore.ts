import { create } from 'zustand';
import { lineageApi } from '../services/lineageApi';
import { message } from 'antd';
import type { EventLineage, LineageGraph } from '../types/lineage';

interface LineageState {
  events: EventLineage[];
  currentLineage: EventLineage | null;
  currentGraph: LineageGraph | null;
  loading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  selectEvent: (eventKey: string) => void;
}

export const useLineageStore = create<LineageState>((set, get) => {
  let fetchId = 0; // race-condition guard

  return {
    events: [],
    currentLineage: null,
    currentGraph: null,
    loading: false,
    error: null,

    fetchEvents: async () => {
      set({ loading: true, error: null });
      try {
        const data = await lineageApi.listEvents();
        set({ events: data, loading: false });
      } catch (err: any) {
        set({ loading: false, error: err.message || '加载失败' });
        message.error(err.message || '加载事件列表失败');
      }
    },

    selectEvent: (eventKey) => {
      const current = get().currentLineage;
      // Skip if already viewing this event
      if (current?.eventKey === eventKey) return;

      // Set loading but DON'T set stale cache — prevents flash
      set({ loading: true, currentGraph: null });

      const id = ++fetchId;
      Promise.all([
        lineageApi.getEventLineage(eventKey),
        lineageApi.getGraph(eventKey),
      ]).then(([lineage, graph]) => {
        // Only apply if this is the latest request
        if (id === fetchId) {
          set({ currentLineage: lineage, currentGraph: graph, loading: false });
        }
      }).catch((err) => {
        if (id === fetchId) {
          set({ loading: false, error: err.message || '加载失败' });
          message.error(err.message || '加载血缘数据失败');
        }
      });
    },
  };
});