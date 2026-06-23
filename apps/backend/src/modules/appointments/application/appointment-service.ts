import { TZDate } from '@date-fns/tz';
import type {
  AdminAppointment,
  AdminAppointmentFilters,
  Appointment,
  AppointmentTimeline,
  AvailabilitySlot,
  CancelAppointmentInput,
  CreateMotorcycleStatusUpdateInput,
  CreateAppointmentInput,
  CustomerMotorcycleUpdate,
  ReassignAppointmentInput,
  ServiceBay,
  UpdateAppointmentStatusInput,
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
        select: { ends_at: true, starts_at: true },
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
        const hasConflictingAppointment = appointments.some((appointment) =>
          overlaps(
            startsAt,
            endsAt,
            appointment.starts_at,
            appointment.ends_at,
          ),
        );
        const capacity = capacityOverride ?? bays.length;
        if (!hasConflictingAppointment && bays.length > 0 && capacity > 0) {
          slots.push({
            endsAt: endsAt.toISOString(),
            startsAt: new Date(startsAt).toISOString(),
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
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('workshop_appointments'))`;
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
        const conflictingAppointment = await transaction.appointments.findFirst(
          {
            select: { id: true },
            where: {
              ends_at: { gt: requestedStart },
              starts_at: { lt: endsAt },
              status: { in: [...ACTIVE_STATUSES] },
            },
          },
        );
        if (conflictingAppointment) throw new AppointmentConflictError();

        const bay = await transaction.service_bays.findFirst({
          orderBy: { name: 'asc' },
          where: { is_active: true },
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

  async cancel(
    customerUserId: string,
    appointmentId: string,
    input: CancelAppointmentInput,
  ): Promise<Appointment> {
    return this.database.$transaction(async (transaction) => {
      const current = await transaction.appointments.findFirst({
        where: { customer_user_id: customerUserId, id: appointmentId },
      });
      if (!current) throw new AppointmentInputError('appointment_not_found');
      if (
        current.starts_at <= new Date() ||
        !CUSTOMER_CANCELLABLE_STATUSES.includes(current.status)
      ) {
        throw new AppointmentTransitionError();
      }

      const reason = input.reason ?? 'Cancelada por cliente';
      const updated = await transaction.appointments.update({
        data: {
          cancellation_reason: reason,
          cancelled_at: new Date(),
          status: 'cancelled',
          version: { increment: 1 },
        },
        include: appointmentInclude,
        where: { id: appointmentId, version: current.version },
      });
      await transaction.appointment_status_history.create({
        data: {
          appointment_id: appointmentId,
          changed_by_user_id: customerUserId,
          from_status: current.status,
          reason,
          to_status: 'cancelled',
        },
      });
      return mapAppointment(updated);
    });
  }

  async list(customerUserId: string): Promise<Appointment[]> {
    const appointments = await this.database.appointments.findMany({
      include: appointmentInclude,
      orderBy: { starts_at: 'desc' },
      where: { customer_user_id: customerUserId },
    });
    return appointments.map(mapAppointment);
  }

  async listServiceBays(): Promise<ServiceBay[]> {
    const serviceBays = await this.database.service_bays.findMany({
      orderBy: { name: 'asc' },
      where: { is_active: true },
    });
    return serviceBays.map(mapServiceBay);
  }

  async listAdmin(
    filters?: AdminAppointmentFilters,
  ): Promise<AdminAppointment[]> {
    const statusFilter =
      filters?.statuses ?? (!filters ? [...ACTIVE_STATUSES] : undefined);
    const appointments = await this.database.appointments.findMany({
      include: adminAppointmentInclude,
      orderBy: { starts_at: 'asc' },
      where: {
        ...(statusFilter && { status: { in: statusFilter } }),
        starts_at: filters
          ? {
              gte: getWorkshopDay(filters.from).dayStart,
              lt: getWorkshopDay(filters.to).dayStart,
            }
          : { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return appointments.map(mapAdminAppointment);
  }

  async reassignServiceBay(
    adminUserId: string,
    appointmentId: string,
    input: ReassignAppointmentInput,
  ): Promise<AdminAppointment> {
    return this.database.$transaction(async (transaction) => {
      const current = await transaction.appointments.findUnique({
        include: adminAppointmentInclude,
        where: { id: appointmentId },
      });
      if (!current) throw new AppointmentInputError('appointment_not_found');
      if (!ACTIVE_STATUSES.some((status) => status === current.status)) {
        throw new AppointmentTransitionError();
      }

      const targetBay = await transaction.service_bays.findFirst({
        where: { id: input.serviceBayId, is_active: true },
      });
      if (!targetBay) throw new AppointmentInputError('service_bay_not_found');
      if (current.service_bay_id === targetBay.id) {
        return mapAdminAppointment(current);
      }

      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${targetBay.id}))`;
      const conflict = await transaction.appointments.findFirst({
        select: { id: true },
        where: {
          ends_at: { gt: current.starts_at },
          id: { not: current.id },
          service_bay_id: targetBay.id,
          starts_at: { lt: current.ends_at },
          status: { in: [...ACTIVE_STATUSES] },
        },
      });
      if (conflict) throw new AppointmentConflictError();

      const updated = await transaction.appointments.update({
        data: {
          service_bay_id: targetBay.id,
          version: { increment: 1 },
        },
        include: adminAppointmentInclude,
        where: { id: appointmentId, version: current.version },
      });
      await transaction.audit_logs.create({
        data: {
          action: 'appointment.service_bay_reassigned',
          actor_user_id: adminUserId,
          entity_id: appointmentId,
          entity_type: 'appointment',
          metadata: {
            fromServiceBayId: current.service_bay_id,
            toServiceBayId: targetBay.id,
          },
        },
      });
      return mapAdminAppointment(updated);
    });
  }

  async updateStatus(
    adminUserId: string,
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
  ): Promise<Appointment> {
    return this.database.$transaction(async (transaction) => {
      const current = await transaction.appointments.findUnique({
        where: { id: appointmentId },
      });
      if (!current) throw new AppointmentInputError('appointment_not_found');
      if (
        !ALLOWED_STATUS_TRANSITIONS[current.status].some(
          (status: Appointment['status']) => status === input.status,
        )
      ) {
        throw new AppointmentTransitionError();
      }

      const updated = await transaction.appointments.update({
        data: {
          ...(input.status === 'cancelled' && { cancelled_at: new Date() }),
          ...(input.status === 'cancelled' && {
            cancellation_reason: input.reason ?? 'Cancelada por administración',
          }),
          status: input.status,
          version: { increment: 1 },
        },
        include: appointmentInclude,
        where: { id: appointmentId, version: current.version },
      });
      await transaction.appointment_status_history.create({
        data: {
          appointment_id: appointmentId,
          changed_by_user_id: adminUserId,
          from_status: current.status,
          reason: input.reason ?? null,
          to_status: input.status,
        },
      });
      return mapAppointment(updated);
    });
  }

  async addMotorcycleUpdate(
    adminUserId: string,
    appointmentId: string,
    input: CreateMotorcycleStatusUpdateInput,
  ): Promise<{ id: string }> {
    const appointment = await this.database.appointments.findUnique({
      select: { id: true },
      where: { id: appointmentId },
    });
    if (!appointment) throw new AppointmentInputError('appointment_not_found');

    return this.database.motorcycle_status_updates.create({
      data: {
        appointment_id: appointmentId,
        created_by_user_id: adminUserId,
        customer_visible: input.customerVisible,
        message: input.message ?? null,
        odometer_km: input.odometerKm ?? null,
        progress_status: input.progressStatus,
      },
      select: { id: true },
    });
  }

  async getTimeline(
    customerUserId: string,
    appointmentId: string,
  ): Promise<AppointmentTimeline> {
    const appointment = await this.database.appointments.findFirst({
      include: {
        ...appointmentInclude,
        motorcycle_status_updates: {
          orderBy: { created_at: 'asc' },
          where: { customer_visible: true },
        },
      },
      where: { customer_user_id: customerUserId, id: appointmentId },
    });
    if (!appointment) throw new AppointmentInputError('appointment_not_found');

    const mappedAppointment = mapAppointment(appointment);
    return {
      appointment: mappedAppointment,
      updates: appointment.motorcycle_status_updates.map((update) =>
        mapCustomerUpdate(update, mappedAppointment.motorcycle.label),
      ),
    };
  }

  async listCustomerUpdates(
    customerUserId: string,
  ): Promise<CustomerMotorcycleUpdate[]> {
    const updates = await this.database.motorcycle_status_updates.findMany({
      include: { appointments: { include: { motorcycles: true } } },
      orderBy: { created_at: 'desc' },
      take: 20,
      where: {
        appointments: { customer_user_id: customerUserId },
        customer_visible: true,
      },
    });

    return updates.map((update) =>
      mapCustomerUpdate(
        update,
        update.appointments.motorcycles.nickname ??
          `${update.appointments.motorcycles.make} ${update.appointments.motorcycles.model}`,
      ),
    );
  }
}

export class AppointmentConflictError extends Error {}
export class AppointmentInputError extends Error {}
export class AppointmentTransitionError extends Error {}

const CUSTOMER_CANCELLABLE_STATUSES: Appointment['status'][] = [
  'requested',
  'confirmed',
];

const ALLOWED_STATUS_TRANSITIONS = {
  cancelled: [],
  checked_in: ['in_service', 'cancelled'],
  completed: [],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  in_service: ['ready'],
  no_show: [],
  ready: ['completed'],
  requested: ['confirmed', 'cancelled'],
} as const satisfies Record<
  Appointment['status'],
  readonly Appointment['status'][]
>;

const appointmentInclude = {
  appointment_services: true,
  motorcycles: true,
} as const;
const adminAppointmentInclude = {
  ...appointmentInclude,
  service_bays: true,
  users: true,
} as const;

function mapAppointment(appointment: {
  appointment_services: Array<{
    currency: string;
    quantity: number;
    service_id: string;
    service_name_snapshot: string;
    unit_price_cents: number;
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
      currency: service.currency,
      id: service.service_id,
      name: service.service_name_snapshot,
      unitPrice: service.unit_price_cents,
    })),
    startsAt: appointment.starts_at.toISOString(),
    status: appointment.status,
    total: appointment.appointment_services.reduce(
      (sum, service) => sum + service.unit_price_cents * service.quantity,
      0,
    ),
  };
}

function mapAdminAppointment(
  appointment: Parameters<typeof mapAppointment>[0] & {
    service_bays: {
      description: string | null;
      id: string;
      name: string;
    };
    users: {
      display_name: string;
      email: string;
      id: string;
    };
  },
): AdminAppointment {
  return {
    ...mapAppointment(appointment),
    customer: {
      displayName: appointment.users.display_name,
      email: appointment.users.email,
      id: appointment.users.id,
    },
    serviceBay: mapServiceBay(appointment.service_bays),
  };
}

function mapServiceBay(serviceBay: {
  description: string | null;
  id: string;
  name: string;
}): ServiceBay {
  return {
    description: serviceBay.description,
    id: serviceBay.id,
    name: serviceBay.name,
  };
}

function mapCustomerUpdate(
  update: {
    appointment_id: string;
    created_at: Date;
    id: string;
    message: string | null;
    progress_status:
      | 'received'
      | 'diagnosing'
      | 'waiting_approval'
      | 'repairing'
      | 'quality_check'
      | 'ready_for_pickup'
      | 'delivered';
  },
  motorcycleLabel: string,
): CustomerMotorcycleUpdate {
  return {
    appointmentId: update.appointment_id,
    createdAt: update.created_at.toISOString(),
    id: update.id,
    message: update.message,
    motorcycleLabel,
    progressStatus: update.progress_status,
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
