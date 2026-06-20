import type { Motorcycle, Service } from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/auth-context';
import { apiClient } from '../../lib/api-client';

export function DashboardPage() {
  const { user } = useAuth();
  const motorcycles = useQuery({
    queryFn: () => apiClient.get<Motorcycle[]>('/v1/motorcycles'),
    queryKey: ['motorcycles'],
  });
  const services = useQuery({
    queryFn: () => apiClient.get<Service[]>('/v1/services'),
    queryKey: ['services'],
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <p className="text-accent text-sm font-semibold">Panel cliente</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
        Hola, {user?.displayName.split(' ')[0]}
      </h1>
      <p className="text-muted mt-3 max-w-2xl">
        Administra tus Honda NAVI y revisa los servicios disponibles antes de
        agendar.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          className="bg-surface hover:border-accent/40 rounded-2xl border border-white/10 p-6 transition"
          to="/app/motorcycles"
        >
          <p className="text-muted text-sm">Motos registradas</p>
          <p className="mt-3 text-4xl font-black">
            {motorcycles.isLoading ? '—' : (motorcycles.data?.length ?? 0)}
          </p>
          <p className="text-accent mt-5 text-sm font-semibold">
            Administrar motos →
          </p>
        </Link>

        <Link
          className="bg-surface hover:border-primary/40 rounded-2xl border border-white/10 p-6 transition"
          to="/app/services"
        >
          <p className="text-muted text-sm">Servicios disponibles</p>
          <p className="mt-3 text-4xl font-black">
            {services.isLoading ? '—' : (services.data?.length ?? 0)}
          </p>
          <p className="text-primary mt-5 text-sm font-semibold">
            Ver catálogo →
          </p>
        </Link>
      </div>
    </div>
  );
}
