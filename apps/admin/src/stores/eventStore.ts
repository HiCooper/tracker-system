import { create } from 'zustand';
import { eventApi } from '../services/eventApi';
import type { EventVO, CreateEventRequest, UpdateEventRequest } from '../types/event';

interface EventState {
  events: EventVO[];
  loading: boolean;
  total: number;
  page: number;
  size: number;
  keyword: string;
  category: string;
  fetchList: () => Promise<void>;
  create: (data: CreateEventRequest) => Promise<EventVO>;
  update: (id: number, data: UpdateEventRequest) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  setKeyword: (keyword: string) => void;
  setCategory: (category: string) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  loading: false,
  total: 0,
  page: 1,
  size: 20,
  keyword: '',
  category: '',

  fetchList: async () => {
    const { page, size, keyword, category } = get();
    set({ loading: true });
    try {
      const data = await eventApi.list({ page, size, keyword, category: category || undefined });
      set({ events: data.list, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  create: async (data: CreateEventRequest) => {
    const event = await eventApi.create(data);
    await get().fetchList();
    return event;
  },

  update: async (id: number, data: UpdateEventRequest) => {
    await eventApi.update(id, data);
    await get().fetchList();
  },

  remove: async (id: number) => {
    await eventApi.remove(id);
    await get().fetchList();
  },

  setPage: (page: number) => {
    set({ page });
  },

  setSize: (size: number) => {
    set({ size, page: 1 });
  },

  setKeyword: (keyword: string) => {
    set({ keyword, page: 1 });
  },

  setCategory: (category: string) => {
    set({ category, page: 1 });
  },
}));
