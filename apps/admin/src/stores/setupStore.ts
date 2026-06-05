import { create } from 'zustand';
import { setupApi } from '../services/setupApi';
import type { SpmApp, SpmPage, SpmBlock, SpmFunction } from '../types/spm';

interface SetupState {
  apps: SpmApp[];
  pages: SpmPage[];
  blocks: SpmBlock[];
  functions: SpmFunction[];
  loading: boolean;
  currentApp: SpmApp | null;
  currentPage: SpmPage | null;
  currentBlock: SpmBlock | null;

  fetchApps: () => Promise<void>;
  createApp: (data: { appName: string; appCode: string; description?: string }) => Promise<void>;
  deleteApp: (id: number) => Promise<void>;
  fetchApp: (id: number) => Promise<void>;

  fetchPages: (appId: number) => Promise<void>;
  createPage: (appId: number, data: { pageName: string; pageCode: string }) => Promise<void>;
  deletePage: (id: number) => Promise<void>;

  fetchBlocks: (pageId: number) => Promise<void>;
  createBlock: (pageId: number, data: { blockName: string; blockCode: string }) => Promise<void>;
  deleteBlock: (id: number) => Promise<void>;

  fetchFunctions: (blockId: number) => Promise<void>;
  createFunction: (blockId: number, data: { funcName: string; funcCode: string }) => Promise<void>;
  deleteFunction: (id: number) => Promise<void>;
}

export const useSetupStore = create<SetupState>((set) => ({
  apps: [], pages: [], blocks: [], functions: [],
  loading: false, currentApp: null, currentPage: null, currentBlock: null,

  fetchApps: async () => {
    set({ loading: true });
    const data = await setupApi.listApps();
    set({ apps: data, loading: false });
  },

  createApp: async (d) => {
    await setupApi.createApp(d);
    set(s => ({ apps: [...s.apps, { id: Date.now(), ...d, description: d.description || '', pageCount: 0, createdAt: new Date().toISOString() }] }));
  },

  deleteApp: async (id) => {
    await setupApi.deleteApp(id);
    set(s => ({ apps: s.apps.filter(a => a.id !== id) }));
  },

  fetchApp: async (id) => {
    const data = await setupApi.getApp(id);
    set({ currentApp: data });
  },

  fetchPages: async (appId) => {
    set({ loading: true });
    const data = await setupApi.listPages(appId);
    set({ pages: data, loading: false });
  },

  createPage: async (appId, d) => {
    const data = await setupApi.createPage(appId, d);
    set(s => ({ pages: [...s.pages, data] }));
  },

  deletePage: async (id) => {
    await setupApi.deletePage(id);
    set(s => ({ pages: s.pages.filter(p => p.id !== id) }));
  },

  fetchBlocks: async (pageId) => {
    set({ loading: true });
    const data = await setupApi.listBlocks(pageId);
    set({ blocks: data, loading: false });
  },

  createBlock: async (pageId, d) => {
    const data = await setupApi.createBlock(pageId, d);
    set(s => ({ blocks: [...s.blocks, data] }));
  },

  deleteBlock: async (id) => {
    await setupApi.deleteBlock(id);
    set(s => ({ blocks: s.blocks.filter(b => b.id !== id) }));
  },

  fetchFunctions: async (blockId) => {
    set({ loading: true });
    const data = await setupApi.listFunctions(blockId);
    set({ functions: data, loading: false });
  },

  createFunction: async (blockId, d) => {
    const data = await setupApi.createFunction(blockId, d);
    set(s => ({ functions: [...s.functions, data] }));
  },

  deleteFunction: async (id) => {
    await setupApi.deleteFunction(id);
    set(s => ({ functions: s.functions.filter(f => f.id !== id) }));
  },
}));
