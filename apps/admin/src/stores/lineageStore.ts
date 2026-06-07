import { create } from 'zustand';
import { lineageApi } from '../services/lineageApi';
import type { EventLineage, LineageGraph } from '../types/lineage';

interface LineageState {
  events: EventLineage[];
  currentLineage: EventLineage | null;
  currentGraph: LineageGraph | null;
  loading: boolean;

  fetchEvents: () => Promise<void>;
  fetchLineage: (eventKey: string) => Promise<void>;
  selectEvent: (eventKey: string) => void;
}

export const useLineageStore = create<LineageState>((set, get) => ({
  events: [],
  currentLineage: null,
  currentGraph: null,
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    const data = await lineageApi.listEvents();
    set({ events: data, loading: false });
  },

  fetchLineage: async (eventKey) => {
    set({ loading: true });
    const [lineage, graph] = await Promise.all([
      lineageApi.getEventLineage(eventKey),
      lineageApi.getGraph(eventKey),
    ]);
    set({ currentLineage: lineage, currentGraph: graph, loading: false });
  },

  selectEvent: (eventKey) => {
    const cached = get().events.find((e) => e.eventKey === eventKey);
    if (cached) set({ currentLineage: cached });
    get().fetchLineage(eventKey);
  },
}));
