import type {
  AdminService,
  BusinessHour,
  ScheduleException,
} from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiClient } from '../../lib/api-client';

const weekdays = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
const fieldClass =
  'rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-accent';

export function WorkshopSettingsPage() {
  const queryClient = useQueryClient();
  const [serviceName, setServiceName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(0);
  const [weekday, setWeekday] = useState(1);
  const [opensAt, setOpensAt] = useState('09:00');
  const [closesAt, setClosesAt] = useState('18:00');
  const [exceptionStart, setExceptionStart] = useState('');
  const [exceptionEnd, setExceptionEnd] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');

  const services = useQuery({
    queryFn: () => apiClient.get<AdminService[]>('/v1/admin/workshop/services'),
    queryKey: ['admin', 'workshop', 'services'],
  });
  const hours = useQuery({
    queryFn: () => apiClient.get<BusinessHour[]>('/v1/admin/workshop/hours'),
    queryKey: ['admin', 'workshop', 'hours'],
  });
  const exceptions = useQuery({
    queryFn: () =>
      apiClient.get<ScheduleException[]>('/v1/admin/workshop/exceptions'),
    queryKey: ['admin', 'workshop', 'exceptions'],
  });

  const createService = useMutation({
    mutationFn: () =>
      apiClient.post('/v1/admin/workshop/services', {
        code: serviceCode,
        currency: 'CLP',
        durationMinutes: duration,
        name: serviceName,
        price,
      }),
    onSuccess: async () => {
      setServiceCode('');
      setServiceName('');
      setPrice(0);
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'services'],
      });
    },
  });
  const toggleService = useMutation({
    mutationFn: (service: AdminService) =>
      apiClient.patch(`/v1/admin/workshop/services/${service.id}`, {
        isActive: !service.isActive,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'services'],
      }),
  });
  const saveHour = useMutation({
    mutationFn: () =>
      apiClient.post('/v1/admin/workshop/hours', {
        closesAt,
        opensAt,
        slotMinutes: 30,
        validFrom: new Date().toISOString().slice(0, 10),
        weekday,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'hours'],
      }),
  });
  const deleteHour = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/v1/admin/workshop/hours/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'hours'],
      }),
  });
  const createException = useMutation({
    mutationFn: () =>
      apiClient.post('/v1/admin/workshop/exceptions', {
        endsAt: new Date(exceptionEnd).toISOString(),
        kind: 'closed',
        reason: exceptionReason || undefined,
        startsAt: new Date(exceptionStart).toISOString(),
      }),
    onSuccess: async () => {
      setExceptionEnd('');
      setExceptionReason('');
      setExceptionStart('');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'exceptions'],
      });
    },
  });
  const deleteException = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/v1/admin/workshop/exceptions/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['admin', 'workshop', 'exceptions'],
      }),
  });

  return (
    <div>
      <p className="text-primary text-sm font-semibold">Administración</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Configuración del taller
      </h1>
      <p className="text-muted mt-3">
        Gestiona oferta, horario habitual y cierres especiales.
      </p>

      <section className="bg-surface mt-8 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold">Servicios</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_140px_120px_140px_auto]">
          <input
            aria-label="Nombre del servicio"
            className={fieldClass}
            onChange={(event) => setServiceName(event.target.value)}
            placeholder="Nombre del servicio"
            value={serviceName}
          />
          <input
            aria-label="Código del servicio"
            className={fieldClass}
            onChange={(event) => setServiceCode(event.target.value)}
            placeholder="Código"
            value={serviceCode}
          />
          <input
            aria-label="Duración del servicio en minutos"
            className={fieldClass}
            min="5"
            onChange={(event) => setDuration(Number(event.target.value))}
            placeholder="Minutos"
            type="number"
            value={duration}
          />
          <input
            aria-label="Precio del servicio en pesos chilenos"
            className={fieldClass}
            min="0"
            onChange={(event) => setPrice(Number(event.target.value))}
            placeholder="Precio CLP"
            type="number"
            value={price}
          />
          <button
            className="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            disabled={!serviceName || !serviceCode || createService.isPending}
            onClick={() => createService.mutate()}
            type="button"
          >
            Agregar
          </button>
        </div>
        <div className="mt-6 divide-y divide-white/10">
          {services.data?.map((service) => (
            <div
              className="flex items-center justify-between gap-4 py-4"
              key={service.id}
            >
              <div>
                <p className="font-semibold">{service.name}</p>
                <p className="text-muted mt-1 text-xs">
                  {service.code} · {service.durationMinutes} min · $
                  {service.price.toLocaleString('es-CL')}
                </p>
              </div>
              <button
                aria-label={`${service.isActive ? 'Desactivar' : 'Activar'} ${service.name}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  service.isActive
                    ? 'bg-success/10 text-success'
                    : 'text-muted bg-white/5'
                }`}
                onClick={() => toggleService.mutate(service)}
                type="button"
              >
                {service.isActive ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface mt-6 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold">Horario semanal</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <select
            aria-label="Día de la semana"
            className={fieldClass}
            onChange={(event) => setWeekday(Number(event.target.value))}
            value={weekday}
          >
            {weekdays.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
          <input
            aria-label="Hora de apertura"
            className={fieldClass}
            onChange={(event) => setOpensAt(event.target.value)}
            type="time"
            value={opensAt}
          />
          <input
            aria-label="Hora de cierre"
            className={fieldClass}
            onChange={(event) => setClosesAt(event.target.value)}
            type="time"
            value={closesAt}
          />
          <button
            className="bg-accent text-background rounded-lg px-4 py-2 text-sm font-black"
            onClick={() => saveHour.mutate()}
            type="button"
          >
            Guardar intervalo
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hours.data?.map((hour) => (
            <div
              className="rounded-xl border border-white/10 p-4"
              key={hour.id}
            >
              <p className="font-semibold">{weekdays[hour.weekday]}</p>
              <p className="text-muted mt-1 text-sm">
                {hour.opensAt}–{hour.closesAt} · cada {hour.slotMinutes} min
              </p>
              <button
                aria-label={`Eliminar horario de ${weekdays[hour.weekday]}`}
                className="text-primary mt-3 text-xs font-semibold"
                onClick={() => deleteHour.mutate(hour.id)}
                type="button"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface mt-6 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-bold">Cierres y excepciones</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            aria-label="Inicio del cierre"
            className={fieldClass}
            onChange={(event) => setExceptionStart(event.target.value)}
            type="datetime-local"
            value={exceptionStart}
          />
          <input
            aria-label="Fin del cierre"
            className={fieldClass}
            onChange={(event) => setExceptionEnd(event.target.value)}
            type="datetime-local"
            value={exceptionEnd}
          />
          <input
            aria-label="Motivo del cierre"
            className={fieldClass}
            onChange={(event) => setExceptionReason(event.target.value)}
            placeholder="Motivo"
            value={exceptionReason}
          />
          <button
            className="bg-primary rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            disabled={
              !exceptionStart || !exceptionEnd || createException.isPending
            }
            onClick={() => createException.mutate()}
            type="button"
          >
            Registrar cierre
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {exceptions.data?.map((exception) => (
            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-4"
              key={exception.id}
            >
              <div>
                <p className="font-semibold">
                  {exception.reason ?? 'Cierre del taller'}
                </p>
                <p className="text-muted mt-1 text-xs">
                  {new Date(exception.startsAt).toLocaleString('es-CL')} →{' '}
                  {new Date(exception.endsAt).toLocaleString('es-CL')}
                </p>
              </div>
              <button
                aria-label={`Eliminar cierre ${exception.reason ?? 'del taller'}`}
                className="text-primary text-xs font-semibold"
                onClick={() => deleteException.mutate(exception.id)}
                type="button"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
