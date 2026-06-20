import type { CustomerMotorcycleUpdate } from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { apiClient } from '../../lib/api-client';

const progressLabels: Record<
  CustomerMotorcycleUpdate['progressStatus'],
  string
> = {
  delivered: 'Tu moto fue entregada',
  diagnosing: 'Comenzó el diagnóstico',
  quality_check: 'Entró a control de calidad',
  ready_for_pickup: 'Tu moto está lista para retiro',
  received: 'El taller recibió tu moto',
  repairing: 'Comenzó la reparación',
  waiting_approval: 'El taller espera tu aprobación',
};

export function NotificationsPage() {
  const query = useQuery({
    queryFn: () =>
      apiClient.get<CustomerMotorcycleUpdate[]>('/v1/notifications'),
    queryKey: ['notifications'],
    refetchInterval: 60_000,
  });

  return (
    <div className="max-w-3xl">
      <p className="text-accent text-sm font-semibold">Novedades</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Actualizaciones de tus motos
      </h1>
      <p className="text-muted mt-3">
        Los últimos avances publicados por el equipo del taller.
      </p>

      {!query.isLoading && query.data?.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="font-bold">Todavía no hay novedades</p>
          <p className="text-muted mt-2 text-sm">
            Las actualizaciones aparecerán cuando una moto ingrese al taller.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {query.data?.map((update) => (
          <Link
            className="bg-surface hover:border-accent/40 block rounded-2xl border border-white/10 p-5 transition"
            key={update.id}
            to={`/app/appointments/${update.appointmentId}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent text-xs font-semibold">
                  {update.motorcycleLabel}
                </p>
                <h2 className="mt-2 font-bold">
                  {progressLabels[update.progressStatus]}
                </h2>
                {update.message && (
                  <p className="text-muted mt-2 text-sm">{update.message}</p>
                )}
              </div>
              <time className="text-muted text-xs whitespace-nowrap">
                {new Date(update.createdAt).toLocaleDateString('es-CL')}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
