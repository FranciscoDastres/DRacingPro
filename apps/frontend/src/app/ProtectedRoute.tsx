import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';

export function ProtectedRoute() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="bg-background text-foreground grid min-h-screen place-items-center">
        <p className="text-muted animate-pulse text-sm">Cargando tu taller…</p>
      </div>
    );
  }

  if (!user) return <Navigate replace state={{ from: location }} to="/" />;
  return <Outlet />;
}
