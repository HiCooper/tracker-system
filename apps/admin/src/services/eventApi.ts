import api from './api';
import type { EventVO, CreateEventRequest, UpdateEventRequest, EventListParams } from '../types/event';
import type { PageData } from '../types/api';

export const eventApi = {
  list: (params: EventListParams = {}) =>
    api.get<PageData<EventVO>>('/v1/events', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<EventVO>(`/v1/events/${id}`).then((r) => r.data),

  create: (data: CreateEventRequest) =>
    api.post<EventVO>('/v1/events', data).then((r) => r.data),

  update: (id: number, data: UpdateEventRequest) =>
    api.put<EventVO>(`/v1/events/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/v1/events/${id}`).then((r) => r.data),
};
