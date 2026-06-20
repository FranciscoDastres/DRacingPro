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

type AgendaView = 'day' | 'week';

export function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [agendaView, setAgendaView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState(getWorkshopToday());
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    string | null
  >(null);
  const [progressStatus, setProgressStatus] =
    useState<CreateMotorcycleStatusUpdateInput['progressStatus']>('diagnosing');
  const [message, setMessage] = useState('');
  const range = getAgendaRange(selectedDate, agendaView);

  const appointments = useQuery({
    queryFn: () =>
      apiClient.get<AdminAppointment[]>(
        `/v1/admin/appointments?from=${range.from}&to=${range.to}`,
      ),
    queryKey: ['admin', 'appointments', range.from, range.to],
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
          {appointments.data?.length ?? 0}{' '}
          {appointments.data?.length === 1 ? 'cita' : 'citas'}
        </span>
      </div>

      <section
        aria-label="Controles de agenda"
        className="bg-surface mt-8 rounded-2xl border border-white/10 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            aria-label="Vista de agenda"
            className="bg-background flex rounded-lg border border-white/10 p-1"
            role="group"
          >
            {(['day', 'week'] as const).map((view) => (
              <button
                aria-pressed={agendaView === view}
                className={`rounded-md px-4 py-2 text-xs font-bold transition ${
                  agendaView === view
                    ? 'bg-accent text-background'
                    : 'text-muted hover:text-foreground'
                }`}
                key={view}
                onClick={() => setAgendaView(view)}
                type="button"
              >
                {view === 'day' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label={
                agendaView === 'day' ? 'Día anterior' : 'Semana anterior'
              }
              className="text-muted hover:text-foreground rounded-lg border border-white/10 px-3 py-2 text-sm"
              onClick={() =>
                setSelectedDate((current) =>
                  addDays(current, agendaView === 'day' ? -1 : -7),
                )
              }
              type="button"
            >
              ←
            </button>
            <input
              aria-label="Fecha de agenda"
              className="bg-background focus:border-accent rounded-lg border border-white/10 px-3 py-2 text-sm outline-none"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
            <button
              aria-label={
                agendaView === 'day' ? 'Día siguiente' : 'Semana siguiente'
              }
              className="text-muted hover:text-foreground rounded-lg border border-white/10 px-3 py-2 text-sm"
              onClick={() =>
                setSelectedDate((current) =>
                  addDays(current, agendaView === 'day' ? 1 : 7),
                )
              }
              type="button"
            >
              →
            </button>
            <button
              className="text-accent hover:bg-accent/10 rounded-lg px-3 py-2 text-xs font-bold"
              onClick={() => setSelectedDate(getWorkshopToday())}
              type="button"
            >
              Hoy
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold">
          {formatAgendaRange(range, agendaView)}
        </p>
      </section>

      {appointments.isError && (
        <p className="border-primary/30 bg-primary/10 mt-8 rounded-xl border p-4 text-sm">
          No fue posible cargar la agenda administrativa.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {appointments.isLoading && (
          <p className="text-muted animate-pulse text-sm">Cargando agenda…</p>
        )}
        {!appointments.isLoading && appointments.data?.length === 0 && (
          <div className="bg-surface rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <h2 className="font-bold">No hay citas en este periodo</h2>
            <p className="text-muted mt-2 text-sm">
              Cambia la fecha o selecciona otra vista para revisar la agenda.
            </p>
          </div>
        )}
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

            {(nextStatuses[appointment.status].length > 0 ||
              canPublishProgress(appointment.status)) && (
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
                {canPublishProgress(appointment.status) && (
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
                )}
              </div>
            )}

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

function getWorkshopToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Santiago',
    year: 'numeric',
  }).format(new Date());
}

function getAgendaRange(date: string, view: AgendaView) {
  const from = view === 'week' ? getWeekStart(date) : date;
  return { from, to: addDays(from, view === 'week' ? 7 : 1) };
}

function getWeekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function formatAgendaRange(
  range: { from: string; to: string },
  view: AgendaView,
): string {
  const formatter = new Intl.DateTimeFormat('es-CL', {
    dateStyle: view === 'day' ? 'full' : 'medium',
    timeZone: 'UTC',
  });
  if (view === 'day') {
    return formatter.format(new Date(`${range.from}T00:00:00.000Z`));
  }
  return `${formatter.format(new Date(`${range.from}T00:00:00.000Z`))} – ${formatter.format(new Date(`${addDays(range.to, -1)}T00:00:00.000Z`))}`;
}

function canPublishProgress(status: Appointment['status']): boolean {
  return !['cancelled', 'completed', 'no_show'].includes(status);
}
