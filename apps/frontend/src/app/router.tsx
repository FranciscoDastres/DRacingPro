import { createBrowserRouter } from 'react-router-dom';

import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MotorcyclesPage } from '../features/motorcycles/MotorcyclesPage';
import { ServicesPage } from '../features/services/ServicesPage';
import { LandingPage } from '../pages/LandingPage';
import { AppShell } from './AppShell';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { element: <LandingPage />, path: '/' },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        path: '/app',
        children: [
          { element: <DashboardPage />, index: true },
          { element: <MotorcyclesPage />, path: 'motorcycles' },
          { element: <ServicesPage />, path: 'services' },
        ],
      },
    ],
  },
]);
