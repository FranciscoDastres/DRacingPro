import type { AdminAppointment, Appointment } from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiClient } from '../../lib/api-client';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  hourCycle: 'h23',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
});
const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});

type AgendaView = 'day' | 'week';

export function AdminAppointmentsPage() {
  const queryClient = useQueryClient();
  const [agendaView, setAgendaView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState(getWorkshopToday());
  const [closingAppointment, setClosingAppointment] =
    useState<AdminAppointment | null>(null);
  const [technicalSummary, setTechnicalSummary] = useState('');
  const [performedText, setPerformedText] = useState('');
  const [pendingText, setPendingText] = useState('');
  const [recommendationsText, setRecommendationsText] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [maintenanceKm, setMaintenanceKm] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>(
    'pending',
  );
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'pending-requests'],
        }),
      ]);
    },
  });
  const completeWork = useMutation({
    mutationFn: (appointmentId: string) => {
      const recommendations = parseItems(recommendationsText).map((item) => ({
        ...item,
        ...(maintenanceDate && {
          dueAt: new Date(`${maintenanceDate}T12:00:00`).toISOString(),
        }),
        ...(maintenanceKm && { dueOdometerKm: Number(maintenanceKm) }),
        severity: 'warning' as const,
      }));
      return apiClient.post(
        `/v1/admin/appointments/${appointmentId}/complete-work`,
        {
          paymentStatus,
          pending: parseItems(pendingText),
          performed: parseItems(performedText),
          recommendations,
          technicalSummary,
        },
      );
    },
    onSuccess: async () => {
      closeWorkModal();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] }),
      ]);
    },
  });

  return (
    <div>
      <PageHeader
        actions={
          <Badge tone="primary">
            {appointments.data?.length ?? 0}{' '}
            {appointments.data?.length === 1 ? 'cita' : 'citas'}
          </Badge>
        }
        eyebrow="Administración"
        subtitle="Confirma o cancela reservas y contacta al cliente directamente."
        title="Agenda del taller"
      />

      <section
        aria-label="Controles de agenda"
        className="bg-surface mb-5 rounded-2xl border border-white/8 p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            aria-label="Vista de agenda"
            className="bg-background flex rounded-lg border border-white/8 p-1"
            role="group"
          >
            {(['day', 'week'] as const).map((view) => (
              <button
                aria-pressed={agendaView === view}
                className={`rounded-md px-4 py-2 text-xs font-bold transition ${agendaView === view ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
                key={view}
                onClick={() => setAgendaView(view)}
                type="button"
              >
                {view === 'day' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              aria-label={
                agendaView === 'day' ? 'Día anterior' : 'Semana anterior'
              }
              onClick={() =>
                setSelectedDate((current) =>
                  addDays(current, agendaView === 'day' ? -1 : -7),
                )
              }
              size="sm"
              variant="ghost"
            >
              ←
            </Button>
            <input
              aria-label="Fecha de agenda"
              className="bg-background focus:border-accent rounded-lg border border-white/10 px-3 py-2 text-sm outline-none"
              onChange={(event) => setSelectedDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
            <Button
              aria-label={
                agendaView === 'day' ? 'Día siguiente' : 'Semana siguiente'
              }
              onClick={() =>
                setSelectedDate((current) =>
                  addDays(current, agendaView === 'day' ? 1 : 7),
                )
              }
              size="sm"
              variant="ghost"
            >
              →
            </Button>
            <Button
              onClick={() => setSelectedDate(getWorkshopToday())}
              size="sm"
              variant="secondary"
            >
              Hoy
            </Button>
          </div>
        </div>
        <p className="text-muted mt-3 text-xs font-semibold capitalize">
          {formatAgendaRange(range, agendaView)}
        </p>
      </section>

      {appointments.isError && (
        <p className="border-primary/30 bg-primary/10 rounded-xl border p-4 text-sm">
          No fue posible cargar la agenda.
        </p>
      )}
      {appointments.isLoading && (
        <div className="bg-surface h-64 animate-pulse rounded-2xl border border-white/8" />
      )}
      {!appointments.isLoading && appointments.data?.length === 0 && (
        <EmptyState
          icon="calendar"
          title="No hay citas en este periodo"
          description="Cambia la fecha o selecciona la vista semanal."
        />
      )}

      <div className="space-y-3">
        {appointments.data?.map((appointment) => {
          const cancelled = ['cancelled', 'no_show'].includes(
            appointment.status,
          );
          const requested = appointment.status === 'requested';
          return (
            <Card className="overflow-hidden" key={appointment.id}>
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                <div className="flex min-w-[150px] items-center gap-3 lg:w-48">
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon className="size-5" name="calendar" />
                  </span>
                  <div>
                    <p className="font-semibold tabular-nums">
                      {timeFormatter.format(new Date(appointment.startsAt))}
                    </p>
                    <p className="text-muted mt-0.5 text-xs">
                      hasta {timeFormatter.format(new Date(appointment.endsAt))}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 flex-1 border-white/8 lg:border-l lg:pl-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold tracking-normal normal-case">
                      {appointment.customer.displayName}
                    </h2>
                    <Badge
                      tone={
                        cancelled ? 'danger' : requested ? 'warning' : 'success'
                      }
                    >
                      {cancelled
                        ? 'Cancelada'
                        : requested
                          ? 'Por confirmar'
                          : 'Confirmada'}
                    </Badge>
                  </div>
                  <p className="text-muted mt-1 truncate text-xs">
                    {appointment.services
                      .map((service) => service.name)
                      .join(', ')}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {dateFormatter.format(new Date(appointment.startsAt))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {appointment.customer.phone ? (
                    <a
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/8 px-3.5 text-[0.7rem] font-semibold tracking-wide text-emerald-400 uppercase transition hover:bg-emerald-400/15"
                      href={toWhatsAppUrl(
                        appointment.customer.phone,
                        appointment.customer.displayName,
                        appointment.startsAt,
                      )}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Icon className="size-4" name="phone" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-muted px-2 text-xs">
                      Sin teléfono
                    </span>
                  )}
                  {requested && (
                    <Button
                      disabled={statusMutation.isPending}
                      icon="check"
                      onClick={() =>
                        statusMutation.mutate({
                          id: appointment.id,
                          status: 'confirmed',
                        })
                      }
                      size="sm"
                    >
                      Confirmar
                    </Button>
                  )}
                  {appointment.status === 'confirmed' && (
                    <Button
                      disabled={statusMutation.isPending}
                      icon="tool"
                      onClick={() =>
                        statusMutation.mutate({
                          id: appointment.id,
                          status: 'in_service',
                        })
                      }
                      size="sm"
                    >
                      Iniciar trabajo
                    </Button>
                  )}
                  {appointment.status === 'in_service' && (
                    <Button
                      disabled={statusMutation.isPending}
                      icon="check"
                      onClick={() =>
                        statusMutation.mutate({
                          id: appointment.id,
                          status: 'ready',
                        })
                      }
                      size="sm"
                    >
                      Lista para retiro
                    </Button>
                  )}
                  {!cancelled && canCancel(appointment.status) && (
                    <Button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          id: appointment.id,
                          status: 'cancelled',
                        })
                      }
                      size="sm"
                      variant="danger"
                    >
                      Cancelar
                    </Button>
                  )}
                  {!cancelled &&
                    !['completed', 'no_show'].includes(appointment.status) && (
                      <Button
                        icon="tool"
                        onClick={() => {
                          setClosingAppointment(appointment);
                          setTechnicalSummary('');
                          setPerformedText('');
                          setPendingText('');
                          setRecommendationsText('');
                          setMaintenanceDate('');
                          setMaintenanceKm('');
                          setPaymentStatus('pending');
                          completeWork.reset();
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        Registrar atención
                      </Button>
                    )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {statusMutation.isError && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          La cita cambió de estado y no pudo actualizarse. Recarga la agenda.
        </p>
      )}

      <Modal
        open={Boolean(closingAppointment)}
        onClose={closeWorkModal}
        eyebrow="Informe técnico"
        title={`Finalizar atención · ${closingAppointment?.customer.displayName ?? ''}`}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
              Resumen técnico
            </span>
            <textarea
              className={textareaClass}
              onChange={(event) => setTechnicalSummary(event.target.value)}
              placeholder="Diagnóstico general y resultado de la atención"
              value={technicalSummary}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
              Trabajo realizado
            </span>
            <textarea
              className={textareaClass}
              onChange={(event) => setPerformedText(event.target.value)}
              placeholder={
                'Un trabajo por línea. Formato: Título | Descripción'
              }
              value={performedText}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
              Trabajo pendiente
            </span>
            <textarea
              className={textareaClass}
              onChange={(event) => setPendingText(event.target.value)}
              placeholder="Opcional: Título | Descripción"
              value={pendingText}
            />
          </label>
          <label className="block">
            <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
              Recomendaciones futuras
            </span>
            <textarea
              className={textareaClass}
              onChange={(event) => setRecommendationsText(event.target.value)}
              placeholder="Opcional: Título | Descripción"
              value={recommendationsText}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
                Fecha recomendada
              </span>
              <input
                className={inputClass}
                onChange={(event) => setMaintenanceDate(event.target.value)}
                type="date"
                value={maintenanceDate}
              />
            </label>
            <label>
              <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
                Kilometraje recomendado
              </span>
              <input
                className={inputClass}
                min="0"
                onChange={(event) => setMaintenanceKm(event.target.value)}
                type="number"
                value={maintenanceKm}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-muted mb-1.5 block text-xs font-semibold uppercase">
              Estado de pago
            </span>
            <select
              className={inputClass}
              onChange={(event) =>
                setPaymentStatus(event.target.value as 'pending' | 'paid')
              }
              value={paymentStatus}
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </select>
          </label>
          {completeWork.isError && (
            <p className="text-sm text-red-400" role="alert">
              No fue posible finalizar la atención. Revisa los datos e inténtalo
              nuevamente.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={closeWorkModal} variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={
                parseItems(performedText).length === 0 ||
                technicalSummary.trim().length < 3
              }
              loading={completeWork.isPending}
              onClick={() =>
                closingAppointment && completeWork.mutate(closingAppointment.id)
              }
            >
              Finalizar y emitir comprobante
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  function closeWorkModal() {
    setClosingAppointment(null);
    completeWork.reset();
  }
}

const textareaClass =
  'bg-background focus:border-accent min-h-20 w-full resize-y rounded-xl border border-white/10 px-3 py-2 text-sm outline-none';
const inputClass =
  'bg-background focus:border-accent w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm outline-none';

function parseItems(
  value: string,
): Array<{ title: string; description: string }> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...descriptionParts] = line.split('|');
      const normalizedTitle = title?.trim() ?? line;
      const description = descriptionParts.join('|').trim() || normalizedTitle;
      return { description, title: normalizedTitle };
    });
}

function toWhatsAppUrl(
  phone: string,
  customerName: string,
  startsAt: string,
): string {
  const rawDigits = phone.replace(/\D/g, '').replace(/^0+/, '');
  const digits = rawDigits.length === 9 ? `56${rawDigits}` : rawDigits;
  const message = `Hola ${customerName}, te contactamos de D Racing Pro por tu cita del ${dateFormatter.format(new Date(startsAt))}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function canCancel(status: Appointment['status']): boolean {
  return ['requested', 'confirmed', 'checked_in'].includes(status);
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
  if (view === 'day')
    return formatter.format(new Date(`${range.from}T00:00:00.000Z`));
  return `${formatter.format(new Date(`${range.from}T00:00:00.000Z`))} – ${formatter.format(new Date(`${addDays(range.to, -1)}T00:00:00.000Z`))}`;
}
