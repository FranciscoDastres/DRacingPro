import type {
  Appointment,
  AvailabilitySlot,
  Motorcycle,
  Service,
} from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiClient } from '../../lib/api-client';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [motorcycleId, setMotorcycleId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(getTomorrow());
  const [selectedSlot, setSelectedSlot] = useState('');

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

  const toggleService = (id: string) => {
    setSelectedSlot('');
    setServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <div>
      <p className="text-accent text-sm font-semibold">Agenda online</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Reservar una cita
      </h1>
      <p className="text-muted mt-3">
        Selecciona tu NAVI, los servicios y uno de los horarios disponibles.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="bg-surface rounded-2xl border border-white/10 p-6">
            <h2 className="font-bold">1. Elige tu moto</h2>
            <select
              className="bg-background focus:border-accent mt-4 w-full rounded-lg border border-white/10 px-3 py-3 text-sm outline-none"
              onChange={(event) => setMotorcycleId(event.target.value)}
              value={motorcycleId}
            >
              <option value="">Selecciona una Honda NAVI</option>
              {motorcycles.data?.map((motorcycle) => (
                <option key={motorcycle.id} value={motorcycle.id}>
                  {motorcycle.nickname ??
                    `${motorcycle.make} ${motorcycle.model}`}
                  {motorcycle.licensePlate
                    ? ` · ${motorcycle.licensePlate}`
                    : ''}
                </option>
              ))}
            </select>
          </section>

          <section className="bg-surface rounded-2xl border border-white/10 p-6">
            <h2 className="font-bold">2. Selecciona servicios</h2>
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

          <section className="bg-surface rounded-2xl border border-white/10 p-6">
            <h2 className="font-bold">3. Fecha y horario</h2>
            <input
              className="bg-background focus:border-accent mt-4 rounded-lg border border-white/10 px-3 py-3 text-sm outline-none"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedSlot('');
              }}
              type="date"
              value={date}
            />

            <div className="mt-5 flex flex-wrap gap-2">
              {availability.isFetching && (
                <p className="text-muted text-sm">Buscando horarios…</p>
              )}
              {availability.data?.map((slot) => (
                <button
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    selectedSlot === slot.startsAt
                      ? 'border-accent bg-accent text-background'
                      : 'hover:border-accent/50 border-white/10'
                  }`}
                  key={slot.startsAt}
                  onClick={() => setSelectedSlot(slot.startsAt)}
                  type="button"
                >
                  {new Date(slot.startsAt).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
              {!availability.isFetching && availability.data?.length === 0 && (
                <p className="text-muted text-sm">
                  No hay horarios para esta selección.
                </p>
              )}
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
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="font-semibold">Total estimado</dt>
              <dd className="text-primary font-black">
                ${totalPrice.toLocaleString('es-CL')}
              </dd>
            </div>
          </dl>
          {createAppointment.isError && (
            <p className="text-primary mt-4 text-sm">
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
            {createAppointment.isPending
              ? 'Reservando…'
              : 'Confirmar solicitud'}
          </button>
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-black">Tus citas</h2>
        <div className="mt-5 space-y-3">
          {appointments.data?.map((item) => (
            <article
              className="bg-surface flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-5"
              key={item.id}
            >
              <div>
                <p className="font-semibold">{item.motorcycle.label}</p>
                <p className="text-muted mt-1 text-sm">
                  {item.services.map((service) => service.name).join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {dateFormatter.format(new Date(item.startsAt))}
                </p>
                <p className="text-accent mt-1 text-xs">
                  {statusLabel(item.status)}
                </p>
                <Link
                  className="text-muted hover:text-accent mt-2 inline-block text-xs font-semibold"
                  to={`/app/appointments/${item.id}`}
                >
                  Ver avance →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function getTomorrow(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function statusLabel(status: Appointment['status']): string {
  const labels: Record<Appointment['status'], string> = {
    cancelled: 'Cancelada',
    checked_in: 'Moto recibida',
    completed: 'Completada',
    confirmed: 'Confirmada',
    in_service: 'En servicio',
    no_show: 'No asistió',
    ready: 'Lista para retiro',
    requested: 'Solicitud enviada',
  };
  return labels[status];
}
