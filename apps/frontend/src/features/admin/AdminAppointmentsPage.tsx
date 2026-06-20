import type {
  AdminAppointment,
  Appointment,
  CreateMotorcycleStatusUpdateInput,
} from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '../../lib/api-client';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const statusLabels: Record<Appointment['status'], string> = {
  cancelled: 'Cancelada',
  checked_in: 'Moto recibida',
  completed: 'Completada',
  confirmed: 'Confirmada',
  in_service: 'En servicio',
  no_show: 'No asistió',
  ready: 'Lista para retiro',
  requested: 'Solicitada',
};

const nextStatuses: Record<Appointment['status'], Appointment['status'][]> = {
  cancelled: [],
  checked_in: ['in_service', 'cancelled'],
  completed: [],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  in_service: ['ready'],
  no_show: [],
  ready: ['completed'],
  requested: ['confirmed', 'cancelled'],
};

export function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    string | null
  >(null);
  const [progressStatus, setProgressStatus] =
    useState<CreateMotorcycleStatusUpdateInput['progressStatus']>('diagnosing');
  const [message, setMessage] = useState('');

  const appointments = useQuery({
    queryFn: () => apiClient.get<AdminAppointment[]>('/v1/admin/appointments'),
    queryKey: ['admin', 'appointments'],
  });
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Appointment['status'];
    }) =>
      apiClient.patch<Appointment>(`/v1/admin/appointments/${id}/status`, {
        status,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] }),
  });
  const progressMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      apiClient.post(
        `/v1/admin/appointments/${appointmentId}/motorcycle-updates`,
        {
          customerVisible: true,
          message: message || undefined,
          progressStatus,
        },
      ),
    onSuccess: () => {
      setMessage('');
      setUpdatingAppointmentId(null);
    },
  });

  return (
    <div>
      <p className="text-primary text-sm font-semibold">Administración</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Agenda del taller
          </h1>
          <p className="text-muted mt-3">
            Confirma citas y mantén al cliente informado del trabajo.
          </p>
        </div>
        <span className="bg-accent/10 text-accent rounded-full px-4 py-2 text-sm font-semibold">
          {appointments.data?.length ?? 0} citas activas
        </span>
      </div>

      {appointments.isError && (
        <p className="border-primary/30 bg-primary/10 mt-8 rounded-xl border p-4 text-sm">
          No fue posible cargar la agenda administrativa.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {appointments.data?.map((appointment) => (
          <article
            className="bg-surface rounded-2xl border border-white/10 p-6"
            key={appointment.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">
                    {appointment.motorcycle.label}
                  </h2>
                  <span className="text-accent rounded-full bg-white/5 px-3 py-1 text-xs font-semibold">
                    {statusLabels[appointment.status]}
                  </span>
                </div>
                <p className="text-muted mt-2 text-sm">
                  {appointment.customer.displayName} ·{' '}
                  {appointment.customer.email}
                </p>
                <p className="mt-3 text-sm font-semibold">
                  {appointment.services
                    .map((service) => service.name)
                    .join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {dateFormatter.format(new Date(appointment.startsAt))}
                </p>
                <p className="text-muted mt-1 text-xs">
                  hasta{' '}
                  {new Date(appointment.endsAt).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
              {nextStatuses[appointment.status].map((status) => (
                <button
                  aria-label={`${statusLabels[status]} para ${appointment.motorcycle.label}`}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    status === 'cancelled' || status === 'no_show'
                      ? 'border-primary/30 text-primary hover:bg-primary/10 border'
                      : 'bg-accent text-background hover:brightness-110'
                  }`}
                  disabled={statusMutation.isPending}
                  key={status}
                  onClick={() =>
                    statusMutation.mutate({ id: appointment.id, status })
                  }
                  type="button"
                >
                  {statusLabels[status]}
                </button>
              ))}
              <button
                aria-label={`Editar avance de ${appointment.motorcycle.label}`}
                className="text-muted hover:text-foreground rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold"
                onClick={() =>
                  setUpdatingAppointmentId((current) =>
                    current === appointment.id ? null : appointment.id,
                  )
                }
                type="button"
              >
                Publicar avance
              </button>
            </div>

            {updatingAppointmentId === appointment.id && (
              <div className="bg-background mt-5 grid gap-3 rounded-xl p-4 sm:grid-cols-[200px_1fr_auto]">
                <select
                  aria-label={`Estado del avance de ${appointment.motorcycle.label}`}
                  className="bg-surface rounded-lg border border-white/10 px-3 py-2 text-sm"
                  onChange={(event) =>
                    setProgressStatus(
                      event.target
                        .value as CreateMotorcycleStatusUpdateInput['progressStatus'],
                    )
                  }
                  value={progressStatus}
                >
                  <option value="received">Moto recibida</option>
                  <option value="diagnosing">En diagnóstico</option>
                  <option value="waiting_approval">Esperando aprobación</option>
                  <option value="repairing">En reparación</option>
                  <option value="quality_check">Control de calidad</option>
                  <option value="ready_for_pickup">Lista para retiro</option>
                  <option value="delivered">Entregada</option>
                </select>
                <input
                  aria-label={`Mensaje para el cliente sobre ${appointment.motorcycle.label}`}
                  className="bg-surface focus:border-accent rounded-lg border border-white/10 px-3 py-2 text-sm outline-none"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Mensaje visible para el cliente"
                  value={message}
                />
                <button
                  aria-label={`Publicar avance de ${appointment.motorcycle.label}`}
                  className="bg-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  disabled={progressMutation.isPending}
                  onClick={() => progressMutation.mutate(appointment.id)}
                  type="button"
                >
                  Publicar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
