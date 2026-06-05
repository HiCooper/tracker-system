export interface SpmApp {
  id: number;
  appCode: string;
  appName: string;
  description: string;
  pageCount: number;
  createdAt: string;
}

export interface SpmPage {
  id: number;
  appId: number;
  appCode: string;
  pageCode: string;
  pageName: string;
  blockCount: number;
  createdAt: string;
}

export interface SpmBlock {
  id: number;
  pageId: number;
  blockCode: string;
  blockName: string;
  functionCount: number;
  createdAt: string;
}

export interface SpmFunction {
  id: number;
  blockId: number;
  funcCode: string;
  funcName: string;
  createdAt: string;
}
