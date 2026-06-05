/** SPM view object (response) */
export interface SpmVO {
  id: number;
  spmCode: string;
  spmName: string;
  spmaLabel: string;
  spmbLabel: string;
  spmcLabel: string;
  spmdLabel: string;
  description: string;
  createdAt: string;
}

/** Create SPM request */
export interface CreateSpmRequest {
  spmCode: string;
  spmName: string;
  spmaLabel?: string;
  spmbLabel?: string;
  spmcLabel?: string;
  spmdLabel?: string;
  description?: string;
}

/** Update SPM request */
export interface UpdateSpmRequest {
  spmName?: string;
  spmaLabel?: string;
  spmbLabel?: string;
  spmcLabel?: string;
  spmdLabel?: string;
  description?: string;
}
