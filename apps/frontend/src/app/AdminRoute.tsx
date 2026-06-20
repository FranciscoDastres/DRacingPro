import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';

export function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate replace to="/app" />;
  return <Outlet />;
}
