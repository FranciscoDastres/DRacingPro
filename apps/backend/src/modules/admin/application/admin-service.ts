import { TZDate } from '@date-fns/tz';
import type {
  AdminMetrics,
  AdminMetricsFilters,
  AdminUser,
  UpdateUserInput,
} from '@dracing/contracts';
import type { DatabaseClient } from '@dracing/database';

const WORKSHOP_TIME_ZONE = 'America/Santiago';

export class AdminUserError extends Error {}

export class AdminService {
  constructor(private readonly database: DatabaseClient) {}

  async listUsers(): Promise<AdminUser[]> {
    const [users, completed] = await Promise.all([
      this.database.users.findMany({
        include: { _count: { select: { appointments: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.database.appointments.findMany({
        select: {
          appointment_services: {
            select: { quantity: true, unit_price_cents: true },
          },
          customer_user_id: true,
        },
        where: { status: 'completed' },
      }),
    ]);

    const spentByUser = new Map<string, number>();
    for (const appointment of completed) {
      const total = appointment.appointment_services.reduce(
        (sum, service) => sum + service.unit_price_cents * service.quantity,
        0,
      );
      spentByUser.set(
        appointment.customer_user_id,
        (spentByUser.get(appointment.customer_user_id) ?? 0) + total,
      );
    }

    return users.map((user) => ({
      appointmentCount: user._count.appointments,
      createdAt: user.created_at.toISOString(),
      displayName: user.display_name,
      email: user.email,
      id: user.id,
      isActive: user.is_active,
      isPrimaryAdmin: user.role === 'admin',
      phone: user.phone,
      role: user.role,
      totalSpent: spentByUser.get(user.id) ?? 0,
    }));
  }

  async updateUser(
    actorUserId: string,
    userId: string,
    input: UpdateUserInput,
  ): Promise<AdminUser> {
    const target = await this.database.users.findUnique({
      where: { id: userId },
    });
    if (!target) throw new AdminUserError('user_not_found');

    // The only administrator cannot be disabled or changed from the client UI.
    if (target.role === 'admin') {
      throw new AdminUserError('cannot_modify_primary_admin');
    }
    if (actorUserId === userId && input.isActive === false) {
      throw new AdminUserError('cannot_disable_self');
    }

    await this.database.users.update({
      data: {
        ...(input.isActive !== undefined && { is_active: input.isActive }),
      },
      where: { id: userId },
    });

    const [updated] = await this.listUsers().then((all) =>
      all.filter((user) => user.id === userId),
    );
    if (!updated) throw new AdminUserError('user_not_found');
    return updated;
  }

  async getMetrics(filters: AdminMetricsFilters): Promise<AdminMetrics> {
    const dayStart = workshopDayStart(filters.from);
    const dayEnd = workshopDayStart(addDays(filters.to, 1));

    const [appointments, pendingRequests] = await Promise.all([
      this.database.appointments.findMany({
        select: {
          appointment_services: {
            select: {
              quantity: true,
              service_name_snapshot: true,
              unit_price_cents: true,
            },
          },
          starts_at: true,
          status: true,
        },
        where: { starts_at: { gte: dayStart, lt: dayEnd } },
      }),
      this.database.appointments.count({ where: { status: 'requested' } }),
    ]);

    const appointmentsByStatus: Record<string, number> = {};
    const revenueByDayMap = new Map<string, number>();
    const revenueByServiceMap = new Map<string, number>();
    let totalRevenue = 0;
    let completedCount = 0;

    for (const appointment of appointments) {
      appointmentsByStatus[appointment.status] =
        (appointmentsByStatus[appointment.status] ?? 0) + 1;
      if (appointment.status !== 'completed') continue;

      completedCount += 1;
      const day = formatWorkshopDate(appointment.starts_at);
      let appointmentTotal = 0;
      for (const service of appointment.appointment_services) {
        const amount = service.unit_price_cents * service.quantity;
        appointmentTotal += amount;
        revenueByServiceMap.set(
          service.service_name_snapshot,
          (revenueByServiceMap.get(service.service_name_snapshot) ?? 0) +
            amount,
        );
      }
      totalRevenue += appointmentTotal;
      revenueByDayMap.set(
        day,
        (revenueByDayMap.get(day) ?? 0) + appointmentTotal,
      );
    }

    return {
      appointmentsByStatus,
      averageTicket: completedCount
        ? Math.round(totalRevenue / completedCount)
        : 0,
      completedCount,
      pendingRequests,
      revenueByDay: enumerateDays(filters.from, filters.to).map((date) => ({
        date,
        total: revenueByDayMap.get(date) ?? 0,
      })),
      revenueByService: [...revenueByServiceMap.entries()]
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
      totalRevenue,
    };
  }
}

function workshopDayStart(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new TZDate(year!, month! - 1, day!, 0, 0, 0, WORKSHOP_TIME_ZONE);
}

function formatWorkshopDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: WORKSHOP_TIME_ZONE,
    year: 'numeric',
  }).format(date);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  return next.toISOString().slice(0, 10);
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  // Cap to avoid runaway loops; ranges are validated to be small in practice.
  for (let i = 0; i < 366 && cursor <= to; i += 1) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}
