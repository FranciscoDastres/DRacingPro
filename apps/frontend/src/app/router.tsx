import { createBrowserRouter } from 'react-router-dom';

import { AdminAppointmentsPage } from '../features/admin/AdminAppointmentsPage';
import { WorkshopSettingsPage } from '../features/admin/WorkshopSettingsPage';
import { AppointmentsPage } from '../features/appointments/AppointmentsPage';
import { AppointmentTimelinePage } from '../features/appointments/AppointmentTimelinePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LegalPage } from '../features/legal/LegalPage';
import { MotorcyclesPage } from '../features/motorcycles/MotorcyclesPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { ServicesPage } from '../features/services/ServicesPage';
import { LandingPage } from '../pages/LandingPage';
import { AdminRoute } from './AdminRoute';
import { AppShell } from './AppShell';
import { ProtectedRoute } from './ProtectedRoute';

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
          {
            element: <AdminRoute />,
            children: [
              { element: <AdminAppointmentsPage />, path: 'admin' },
              { element: <WorkshopSettingsPage />, path: 'admin/settings' },
            ],
          },
        ],
      },
    ],
  },
]);
