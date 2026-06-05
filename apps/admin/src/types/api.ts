export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
