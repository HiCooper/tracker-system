import { create } from 'zustand';
import { propertyApi } from '../services/propertyApi';
import type { PropertyVO, CreatePropertyRequest } from '../types/property';

interface PropertyState {
  properties: PropertyVO[];
  loading: boolean;
  selectedEventId: number | null;
  fetchProperties: (eventId: number) => Promise<void>;
  create: (data: CreatePropertyRequest) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setSelectedEventId: (id: number | null) => void;
}

export const usePropertyStore = create<PropertyState>((set, get) => ({
  properties: [],
  loading: false,
  selectedEventId: null,

  fetchProperties: async (eventId: number) => {
    set({ loading: true, selectedEventId: eventId });
    try {
      const data = await propertyApi.listByEventId(eventId);
      set({ properties: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  create: async (data: CreatePropertyRequest) => {
    await propertyApi.create(data);
    const { selectedEventId } = get();
    if (selectedEventId) {
      await get().fetchProperties(selectedEventId);
    }
  },

  remove: async (id: number) => {
    await propertyApi.remove(id);
    const { selectedEventId } = get();
    if (selectedEventId) {
      await get().fetchProperties(selectedEventId);
    }
  },

  setSelectedEventId: (id: number | null) => {
    set({ selectedEventId: id });
  },
}));
