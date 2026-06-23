import type { AdminAppointment, AdminMetrics } from '@dracing/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, StatCard } from '../../components/ui/Card';
import { BarChart, BarList, type ChartPoint } from '../../components/ui/Chart';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCLP } from '../../components/ui/money';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiClient } from '../../lib/api-client';

const RANGE_DAYS = 30;

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (RANGE_DAYS - 1));
  const range = { from: isoDate(from), to: isoDate(to) };

  const metricsQuery = useQuery({
    queryFn: () =>
      apiClient.get<AdminMetrics>(
        `/v1/admin/metrics?from=${range.from}&to=${range.to}`,
      ),
    queryKey: ['admin', 'metrics', range.from, range.to],
  });

  const pendingQuery = useQuery({
    queryFn: () =>
      apiClient.get<AdminAppointment[]>(
        `/v1/admin/appointments?from=${range.from}&to=${isoDate(
          new Date(to.getTime() + 60 * 24 * 60 * 60 * 1000),
        )}&statuses=requested`,
      ),
    queryKey: ['admin', 'pending-requests'],
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/v1/admin/appointments/${id}/status`, {
        status: 'confirmed',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'pending-requests'],
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });

  const metrics = metricsQuery.data;
  const pending = pendingQuery.data ?? [];

  const revenueByDay: ChartPoint[] = (metrics?.revenueByDay ?? []).map(
    (point) => ({
      display: formatCLP(point.total),
      label: point.date.slice(8, 10),
      value: point.total,
    }),
  );
  const revenueByService: ChartPoint[] = (metrics?.revenueByService ?? []).map(
    (point) => ({
      display: formatCLP(point.total),
      label: point.name,
      value: point.total,
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        subtitle={`Resumen del taller · últimos ${RANGE_DAYS} días`}
        title="Panel"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          accent="success"
          hint="Citas completadas en el período"
          icon="wallet"
          label="Ingresos"
          value={formatCLP(metrics?.totalRevenue ?? 0)}
        />
        <StatCard
          icon="check"
          label="Citas completadas"
          value={metrics?.completedCount ?? 0}
        />
        <StatCard
          icon="chart"
          label="Ticket promedio"
          value={formatCLP(metrics?.averageTicket ?? 0)}
        />
        <StatCard
          accent="warning"
          hint="Esperando confirmación"
          icon="clock"
          label="Solicitudes pendientes"
          value={metrics?.pendingRequests ?? 0}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">
            Ingresos por día
          </h2>
          {revenueByDay.some((point) => point.value > 0) ? (
            <div className="mt-4">
              <BarChart data={revenueByDay} />
            </div>
          ) : (
            <p className="text-muted mt-6 text-sm">
              Aún no hay ingresos registrados en el período.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">
            Ingresos por servicio
          </h2>
          {revenueByService.length > 0 ? (
            <div className="mt-4">
              <BarList data={revenueByService} />
            </div>
          ) : (
            <p className="text-muted mt-6 text-sm">Sin datos todavía.</p>
          )}
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="font-display mb-3 text-sm font-bold tracking-wide text-white uppercase">
          Citas solicitadas
        </h2>
        {pending.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Sin solicitudes pendientes"
            description="Las nuevas reservas de clientes aparecerán aquí para que las confirmes."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((appointment) => (
              <Card
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={appointment.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-semibold">
                      {appointment.customer.displayName}
                    </p>
                    <Badge tone="neutral">Solicitada</Badge>
                  </div>
                  <p className="text-muted mt-0.5 text-sm">
                    {appointment.motorcycle.label} ·{' '}
                    {dateTimeFormatter.format(new Date(appointment.startsAt))} ·{' '}
                    {formatCLP(appointment.total)}
                  </p>
                </div>
                <Button
                  disabled={confirmMutation.isPending}
                  icon="check"
                  onClick={() => confirmMutation.mutate(appointment.id)}
                  size="sm"
                >
                  Confirmar
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
