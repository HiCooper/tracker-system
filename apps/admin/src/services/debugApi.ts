import api from './api';
import type { DebugSession } from '../types/debug';

export const debugApi = {
  createSession: (params: { deviceId?: string; userId?: string }) =>
    api.post<DebugSession>('/v1/engineering/debug/sessions', params).then((r) => r.data),

  endSession: (sessionId: string) =>
    api.delete(`/v1/engineering/debug/sessions/${sessionId}`).then((r) => r.data),
};
