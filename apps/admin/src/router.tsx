import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { EventListPage } from './pages/tracker/events/EventListPage';
import { PropertyListPage } from './pages/tracker/properties/PropertyListPage';
import { SpmListPage } from './pages/tracker/spm/SpmListPage';
import { EventAnalysisPage } from './pages/tracker/analysis/EventAnalysisPage';
import { DashboardListPage } from './pages/tracker/dashboard/DashboardListPage';
import { DashboardViewPage } from './pages/tracker/dashboard/DashboardViewPage';
import { SessionAnalysisPage } from './pages/tracker/session/SessionAnalysisPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/tracker/events" replace /> },
      {
        path: 'tracker',
        children: [
          { path: 'events', element: <EventListPage /> },
          { path: 'properties', element: <PropertyListPage /> },
          { path: 'spm', element: <SpmListPage /> },
          { path: 'event-analysis', element: <EventAnalysisPage /> },
          { path: 'dashboards', element: <DashboardListPage /> },
          { path: 'dashboards/:id', element: <DashboardViewPage /> },
          { path: 'session-analysis', element: <SessionAnalysisPage /> },
        ],
      },
    ],
  },
]);
