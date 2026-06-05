import api from './api';
import type { PropertyVO, CreatePropertyRequest } from '../types/property';

export const propertyApi = {
  listByEventId: (eventId: number) =>
    api.get<PropertyVO[]>(`/v1/events/${eventId}/properties`).then((r) => r.data),

  create: (data: CreatePropertyRequest) =>
    api.post<PropertyVO>('/v1/properties', data).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/v1/properties/${id}`).then((r) => r.data),
};
