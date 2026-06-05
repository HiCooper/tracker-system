import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AppListPage } from './pages/tracker/setup/AppListPage';
import { PageListPage } from './pages/tracker/setup/PageListPage';
import { BlockListPage } from './pages/tracker/setup/BlockListPage';
import { FunctionListPage } from './pages/tracker/setup/FunctionListPage';
import { AnalysisAppPage } from './pages/tracker/analysis/AnalysisAppPage';
import { AnalysisPagePage } from './pages/tracker/analysis/AnalysisPagePage';
import { AnalysisBlockPage } from './pages/tracker/analysis/AnalysisBlockPage';
import { AnalysisFunctionPage } from './pages/tracker/analysis/AnalysisFunctionPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/tracker/setup" replace /> },
      // SPM Setup
      { path: 'tracker/setup', element: <AppListPage /> },
      { path: 'tracker/setup/:appId', element: <PageListPage /> },
      { path: 'tracker/setup/:appId/:pageId', element: <BlockListPage /> },
      { path: 'tracker/setup/:appId/:pageId/:blockId', element: <FunctionListPage /> },
      // Analysis
      { path: 'tracker/analysis', element: <AnalysisAppPage /> },
      { path: 'tracker/analysis/:appCode', element: <AnalysisPagePage /> },
      { path: 'tracker/analysis/:appCode/:pageCode', element: <AnalysisBlockPage /> },
      { path: 'tracker/analysis/:appCode/:pageCode/:blockCode', element: <AnalysisFunctionPage /> },
    ],
  },
]);
