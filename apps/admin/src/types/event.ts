/** Event category enum */
export type EventCategory = 'page_view' | 'click' | 'exposure' | 'custom';

/** Event view object (response) */
export interface EventVO {
  id: number;
  eventKey: string;
  eventName: string;
  description: string;
  category: EventCategory;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/** Create event request */
export interface CreateEventRequest {
  eventKey: string;
  eventName: string;
  description?: string;
  category?: EventCategory;
  status?: number;
}

/** Update event request */
export interface UpdateEventRequest {
  eventName?: string;
  description?: string;
  category?: EventCategory;
  status?: number;
}

/** Event list query params */
export interface EventListParams {
  page?: number;
  size?: number;
  keyword?: string;
  category?: string;
  status?: number;
}
