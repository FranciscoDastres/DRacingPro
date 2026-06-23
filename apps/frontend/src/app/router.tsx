/* eslint-disable react-refresh/only-export-components -- route config defines lazy components alongside the router export */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { LandingPage } from '../pages/LandingPage';
import { AdminRoute } from './AdminRoute';
import { ProtectedRoute } from './ProtectedRoute';

// Heavy areas are code-split: the public landing no longer ships the /app,
// admin and legal bundles, shrinking the initial download.
const AppShell = lazy(() =>
  import('./AppShell').then((m) => ({ default: m.AppShell })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const AppointmentsPage = lazy(() =>
  import('../features/appointments/AppointmentsPage').then((m) => ({
    default: m.AppointmentsPage,
  })),
);
const AppointmentTimelinePage = lazy(() =>
  import('../features/appointments/AppointmentTimelinePage').then((m) => ({
    default: m.AppointmentTimelinePage,
  })),
);
const MotorcyclesPage = lazy(() =>
  import('../features/motorcycles/MotorcyclesPage').then((m) => ({
    default: m.MotorcyclesPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ServicesPage = lazy(() =>
  import('../features/services/ServicesPage').then((m) => ({
    default: m.ServicesPage,
  })),
);
const AccountPage = lazy(() =>
  import('../features/account/AccountPage').then((m) => ({
    default: m.AccountPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import('../features/admin/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminAppointmentsPage = lazy(() =>
  import('../features/admin/AdminAppointmentsPage').then((m) => ({
    default: m.AdminAppointmentsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import('../features/admin/AdminUsersPage').then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const WorkshopSettingsPage = lazy(() =>
  import('../features/admin/WorkshopSettingsPage').then((m) => ({
    default: m.WorkshopSettingsPage,
  })),
);
const LegalPage = lazy(() =>
  import('../features/legal/LegalPage').then((m) => ({ default: m.LegalPage })),
);

export const router = createBrowserRouter([
  { element: <LandingPage />, path: '/' },
  { element: <LegalPage />, path: '/legal/:doc' },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        path: '/app',
        children: [
          { element: <DashboardPage />, index: true },
          { element: <AppointmentsPage />, path: 'appointments' },
          { element: <AppointmentTimelinePage />, path: 'appointments/:id' },
          { element: <MotorcyclesPage />, path: 'motorcycles' },
          { element: <NotificationsPage />, path: 'notifications' },
          { element: <ServicesPage />, path: 'services' },
          { element: <AccountPage />, path: 'account' },
          {
            element: <AdminRoute />,
            children: [
              { element: <AdminDashboardPage />, path: 'admin' },
              { element: <AdminAppointmentsPage />, path: 'admin/agenda' },
              { element: <AdminUsersPage />, path: 'admin/users' },
              { element: <WorkshopSettingsPage />, path: 'admin/settings' },
            ],
          },
        ],
      },
    ],
  },
]);
