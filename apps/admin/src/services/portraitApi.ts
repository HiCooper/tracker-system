import api from './api';

export interface PortraitDimension {
  label: string;
  value: string;
  count: number;
  pct: number;
}

export interface PortraitTag {
  name: string;
  users: number;
  pct: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PortraitCrowd {
  name: string;
  users: number;
  desc: string;
  ts: string;
}

export interface BasicPortrait {
  gender: PortraitDimension[];
  age: PortraitDimension[];
  region: PortraitDimension[];
  device: PortraitDimension[];
  network: PortraitDimension[];
  activePeriod: PortraitDimension[];
}

export interface TagOverview {
  totalTags: number;
  coverageRate: number;
  autoTags: number;
  customTags: number;
  tags: PortraitTag[];
}

export interface CrowdOverview {
  totalCrowds: number;
  maxCrowdSize: number;
  todayNew: number;
  running: number;
  crowds: PortraitCrowd[];
}

const BASE = '/v1/portrait';

export const portraitApi = {
  getBasicPortrait: (params: { startTime: string; endTime: string }) =>
    api.get<BasicPortrait>(`${BASE}/basic`, { params }).then((r) => r.data),

  getTagOverview: (params: { startTime: string; endTime: string }) =>
    api.get<TagOverview>(`${BASE}/tags`, { params }).then((r) => r.data),

  getCrowdOverview: () =>
    api.get<CrowdOverview>(`${BASE}/crowds`).then((r) => r.data),
};
