import api from './api';
import type { EventLineage, LineageGraph } from '../types/lineage';

export const lineageApi = {
  listEvents: () =>
    api.get<EventLineage[]>('/v1/engineering/lineage/events').then((r) => r.data),

  getEventLineage: (eventKey: string) =>
    api.get<EventLineage>(`/v1/engineering/lineage/events/${encodeURIComponent(eventKey)}`).then((r) => r.data),

  getGraph: (eventKey: string) =>
    api.get<LineageGraph>(`/v1/engineering/lineage/events/${encodeURIComponent(eventKey)}/graph`).then((r) => r.data),
};
