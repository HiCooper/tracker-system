import { create } from 'zustand';
import { portraitApi, type PortraitDimension, type PortraitTag, type PortraitCrowd } from '../services/portraitApi';

interface PortraitState {
  basicPortrait: {
    gender: PortraitDimension[];
    age: PortraitDimension[];
    region: PortraitDimension[];
    device: PortraitDimension[];
    network: PortraitDimension[];
    activePeriod: PortraitDimension[];
  } | null;
  tags: { totalTags: number; coverageRate: number; autoTags: number; customTags: number; tagList: PortraitTag[] } | null;
  crowds: { totalCrowds: number; maxCrowdSize: number; todayNew: number; running: number; crowdList: PortraitCrowd[] } | null;
  loading: boolean;

  fetchBasicPortrait: (params: { startTime: string; endTime: string }) => Promise<void>;
  fetchTagOverview: (params: { startTime: string; endTime: string }) => Promise<void>;
  fetchCrowdOverview: () => Promise<void>;
}

export const usePortraitStore = create<PortraitState>((set) => ({
  basicPortrait: null,
  tags: null,
  crowds: null,
  loading: false,

  fetchBasicPortrait: async (params) => {
    set({ loading: true });
    try {
      const basic = await portraitApi.getBasicPortrait(params);
      set({ basicPortrait: basic, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTagOverview: async (params) => {
    set({ loading: true });
    try {
      const tagOverview = await portraitApi.getTagOverview(params);
      set({
        tags: {
          totalTags: tagOverview.totalTags,
          coverageRate: tagOverview.coverageRate,
          autoTags: tagOverview.autoTags,
          customTags: tagOverview.customTags,
          tagList: tagOverview.tags,
        },
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchCrowdOverview: async () => {
    set({ loading: true });
    try {
      const crowdOverview = await portraitApi.getCrowdOverview();
      set({
        crowds: {
          totalCrowds: crowdOverview.totalCrowds,
          maxCrowdSize: crowdOverview.maxCrowdSize,
          todayNew: crowdOverview.todayNew,
          running: crowdOverview.running,
          crowdList: crowdOverview.crowds,
        },
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));
