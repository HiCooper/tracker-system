import api from './api';

export interface PropertyDef {
  id: number;
  key: string;
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  required: boolean;
  enumValues?: string[];
  eventKey: string;
}

export const propertyApi = {
  list: (eventKey?: string) =>
    api.get<PropertyDef[]>('/v1/setup/properties', { params: { eventKey } }).then((r) => r.data),
  get: (id: number) => api.get<PropertyDef>(`/v1/setup/properties/${id}`).then((r) => r.data),
  create: (data: Partial<PropertyDef>) =>
    api.post<PropertyDef>('/v1/setup/properties', data).then((r) => r.data),
  update: (id: number, data: Partial<PropertyDef>) =>
    api.put<PropertyDef>(`/v1/setup/properties/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/v1/setup/properties/${id}`).then((r) => r.data),
};
