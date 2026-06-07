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
import { FunnelAnalysisPage } from './pages/tracker/advanced/FunnelAnalysisPage';
import { RetentionAnalysisPage } from './pages/tracker/advanced/RetentionAnalysisPage';
import { PathAnalysisPage } from './pages/tracker/advanced/PathAnalysisPage';
import { PlanListPage } from './pages/tracker/engineering/PlanListPage';
import { PlanCreatePage } from './pages/tracker/engineering/PlanCreatePage';
import { PlanDetailPage } from './pages/tracker/engineering/PlanDetailPage';
import { LineagePage } from './pages/tracker/engineering/LineagePage';
import { DebugPage } from './pages/tracker/engineering/DebugPage';

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
      // Advanced Analysis
      { path: 'tracker/advanced/funnel', element: <FunnelAnalysisPage /> },
      { path: 'tracker/advanced/retention', element: <RetentionAnalysisPage /> },
      { path: 'tracker/advanced/path', element: <PathAnalysisPage /> },
      // Engineering
      { path: 'tracker/engineering/plans', element: <PlanListPage /> },
      { path: 'tracker/engineering/plans/new', element: <PlanCreatePage /> },
      { path: 'tracker/engineering/plans/:id', element: <PlanDetailPage /> },
      { path: 'tracker/engineering/plans/:id/edit', element: <PlanCreatePage /> },
      { path: 'tracker/engineering/lineage', element: <LineagePage /> },
      { path: 'tracker/engineering/debug', element: <DebugPage /> },
    ],
  },
]);
