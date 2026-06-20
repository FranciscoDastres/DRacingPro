import type {
  AppointmentTimeline,
  CustomerMotorcycleUpdate,
} from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { apiClient } from '../../lib/api-client';

const progressLabels: Record<
  CustomerMotorcycleUpdate['progressStatus'],
  string
> = {
  delivered: 'Moto entregada',
  diagnosing: 'En diagnóstico',
  quality_check: 'Control de calidad',
  ready_for_pickup: 'Lista para retiro',
  received: 'Moto recibida',
  repairing: 'En reparación',
  waiting_approval: 'Esperando aprobación',
};

const appointmentStatusLabels: Record<
  AppointmentTimeline['appointment']['status'],
  string
> = {
  cancelled: 'Cancelada',
  checked_in: 'Moto recibida',
  completed: 'Completada',
  confirmed: 'Confirmada',
  in_service: 'En servicio',
  no_show: 'No asistió',
  ready: 'Lista para retiro',
  requested: 'Solicitud enviada',
};

export function AppointmentTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const timeline = useQuery({
    enabled: Boolean(id),
    queryFn: () =>
      apiClient.get<AppointmentTimeline>(`/v1/appointments/${id}/timeline`),
    queryKey: ['appointments', id, 'timeline'],
  });

  if (timeline.isLoading)
    return <p className="text-muted animate-pulse">Cargando avance…</p>;
  if (!timeline.data) {
    return (
      <div>
        <p className="text-primary">No fue posible encontrar esta cita.</p>
        <Link
          className="text-accent mt-4 inline-block text-sm"
          to="/app/appointments"
        >
          Volver a agenda
        </Link>
      </div>
    );
  }

  const { appointment, updates } = timeline.data;
  return (
    <div className="max-w-3xl">
      <Link
        className="text-accent text-sm font-semibold"
        to="/app/appointments"
      >
        ← Volver a agenda
      </Link>
      <p className="text-primary mt-8 text-sm font-semibold">
        Seguimiento de servicio
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        {appointment.motorcycle.label}
      </h1>
      <p className="text-muted mt-3">
        {appointment.services.map((service) => service.name).join(', ')}
      </p>

      <div className="bg-surface mt-8 rounded-2xl border border-white/10 p-6">
        <div className="flex flex-wrap justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-muted text-xs">Ingreso agendado</p>
            <p className="mt-1 font-semibold">
              {new Date(appointment.startsAt).toLocaleString('es-CL')}
            </p>
          </div>
          <span className="bg-accent/10 text-accent h-fit rounded-full px-3 py-1 text-xs font-semibold">
            {appointmentStatusLabels[appointment.status]}
          </span>
        </div>

        {updates.length === 0 ? (
          <p className="text-muted py-8 text-center text-sm">
            El taller publicará aquí los avances de tu moto.
          </p>
        ) : (
          <ol className="mt-6 space-y-0">
            {updates.map((update, index) => (
              <li
                className="relative grid grid-cols-[24px_1fr] gap-4 pb-7"
                key={update.id}
              >
                {index < updates.length - 1 && (
                  <span className="absolute top-5 bottom-0 left-[11px] w-px bg-white/10" />
                )}
                <span className="border-surface bg-accent relative z-10 mt-1 size-6 rounded-full border-4" />
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">
                      {progressLabels[update.progressStatus]}
                    </h2>
                    <time className="text-muted text-xs">
                      {new Date(update.createdAt).toLocaleString('es-CL')}
                    </time>
                  </div>
                  {update.message && (
                    <p className="text-muted mt-2 leading-7">
                      {update.message}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
