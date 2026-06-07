export type PlanStatus = 'draft' | 'reviewing' | 'approved' | 'implementing' | 'verified' | 'online' | 'rejected';

export interface PlanProperty {
  propKey: string;
  propName: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
}

export interface PlanEvent {
  eventKey: string;
  eventName: string;
  category: 'page_view' | 'click' | 'exposure' | 'custom';
  description: string;
  properties: PlanProperty[];
  spmCode?: string;
}

export interface TrackingPlan {
  id: number;
  planName: string;
  appId: number;
  appName: string;
  appVersion: string;
  status: PlanStatus;
  events: PlanEvent[];
  submitter: string;
  reviewer?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  planName: string;
  appId: number;
  appVersion: string;
  events: PlanEvent[];
}

export interface UpdatePlanRequest {
  planName?: string;
  appVersion?: string;
  events?: PlanEvent[];
}

export interface ReviewPlanRequest {
  action: 'approve' | 'reject';
  comment?: string;
}
