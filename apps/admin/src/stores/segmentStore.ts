import { create } from 'zustand';
import { segmentApi, type TagDef, type CrowdDef } from '../services/segmentApi';

interface SegmentState {
  tags: TagDef[];
  crowds: CrowdDef[];
  loading: boolean;

  fetchTags: (params?: { search?: string; category?: string }) => Promise<void>;
  createTag: (data: Partial<TagDef>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  fetchCrowds: () => Promise<void>;
  createCrowd: (data: Partial<CrowdDef>) => Promise<void>;
  deleteCrowd: (id: string) => Promise<void>;
}

export const useSegmentStore = create<SegmentState>((set) => ({
  tags: [],
  crowds: [],
  loading: false,

  fetchTags: async (params) => {
    set({ loading: true });
    const tags = await segmentApi.listTags(params);
    set({ tags, loading: false });
  },

  createTag: async (data) => {
    const tag = await segmentApi.createTag(data);
    set((s) => ({ tags: [...s.tags, tag] }));
  },

  deleteTag: async (id) => {
    await segmentApi.deleteTag(id);
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
  },

  fetchCrowds: async () => {
    const crowds = await segmentApi.listCrowds();
    set({ crowds });
  },

  createCrowd: async (data) => {
    const crowd = await segmentApi.createCrowd(data);
    set((s) => ({ crowds: [...s.crowds, crowd] }));
  },

  deleteCrowd: async (id) => {
    await segmentApi.deleteCrowd(id);
    set((s) => ({ crowds: s.crowds.filter((c) => c.id !== id) }));
  },
}));
