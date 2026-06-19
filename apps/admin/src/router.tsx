import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { AdminLayout } from './layouts/AdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';

// Route-level lazy loading — splits bundle per page group
// Named-exports are wrapped via `.then()` to satisfy React.lazy's default-export requirement
const AppListPage = lazy(() => import('./pages/tracker/setup/AppListPage').then(m => ({ default: m.AppListPage })));
const PageListPage = lazy(() => import('./pages/tracker/setup/PageListPage').then(m => ({ default: m.PageListPage })));
const BlockListPage = lazy(() => import('./pages/tracker/setup/BlockListPage').then(m => ({ default: m.BlockListPage })));
const FunctionListPage = lazy(() => import('./pages/tracker/setup/FunctionListPage').then(m => ({ default: m.FunctionListPage })));
const AnalysisAppPage = lazy(() => import('./pages/tracker/analysis/AnalysisAppPage').then(m => ({ default: m.AnalysisAppPage })));
const AnalysisPagePage = lazy(() => import('./pages/tracker/analysis/AnalysisPagePage').then(m => ({ default: m.AnalysisPagePage })));
const AnalysisBlockPage = lazy(() => import('./pages/tracker/analysis/AnalysisBlockPage').then(m => ({ default: m.AnalysisBlockPage })));
const AnalysisFunctionPage = lazy(() => import('./pages/tracker/analysis/AnalysisFunctionPage').then(m => ({ default: m.AnalysisFunctionPage })));
const PlanListPage = lazy(() => import('./pages/tracker/engineering/PlanListPage').then(m => ({ default: m.PlanListPage })));
const PlanCreatePage = lazy(() => import('./pages/tracker/engineering/PlanCreatePage').then(m => ({ default: m.PlanCreatePage })));
const PlanDetailPage = lazy(() => import('./pages/tracker/engineering/PlanDetailPage').then(m => ({ default: m.PlanDetailPage })));
const LineagePage = lazy(() => import('./pages/tracker/engineering/LineagePage').then(m => ({ default: m.LineagePage })));
const DebugPage = lazy(() => import('./pages/tracker/engineering/DebugPage').then(m => ({ default: m.DebugPage })));
const AutoTrackPage = lazy(() => import('./pages/tracker/engineering/AutoTrackPage').then(m => ({ default: m.AutoTrackPage })));
const VerifyPage = lazy(() => import('./pages/tracker/engineering/VerifyPage').then(m => ({ default: m.VerifyPage })));
const HealthMonitorPage = lazy(() => import('./pages/tracker/HealthMonitorPage').then(m => ({ default: m.HealthMonitorPage })));
// 高级行为分析(漏斗/留存/路径)— 后端 /v1/advanced-analysis/* 已实现
const AdvancedAppPage = lazy(() => import('./pages/tracker/advanced/AdvancedAppPage').then(m => ({ default: m.AdvancedAppPage })));
const FunnelAnalysisPage = lazy(() => import('./pages/tracker/advanced/FunnelAnalysisPage').then(m => ({ default: m.FunnelAnalysisPage })));
const RetentionAnalysisPage = lazy(() => import('./pages/tracker/advanced/RetentionAnalysisPage').then(m => ({ default: m.RetentionAnalysisPage })));
const PathAnalysisPage = lazy(() => import('./pages/tracker/advanced/PathAnalysisPage').then(m => ({ default: m.PathAnalysisPage })));
// 平台数据 overview — 后端 /v1/data-platform/* 已实现
const PlatformDataPage = lazy(() => import('./pages/tracker/data-platform/PlatformDataPage').then(m => ({ default: m.PlatformDataPage })));
// 体验分析 — 后端 /v1/experience/* 已实现
const ExperienceAnalysisPage = lazy(() => import('./pages/tracker/experience/ExperienceAnalysisPage').then(m => ({ default: m.ExperienceAnalysisPage })));
const HeatmapPage = lazy(() => import('./pages/tracker/experience/HeatmapPage').then(m => ({ default: m.HeatmapPage })));
const UserPortraitPage = lazy(() => import('./pages/tracker/experience/UserPortraitPage').then(m => ({ default: m.UserPortraitPage })));
// 行为分析 — 后端 /v1/behavior/* 已实现
const BehaviorAnalysisPage = lazy(() => import('./pages/tracker/behavior/BehaviorAnalysisPage').then(m => ({ default: m.BehaviorAnalysisPage })));
// 看板搭建(BI)— 后端 /v1/dashboards + /{id}/data 已实现
const DashboardBuilderPage = lazy(() => import('./pages/tracker/bi/DashboardBuilderPage').then(m => ({ default: m.DashboardBuilderPage })));
// NOTE: data-platform / portrait / behavior / experience / bi / cdp 的页面已实现但
// 对应后端接口尚未提供,路由暂时下线(连同侧边栏入口)避免运行时 404,待后端实现后恢复。

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>}>
      {children}
    </Suspense>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = sessionStorage.getItem('gateflow_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <ErrorBoundary>
          <AdminLayout />
        </ErrorBoundary>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/tracker/setup" replace /> },
      // SPM Setup
      { path: 'tracker/setup', element: <LazyPage><AppListPage /></LazyPage> },
      { path: 'tracker/setup/:appId', element: <LazyPage><PageListPage /></LazyPage> },
      { path: 'tracker/setup/:appId/:pageId', element: <LazyPage><BlockListPage /></LazyPage> },
      { path: 'tracker/setup/:appId/:pageId/:blockId', element: <LazyPage><FunctionListPage /></LazyPage> },
      // Analysis
      { path: 'tracker/analysis', element: <LazyPage><AnalysisAppPage /></LazyPage> },
      { path: 'tracker/analysis/:appCode', element: <LazyPage><AnalysisPagePage /></LazyPage> },
      { path: 'tracker/analysis/:appCode/:pageCode', element: <LazyPage><AnalysisBlockPage /></LazyPage> },
      { path: 'tracker/analysis/:appCode/:pageCode/:blockCode', element: <LazyPage><AnalysisFunctionPage /></LazyPage> },
      // Engineering
      { path: 'tracker/engineering/plans', element: <LazyPage><PlanListPage /></LazyPage> },
      { path: 'tracker/engineering/plans/new', element: <LazyPage><PlanCreatePage /></LazyPage> },
      { path: 'tracker/engineering/plans/:id', element: <LazyPage><PlanDetailPage /></LazyPage> },
      { path: 'tracker/engineering/plans/:id/edit', element: <LazyPage><PlanCreatePage /></LazyPage> },
      { path: 'tracker/engineering/lineage', element: <LazyPage><LineagePage /></LazyPage> },
      { path: 'tracker/engineering/debug', element: <LazyPage><DebugPage /></LazyPage> },
      { path: 'tracker/engineering/autotrack', element: <LazyPage><AutoTrackPage /></LazyPage> },
      { path: 'tracker/engineering/verify', element: <LazyPage><VerifyPage /></LazyPage> },
      // Platform data overview
      { path: 'tracker/data-platform', element: <LazyPage><PlatformDataPage /></LazyPage> },
      // Behavior analysis
      { path: 'tracker/behavior', element: <LazyPage><BehaviorAnalysisPage /></LazyPage> },
      // BI dashboard builder
      { path: 'tracker/bi', element: <LazyPage><DashboardBuilderPage /></LazyPage> },
      // Experience analysis
      { path: 'tracker/experience', element: <LazyPage><ExperienceAnalysisPage /></LazyPage> },
      { path: 'tracker/experience/:appCode/heatmap', element: <LazyPage><HeatmapPage /></LazyPage> },
      { path: 'tracker/experience/:appCode/portrait', element: <LazyPage><UserPortraitPage /></LazyPage> },
      // Advanced analysis (funnel / retention / path)
      { path: 'tracker/advanced', element: <LazyPage><AdvancedAppPage /></LazyPage> },
      { path: 'tracker/advanced/:appCode/funnel', element: <LazyPage><FunnelAnalysisPage /></LazyPage> },
      { path: 'tracker/advanced/:appCode/retention', element: <LazyPage><RetentionAnalysisPage /></LazyPage> },
      { path: 'tracker/advanced/:appCode/path', element: <LazyPage><PathAnalysisPage /></LazyPage> },
      // Monitoring
      { path: 'tracker/monitor', element: <LazyPage><HealthMonitorPage /></LazyPage> },
    ],
  },
]);
