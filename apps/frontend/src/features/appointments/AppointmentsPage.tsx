import type {
  Appointment,
  AvailabilitySlot,
  Motorcycle,
  Service,
} from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../../components/ui/Badge';
import { APPOINTMENT_STATUS_META } from '../../components/ui/status-meta';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCLP } from '../../components/ui/money';
import { Tabs } from '../../components/ui/Tabs';
import { apiClient } from '../../lib/api-client';
import { AppointmentCalendar } from './AppointmentCalendar';
import {
  getNextBookableDate,
  getToday,
  getWorkshopMinutes,
  parseLocalDate,
} from './appointment-helpers';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  hourCycle: 'h23',
  timeZone: 'America/Santiago',
  timeStyle: 'short',
});
const selectedDateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'full',
});
const slotTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});

const UPCOMING_STATUSES: Appointment['status'][] = [
  'requested',
  'confirmed',
  'checked_in',
  'in_service',
  'ready',
];

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(getNextBookableDate());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    string | null
  >(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<
    string | null
  >(null);
  const [rescheduleDate, setRescheduleDate] = useState(getNextBookableDate());
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [appointmentsTab, setAppointmentsTab] = useState<'upcoming' | 'past'>(
    'upcoming',
  );

  const motorcycles = useQuery({
    queryFn: () => apiClient.get<Motorcycle[]>('/v1/motorcycles'),
    queryKey: ['motorcycles'],
  });
  const ensureMotorcycle = useMutation({
    mutationFn: () => apiClient.post<Motorcycle>('/v1/motorcycles', {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['motorcycles'] }),
  });
  const motorcycleId = motorcycles.data?.[0]?.id ?? '';

  useEffect(() => {
    if (
      motorcycles.isSuccess &&
      motorcycles.data.length === 0 &&
      ensureMotorcycle.isIdle
    ) {
      ensureMotorcycle.mutate();
    }
  }, [ensureMotorcycle, motorcycles.data, motorcycles.isSuccess]);
  const services = useQuery({
    queryFn: () => apiClient.get<Service[]>('/v1/services'),
    queryKey: ['services'],
    staleTime: 5 * 60_000,
  });
  const appointments = useQuery({
    queryFn: () => apiClient.get<Appointment[]>('/v1/appointments'),
    queryKey: ['appointments'],
  });
  const reschedulingAppointment = appointments.data?.find(
    (item) => item.id === reschedulingAppointmentId,
  );
  const rescheduleServiceIds =
    reschedulingAppointment?.services.map((service) => service.id) ?? [];
  const rescheduleAvailability = useQuery({
    enabled:
      Boolean(reschedulingAppointment) &&
      Boolean(rescheduleDate) &&
      rescheduleServiceIds.length > 0,
    queryFn: () =>
      apiClient.get<AvailabilitySlot[]>(
        `/v1/availability?date=${rescheduleDate}&serviceIds=${rescheduleServiceIds.join(',')}`,
      ),
    queryKey: [
      'availability',
      'reschedule',
      rescheduleDate,
      rescheduleServiceIds,
    ],
  });
  const availability = useQuery({
    enabled: serviceIds.length > 0 && Boolean(date),
    queryFn: () =>
      apiClient.get<AvailabilitySlot[]>(
        `/v1/availability?date=${date}&serviceIds=${serviceIds.join(',')}`,
      ),
    queryKey: ['availability', date, serviceIds],
  });
  const createAppointment = useMutation({
    mutationFn: () =>
      apiClient.post<Appointment>('/v1/appointments', {
        motorcycleId,
        serviceIds,
        startsAt: selectedSlot,
      }),
    onSuccess: async () => {
      setSelectedSlot('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
      ]);
    },
  });
  const cancelAppointment = useMutation({
    mutationFn: ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason?: string;
    }) =>
      apiClient.patch<Appointment>(
        `/v1/appointments/${appointmentId}/cancel`,
        reason ? { reason } : {},
      ),
    onSuccess: async () => {
      setCancellationReason('');
      setCancellingAppointmentId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
      ]);
    },
  });
  const rescheduleAppointment = useMutation({
    mutationFn: ({
      appointmentId,
      startsAt,
    }: {
      appointmentId: string;
      startsAt: string;
    }) =>
      apiClient.patch<Appointment>(
        `/v1/appointments/${appointmentId}/reschedule`,
        { startsAt },
      ),
    onSuccess: async () => {
      setReschedulingAppointmentId(null);
      setRescheduleSlot('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
        queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] }),
      ]);
    },
  });

  const selectedServices = useMemo(
    () =>
      services.data?.filter((service) => serviceIds.includes(service.id)) ?? [],
    [serviceIds, services.data],
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );
  const totalMinutes = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );
  const availableSlots = availability.data ?? [];
  const morningSlots = availableSlots.filter(
    (slot) => getWorkshopMinutes(slot.startsAt) < 14 * 60,
  );
  const afternoonSlots = availableSlots.filter(
    (slot) => getWorkshopMinutes(slot.startsAt) >= 15 * 60,
  );

  const toggleService = (id: string) => {
    setSelectedSlot('');
    createAppointment.reset();
    setServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const allAppointments = appointments.data ?? [];
  const nowMs = new Date().getTime();
  const upcomingAppointments = allAppointments.filter(
    (item) =>
      UPCOMING_STATUSES.includes(item.status) &&
      new Date(item.startsAt).getTime() >= nowMs,
  );
  const pastAppointments = allAppointments.filter(
    (item) => !upcomingAppointments.includes(item),
  );
  const visibleAppointments =
    appointmentsTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <div>
      <p className="text-accent text-sm font-semibold">Agenda online</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Reservar una cita
      </h1>
      <p className="text-muted mt-3">
        Selecciona los servicios y uno de los horarios disponibles para tu NAVI.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="bg-surface rounded-2xl border border-white/10 p-6">
            <h2 className="font-bold">1. Selecciona servicios</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {services.data?.map((service) => (
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    serviceIds.includes(service.id)
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  key={service.id}
                >
                  <input
                    checked={serviceIds.includes(service.id)}
                    className="sr-only"
                    onChange={() => toggleService(service.id)}
                    type="checkbox"
                  />
                  <span className="font-semibold">{service.name}</span>
                  <span className="text-muted mt-2 block text-xs">
                    {service.durationMinutes} min · $
                    {service.price.toLocaleString('es-CL')}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-surface rounded-2xl border border-white/10 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">2. Fecha y horario</h2>
                <p className="text-muted mt-2 text-sm">
                  Selecciona un día y luego un bloque disponible de 45 minutos.
                </p>
              </div>
              <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-3 py-1.5 text-xs font-semibold">
                09:30–18:00
              </span>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(290px,.8fr)_1.2fr]">
              <AppointmentCalendar
                minDate={getToday()}
                onChange={(nextDate) => {
                  setDate(nextDate);
                  setSelectedSlot('');
                  createAppointment.reset();
                }}
                value={date}
              />

              <div>
                <p className="font-display text-sm font-bold tracking-[0.06em] capitalize uppercase">
                  {selectedDateFormatter.format(parseLocalDate(date))}
                </p>
                <p className="text-muted mt-2 text-xs">
                  La colación de 14:00 a 15:00 no admite reservas.
                </p>

                {serviceIds.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-white/15 p-6 text-center">
                    <p className="text-sm font-semibold">
                      Selecciona al menos un servicio
                    </p>
                    <p className="text-muted mt-2 text-xs">
                      Así podremos calcular la duración y mostrar los horarios.
                    </p>
                  </div>
                ) : availability.isFetching ? (
                  <div
                    className="mt-5 grid grid-cols-3 gap-2"
                    aria-label="Buscando horarios"
                  >
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span
                        className="h-11 animate-pulse rounded-xl bg-white/5"
                        key={index}
                      />
                    ))}
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="mt-6 space-y-6">
                    <TimeSlotGroup
                      label="Mañana"
                      onSelect={(slot) => {
                        setSelectedSlot(slot);
                        createAppointment.reset();
                      }}
                      selectedSlot={selectedSlot}
                      slots={morningSlots}
                    />
                    <div className="text-muted flex items-center gap-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
                      <span className="h-px flex-1 bg-white/10" />
                      Colación · 14:00–15:00
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <TimeSlotGroup
                      label="Tarde"
                      onSelect={(slot) => {
                        setSelectedSlot(slot);
                        createAppointment.reset();
                      }}
                      selectedSlot={selectedSlot}
                      slots={afternoonSlots}
                    />
                  </div>
                ) : (
                  <div className="border-primary/20 bg-primary/5 mt-5 rounded-xl border p-5">
                    <p className="text-sm font-semibold">
                      No quedan horarios disponibles este día.
                    </p>
                    <p className="text-muted mt-2 text-xs">
                      Elige otra fecha en el calendario para continuar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="border-accent/20 bg-surface h-fit rounded-2xl border p-6 xl:sticky xl:top-6">
          <h2 className="font-bold">Resumen</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Servicios</dt>
              <dd>{selectedServices.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Duración</dt>
              <dd>{totalMinutes} min</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Horario</dt>
              <dd className="text-right">
                {selectedSlot
                  ? dateFormatter.format(new Date(selectedSlot))
                  : 'Por seleccionar'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="font-semibold">Total estimado</dt>
              <dd className="text-primary font-black">
                ${totalPrice.toLocaleString('es-CL')}
              </dd>
            </div>
          </dl>
          {createAppointment.isSuccess && (
            <div
              className="border-success/30 bg-success/10 mt-5 rounded-xl border p-4"
              role="status"
            >
              <p className="text-success text-sm font-bold">
                Solicitud enviada
              </p>
              <p className="text-muted mt-1 text-xs">
                {dateFormatter.format(
                  new Date(createAppointment.data.startsAt),
                )}
              </p>
            </div>
          )}
          {createAppointment.isError && (
            <p className="text-primary mt-4 text-sm" role="alert">
              El horario dejó de estar disponible. Selecciona otro.
            </p>
          )}
          <button
            className="bg-primary mt-6 w-full rounded-xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !motorcycleId ||
              serviceIds.length === 0 ||
              !selectedSlot ||
              createAppointment.isPending
            }
            onClick={() => createAppointment.mutate()}
            type="button"
          >
            {createAppointment.isPending ? 'Reservando…' : 'Confirmar cita'}
          </button>
        </aside>
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold">Tus citas</h2>
          <Tabs
            items={[
              {
                count: upcomingAppointments.length,
                label: 'Próximas',
                value: 'upcoming',
              },
              {
                count: pastAppointments.length,
                label: 'Historial',
                value: 'past',
              },
            ]}
            onChange={setAppointmentsTab}
            value={appointmentsTab}
          />
        </div>
        <div className="mt-5 space-y-3">
          {visibleAppointments.length === 0 && (
            <EmptyState
              icon="calendar"
              title={
                appointmentsTab === 'upcoming'
                  ? 'No tienes citas próximas'
                  : 'Aún no hay historial'
              }
              description={
                appointmentsTab === 'upcoming'
                  ? 'Agenda una mantención para tu Honda NAVI arriba.'
                  : 'Tus citas completadas y canceladas aparecerán aquí.'
              }
            />
          )}
          {visibleAppointments.map((item) => {
            const meta = APPOINTMENT_STATUS_META[item.status];
            return (
              <article
                className="bg-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-5"
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{item.motorcycle.label}</p>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="text-muted mt-1 text-sm">
                    {item.services.map((service) => service.name).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {dateFormatter.format(new Date(item.startsAt))}
                  </p>
                  <p className="text-primary mt-1 text-sm font-bold tabular-nums">
                    {formatCLP(item.total)}
                  </p>
                  <Link
                    className="text-muted hover:text-accent mt-2 inline-block text-xs font-semibold"
                    to={`/app/appointments/${item.id}`}
                  >
                    Ver avance →
                  </Link>
                  {isCustomerCancellable(item) && (
                    <>
                      <button
                        aria-label={`Reprogramar cita de ${item.motorcycle.label}`}
                        className="text-muted hover:text-accent mt-2 ml-4 text-xs font-semibold"
                        onClick={() => {
                          setCancellingAppointmentId(null);
                          setRescheduleDate(getNextBookableDate());
                          setRescheduleSlot('');
                          rescheduleAppointment.reset();
                          setReschedulingAppointmentId(item.id);
                        }}
                        type="button"
                      >
                        Reprogramar
                      </button>
                      <button
                        aria-controls={`cancel-appointment-${item.id}`}
                        aria-expanded={cancellingAppointmentId === item.id}
                        aria-label={`Cancelar cita de ${item.motorcycle.label}`}
                        className="text-primary hover:text-danger mt-2 ml-4 text-xs font-semibold"
                        onClick={() => {
                          cancelAppointment.reset();
                          setCancellationReason('');
                          setCancellingAppointmentId(item.id);
                        }}
                        type="button"
                      >
                        Cancelar cita
                      </button>
                    </>
                  )}
                </div>

                {cancellingAppointmentId === item.id && (
                  <div
                    className="bg-background basis-full rounded-xl border border-white/10 p-4 text-left"
                    id={`cancel-appointment-${item.id}`}
                  >
                    <label
                      className="text-sm font-semibold"
                      htmlFor={`cancellation-reason-${item.id}`}
                    >
                      Motivo de cancelación (opcional)
                    </label>
                    <input
                      className="bg-surface focus:border-primary mt-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none"
                      id={`cancellation-reason-${item.id}`}
                      maxLength={500}
                      onChange={(event) =>
                        setCancellationReason(event.target.value)
                      }
                      placeholder="Ej. Cambio de planes"
                      value={cancellationReason}
                    />
                    <p className="text-muted mt-2 text-xs">
                      Si indicas un motivo, debe tener al menos 3 caracteres.
                    </p>
                    {cancelAppointment.isError && (
                      <p className="text-primary mt-3 text-sm" role="alert">
                        No fue posible cancelar la cita. Actualiza la agenda e
                        inténtalo nuevamente.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="bg-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                        disabled={
                          cancelAppointment.isPending ||
                          isInvalidCancellationReason(cancellationReason)
                        }
                        onClick={() => {
                          const reason = cancellationReason.trim();
                          cancelAppointment.mutate({
                            appointmentId: item.id,
                            ...(reason && { reason }),
                          });
                        }}
                        type="button"
                      >
                        {cancelAppointment.isPending
                          ? 'Cancelando…'
                          : 'Confirmar cancelación'}
                      </button>
                      <button
                        className="text-muted hover:text-foreground rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold"
                        disabled={cancelAppointment.isPending}
                        onClick={() => {
                          cancelAppointment.reset();
                          setCancellationReason('');
                          setCancellingAppointmentId(null);
                        }}
                        type="button"
                      >
                        Conservar cita
                      </button>
                    </div>
                  </div>
                )}
                {reschedulingAppointmentId === item.id && (
                  <div className="bg-background basis-full rounded-xl border border-white/10 p-4 text-left">
                    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                      <AppointmentCalendar
                        minDate={getToday()}
                        onChange={(nextDate) => {
                          setRescheduleDate(nextDate);
                          setRescheduleSlot('');
                        }}
                        value={rescheduleDate}
                      />
                      <div>
                        <h3 className="text-sm font-bold">Nuevo horario</h3>
                        <p className="text-muted mt-1 text-xs">
                          La cita volverá a estado pendiente de confirmación.
                        </p>
                        {rescheduleAvailability.isFetching ? (
                          <p className="text-muted mt-5 text-sm">
                            Buscando horarios…
                          </p>
                        ) : (
                          <div className="mt-4">
                            <TimeSlotGroup
                              label="Disponibles"
                              onSelect={setRescheduleSlot}
                              selectedSlot={rescheduleSlot}
                              slots={rescheduleAvailability.data ?? []}
                            />
                          </div>
                        )}
                        {!rescheduleAvailability.isFetching &&
                          rescheduleAvailability.data?.length === 0 && (
                            <p className="text-muted mt-5 text-sm">
                              No hay horarios disponibles para este día.
                            </p>
                          )}
                        {rescheduleAppointment.isError && (
                          <p className="mt-4 text-sm text-red-400" role="alert">
                            El horario dejó de estar disponible. Selecciona
                            otro.
                          </p>
                        )}
                        <div className="mt-5 flex gap-2">
                          <button
                            className="bg-primary rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                            disabled={
                              !rescheduleSlot || rescheduleAppointment.isPending
                            }
                            onClick={() =>
                              rescheduleAppointment.mutate({
                                appointmentId: item.id,
                                startsAt: rescheduleSlot,
                              })
                            }
                            type="button"
                          >
                            {rescheduleAppointment.isPending
                              ? 'Reprogramando…'
                              : 'Confirmar cambio'}
                          </button>
                          <button
                            className="text-muted rounded-lg border border-white/10 px-4 py-2 text-xs"
                            onClick={() => setReschedulingAppointmentId(null)}
                            type="button"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TimeSlotGroup({
  label,
  onSelect,
  selectedSlot,
  slots,
}: {
  label: string;
  onSelect: (slot: string) => void;
  selectedSlot: string;
  slots: AvailabilitySlot[];
}) {
  if (slots.length === 0) return null;

  return (
    <div>
      <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => (
          <button
            aria-pressed={selectedSlot === slot.startsAt}
            className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
              selectedSlot === slot.startsAt
                ? 'border-primary bg-primary text-white shadow-[0_8px_20px_rgba(230,0,35,.22)]'
                : 'hover:border-primary/60 hover:bg-primary/10 border-white/10 bg-white/[0.035]'
            }`}
            key={slot.startsAt}
            onClick={() => onSelect(slot.startsAt)}
            type="button"
          >
            {slotTimeFormatter.format(new Date(slot.startsAt))}
          </button>
        ))}
      </div>
    </div>
  );
}

function isCustomerCancellable(appointment: Appointment): boolean {
  return (
    (appointment.status === 'requested' ||
      appointment.status === 'confirmed') &&
    new Date(appointment.startsAt).getTime() > Date.now()
  );
}

function isInvalidCancellationReason(reason: string): boolean {
  const length = reason.trim().length;
  return length > 0 && length < 3;
}
