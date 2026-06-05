/** Property data type */
export type PropertyDataType = 'string' | 'number' | 'boolean' | 'date';

/** Property view object (response) */
export interface PropertyVO {
  id: number;
  eventId: number;
  eventName: string;
  propKey: string;
  propName: string;
  dataType: PropertyDataType;
  description: string;
  createdAt: string;
}

/** Create property request */
export interface CreatePropertyRequest {
  eventId: number;
  propKey: string;
  propName: string;
  dataType?: PropertyDataType;
  description?: string;
}
