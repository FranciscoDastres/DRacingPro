import type { Appointment, Motorcycle, Service } from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Card, StatCard } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { formatCLP } from '../../components/ui/money';
import { useAuth } from '../auth/auth-context';
import { apiClient } from '../../lib/api-client';

const ACTIVE_STATUSES: Appointment['status'][] = [
  'requested',
  'confirmed',
  'checked_in',
  'in_service',
  'ready',
];

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'long',
});

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
  const appointments = useQuery({
    queryFn: () => apiClient.get<Appointment[]>('/v1/appointments'),
    queryKey: ['appointments'],
  });

  const list = appointments.data ?? [];
  const now = new Date().getTime();
  const nextAppointment = [...list]
    .filter(
      (item) =>
        ACTIVE_STATUSES.includes(item.status) &&
        new Date(item.startsAt).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )[0];
  const totalSpent = list
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + item.total, 0);

  return (
    <div>
      <p className="text-accent text-sm font-semibold tracking-[0.12em] uppercase">
        Panel cliente
      </p>
      <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Hola, {user?.displayName.split(' ')[0]}
      </h1>
      <p className="text-muted mt-3 max-w-2xl">
        Revisa el estado de tu Honda NAVI, agenda mantenciones y lleva el
        historial de tus servicios.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hint={
            nextAppointment
              ? dateFormatter.format(new Date(nextAppointment.startsAt))
              : 'Sin citas próximas'
          }
          icon="calendar"
          label="Próxima cita"
          value={nextAppointment ? nextAppointment.motorcycle.label : '—'}
        />
        <StatCard
          icon="bike"
          label="Motos registradas"
          value={motorcycles.isLoading ? '—' : (motorcycles.data?.length ?? 0)}
        />
        <StatCard
          accent="success"
          hint="Servicios completados"
          icon="wallet"
          label="Total invertido"
          value={formatCLP(totalSpent)}
        />
        <StatCard
          icon="tool"
          label="Servicios disponibles"
          value={services.isLoading ? '—' : (services.data?.length ?? 0)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          icon="calendar"
          label="Agendar una cita"
          to="/app/appointments"
        />
        <QuickLink icon="bike" label="Mis motos" to="/app/motorcycles" />
        <QuickLink icon="tool" label="Catálogo de servicios" to="/app/services" />
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  to,
}: {
  icon: IconName;
  label: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card
        className="flex items-center justify-between gap-3 p-5"
        interactive
      >
        <span className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
            <Icon name={icon} />
          </span>
          <span className="font-display font-bold text-white">{label}</span>
        </span>
        <span className="text-muted">→</span>
      </Card>
    </Link>
  );
}
