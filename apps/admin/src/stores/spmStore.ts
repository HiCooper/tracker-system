import { create } from 'zustand';
import { spmApi } from '../services/spmApi';
import type { SpmVO, CreateSpmRequest, UpdateSpmRequest } from '../types/spm';

interface SpmState {
  spms: SpmVO[];
  loading: boolean;
  total: number;
  page: number;
  size: number;
  keyword: string;
  fetchList: () => Promise<void>;
  create: (data: CreateSpmRequest) => Promise<void>;
  update: (id: number, data: UpdateSpmRequest) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  setKeyword: (keyword: string) => void;
}

export const useSpmStore = create<SpmState>((set, get) => ({
  spms: [],
  loading: false,
  total: 0,
  page: 1,
  size: 20,
  keyword: '',

  fetchList: async () => {
    const { page, size, keyword } = get();
    set({ loading: true });
    try {
      const data = await spmApi.list({ page, size, keyword: keyword || undefined });
      set({ spms: data.list, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  create: async (data: CreateSpmRequest) => {
    await spmApi.create(data);
    await get().fetchList();
  },

  update: async (id: number, data: UpdateSpmRequest) => {
    await spmApi.update(id, data);
    await get().fetchList();
  },

  remove: async (id: number) => {
    await spmApi.remove(id);
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
}));
