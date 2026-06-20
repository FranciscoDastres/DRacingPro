import { TZDate } from '@date-fns/tz';
import type {
  Appointment,
  AvailabilitySlot,
  CreateAppointmentInput,
} from '@dracing/contracts';
import type { DatabaseClient } from '@dracing/database';

const WORKSHOP_TIME_ZONE = 'America/Santiago';
const ACTIVE_STATUSES = [
  'requested',
  'confirmed',
  'checked_in',
  'in_service',
  'ready',
] as const;

export class AppointmentService {
  constructor(private readonly database: DatabaseClient) {}

  async getAvailability(
    serviceIds: string[],
    date: string,
  ): Promise<AvailabilitySlot[]> {
    const services = await this.database.services.findMany({
      where: { id: { in: serviceIds }, is_active: true },
    });
    if (services.length !== new Set(serviceIds).size) return [];

    const durationMinutes = services.reduce(
      (total, service) => total + service.duration_minutes,
      0,
    );
    const { dayEnd, dayStart, weekday } = getWorkshopDay(date);
    const databaseDate = new Date(`${date}T00:00:00.000Z`);
    const [hours, bays, appointments, exceptions] = await Promise.all([
      this.database.business_hours.findMany({
        orderBy: { opens_at: 'asc' },
        where: {
          valid_from: { lte: databaseDate },
          OR: [{ valid_until: null }, { valid_until: { gte: databaseDate } }],
          weekday,
        },
      }),
      this.database.service_bays.findMany({ where: { is_active: true } }),
      this.database.appointments.findMany({
        select: { ends_at: true, service_bay_id: true, starts_at: true },
        where: {
          ends_at: { gt: dayStart },
          starts_at: { lt: dayEnd },
          status: { in: [...ACTIVE_STATUSES] },
        },
      }),
      this.database.schedule_exceptions.findMany({
        where: { ends_at: { gt: dayStart }, starts_at: { lt: dayEnd } },
      }),
    ]);

    const slots: AvailabilitySlot[] = [];
    for (const interval of hours) {
      const intervalStart = workshopDateAtTime(date, interval.opens_at);
      const intervalEnd = workshopDateAtTime(date, interval.closes_at);
      for (
        let startsAt = intervalStart;
        startsAt.getTime() + durationMinutes * 60_000 <= intervalEnd.getTime();
        startsAt = new Date(startsAt.getTime() + interval.slot_minutes * 60_000)
      ) {
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        if (startsAt.getTime() <= Date.now()) continue;
        if (isClosedByException(startsAt, endsAt, exceptions)) continue;

        const capacityOverride = getCapacityOverride(
          startsAt,
          endsAt,
          exceptions,
        );
        const availableBays = bays.filter(
          (bay) =>
            !appointments.some(
              (appointment) =>
                appointment.service_bay_id === bay.id &&
                overlaps(
                  startsAt,
                  endsAt,
                  appointment.starts_at,
                  appointment.ends_at,
                ),
            ),
        );
        const capacity = capacityOverride ?? availableBays.length;
        if (availableBays.length > 0 && capacity > 0) {
          slots.push({
            endsAt: endsAt.toISOString(),
            startsAt: startsAt.toISOString(),
          });
        }
      }
    }
    return slots;
  }

  async create(
    customerUserId: string,
    input: CreateAppointmentInput,
  ): Promise<Appointment> {
    const requestedStart = new Date(input.startsAt);
    const workshopDate = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: WORKSHOP_TIME_ZONE,
      year: 'numeric',
    }).format(requestedStart);
    const slots = await this.getAvailability(input.serviceIds, workshopDate);
    if (!slots.some((slot) => slot.startsAt === requestedStart.toISOString())) {
      throw new AppointmentConflictError();
    }

    return this.database.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.startsAt}))`;
        const motorcycle = await transaction.motorcycles.findFirst({
          where: {
            id: input.motorcycleId,
            is_active: true,
            owner_user_id: customerUserId,
          },
        });
        if (!motorcycle)
          throw new AppointmentInputError('motorcycle_not_found');

        const services = await transaction.services.findMany({
          where: { id: { in: input.serviceIds }, is_active: true },
        });
        if (services.length !== new Set(input.serviceIds).size) {
          throw new AppointmentInputError('service_not_found');
        }

        const durationMinutes = services.reduce(
          (total, service) => total + service.duration_minutes,
          0,
        );
        const endsAt = new Date(
          requestedStart.getTime() + durationMinutes * 60_000,
        );
        const busyBays = await transaction.appointments.findMany({
          select: { service_bay_id: true },
          where: {
            ends_at: { gt: requestedStart },
            starts_at: { lt: endsAt },
            status: { in: [...ACTIVE_STATUSES] },
          },
        });
        const bay = await transaction.service_bays.findFirst({
          orderBy: { name: 'asc' },
          where: {
            id: {
              notIn: busyBays.map((appointment) => appointment.service_bay_id),
            },
            is_active: true,
          },
        });
        if (!bay) throw new AppointmentConflictError();

        const appointment = await transaction.appointments.create({
          data: {
            appointment_services: {
              create: services.map((service) => ({
                currency: service.currency,
                duration_minutes: service.duration_minutes,
                quantity: 1,
                service_id: service.id,
                service_name_snapshot: service.name,
                unit_price_cents: service.price_cents,
              })),
            },
            appointment_status_history: {
              create: { to_status: 'requested' },
            },
            customer_user_id: customerUserId,
            ends_at: endsAt,
            motorcycle_id: motorcycle.id,
            service_bay_id: bay.id,
            starts_at: requestedStart,
          },
          include: appointmentInclude,
        });
        return mapAppointment(appointment);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async list(customerUserId: string): Promise<Appointment[]> {
    const appointments = await this.database.appointments.findMany({
      include: appointmentInclude,
      orderBy: { starts_at: 'desc' },
      where: { customer_user_id: customerUserId },
    });
    return appointments.map(mapAppointment);
  }
}

export class AppointmentConflictError extends Error {}
export class AppointmentInputError extends Error {}

const appointmentInclude = {
  appointment_services: true,
  motorcycles: true,
} as const;

function mapAppointment(appointment: {
  appointment_services: Array<{
    service_id: string;
    service_name_snapshot: string;
  }>;
  ends_at: Date;
  id: string;
  motorcycles: {
    id: string;
    make: string;
    model: string;
    nickname: string | null;
  };
  starts_at: Date;
  status:
    | 'requested'
    | 'confirmed'
    | 'checked_in'
    | 'in_service'
    | 'ready'
    | 'completed'
    | 'cancelled'
    | 'no_show';
}): Appointment {
  return {
    endsAt: appointment.ends_at.toISOString(),
    id: appointment.id,
    motorcycle: {
      id: appointment.motorcycles.id,
      label:
        appointment.motorcycles.nickname ??
        `${appointment.motorcycles.make} ${appointment.motorcycles.model}`,
    },
    services: appointment.appointment_services.map((service) => ({
      id: service.service_id,
      name: service.service_name_snapshot,
    })),
    startsAt: appointment.starts_at.toISOString(),
    status: appointment.status,
  };
}

function getWorkshopDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) throw new AppointmentInputError('invalid_date');
  const dayStart = new TZDate(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    WORKSHOP_TIME_ZONE,
  );
  const dayEnd = new TZDate(
    year,
    month - 1,
    day + 1,
    0,
    0,
    0,
    WORKSHOP_TIME_ZONE,
  );
  return { dayEnd, dayStart, weekday: dayStart.getDay() };
}

function workshopDateAtTime(date: string, time: Date): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new TZDate(
    year!,
    month! - 1,
    day!,
    time.getUTCHours(),
    time.getUTCMinutes(),
    0,
    WORKSHOP_TIME_ZONE,
  );
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function isClosedByException(
  startsAt: Date,
  endsAt: Date,
  exceptions: Array<{ ends_at: Date; kind: string; starts_at: Date }>,
): boolean {
  return exceptions.some(
    (exception) =>
      exception.kind === 'closed' &&
      overlaps(startsAt, endsAt, exception.starts_at, exception.ends_at),
  );
}

function getCapacityOverride(
  startsAt: Date,
  endsAt: Date,
  exceptions: Array<{
    capacity_override: number | null;
    ends_at: Date;
    kind: string;
    starts_at: Date;
  }>,
): number | undefined {
  return (
    exceptions.find(
      (exception) =>
        exception.kind === 'availability_override' &&
        overlaps(startsAt, endsAt, exception.starts_at, exception.ends_at),
    )?.capacity_override ?? undefined
  );
}
