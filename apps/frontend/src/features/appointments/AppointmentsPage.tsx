import { AppointmentCalendar } from './AppointmentCalendar';
import { dateFormatter, selectedDateFormatter } from './appointment-formatters';
import {
  getMaxBookableDate,
  getToday,
  isValidChileanPhone,
  parseLocalDate,
} from './appointment-helpers';
import { AppointmentListSection } from './AppointmentListSection';
import { TimeSlotGroup } from './TimeSlotGroup';
import { useBookingFlow } from './useBookingFlow';

export function AppointmentsPage() {
  const booking = useBookingFlow();

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
              {booking.services.data?.map((service) => (
                <label
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    booking.serviceIds.includes(service.id)
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  key={service.id}
                >
                  <input
                    checked={booking.serviceIds.includes(service.id)}
                    className="sr-only"
                    onChange={() => booking.toggleService(service.id)}
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
                maxDate={getMaxBookableDate()}
                minDate={getToday()}
                onChange={booking.selectDate}
                value={booking.date}
              />

              <div>
                <p className="font-display text-sm font-bold tracking-[0.06em] capitalize uppercase">
                  {selectedDateFormatter.format(parseLocalDate(booking.date))}
                </p>
                <p className="text-muted mt-2 text-xs">
                  La colación de 14:00 a 15:00 no admite reservas.
                </p>

                {booking.serviceIds.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-white/15 p-6 text-center">
                    <p className="text-sm font-semibold">
                      Selecciona al menos un servicio
                    </p>
                    <p className="text-muted mt-2 text-xs">
                      Así podremos calcular la duración y mostrar los horarios.
                    </p>
                  </div>
                ) : booking.availability.isFetching ? (
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
                ) : booking.availableSlots.length > 0 ? (
                  <div className="mt-6 space-y-6">
                    <TimeSlotGroup
                      label="Mañana"
                      onSelect={booking.selectSlot}
                      selectedSlot={booking.selectedSlot}
                      slots={booking.morningSlots}
                    />
                    <div className="text-muted flex items-center gap-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
                      <span className="h-px flex-1 bg-white/10" />
                      Colación · 14:00–15:00
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <TimeSlotGroup
                      label="Tarde"
                      onSelect={booking.selectSlot}
                      selectedSlot={booking.selectedSlot}
                      slots={booking.afternoonSlots}
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
              <dd>{booking.selectedServices.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Duración</dt>
              <dd>{booking.totalMinutes} min</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Horario</dt>
              <dd className="text-right">
                {booking.selectedSlot
                  ? dateFormatter.format(new Date(booking.selectedSlot))
                  : 'Por seleccionar'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="font-semibold">Total estimado</dt>
              <dd className="text-primary font-black">
                ${booking.totalPrice.toLocaleString('es-CL')}
              </dd>
            </div>
          </dl>
          <div className="mt-5">
            <label
              className="text-muted block text-xs font-semibold"
              htmlFor="whatsapp-phone"
            >
              WhatsApp para coordinación
            </label>
            <input
              autoComplete="tel"
              className="border-accent/30 bg-surface mt-2 w-full rounded-xl border px-4 py-2.5 text-sm"
              id="whatsapp-phone"
              inputMode="tel"
              onChange={(event) => booking.setWhatsappPhone(event.target.value)}
              placeholder="+56 9 1234 5678"
              type="tel"
              value={booking.whatsappPhone}
            />
            {!isValidChileanPhone(booking.whatsappPhone) &&
              booking.whatsappPhone.length > 4 && (
                <p className="text-primary mt-1 text-xs">
                  Ingresa un número chileno válido (+56 9 XXXX XXXX).
                </p>
              )}
          </div>
          {booking.createAppointment.isError && (
            <p className="text-primary mt-4 text-sm" role="alert">
              No pudimos iniciar el pago. Revisa el horario y tu número, e
              inténtalo nuevamente.
            </p>
          )}
          <button
            className="bg-primary mt-6 w-full rounded-xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !booking.motorcycleId ||
              booking.serviceIds.length === 0 ||
              !booking.selectedSlot ||
              !isValidChileanPhone(booking.whatsappPhone) ||
              booking.createAppointment.isPending
            }
            onClick={() => booking.createAppointment.mutate()}
            type="button"
          >
            {booking.createAppointment.isPending
              ? 'Redirigiendo al pago…'
              : 'Confirmar y pagar'}
          </button>
          <p className="text-muted mt-3 text-center text-xs">
            Serás redirigido a Flow para completar el pago de forma segura.
          </p>
        </aside>
      </div>

      <AppointmentListSection />
    </div>
  );
}
