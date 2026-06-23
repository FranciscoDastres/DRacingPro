import type { Service } from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';
import { formatCLP } from '../../components/ui/money';
import { PageHeader } from '../../components/ui/PageHeader';
import { apiClient } from '../../lib/api-client';

export function ServicesPage() {
  const query = useQuery({
    queryFn: () => apiClient.get<Service[]>('/v1/services'),
    queryKey: ['services'],
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        subtitle="Precios y duraciones de referencia para planificar tu visita."
        title="Servicios NAVI"
      />

      {query.isError && (
        <p className="border-primary/30 bg-primary/10 mt-2 rounded-xl border p-4 text-sm">
          No pudimos cargar los servicios. Intenta nuevamente.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {query.data?.map((service) => (
          <Card className="p-6" key={service.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent font-mono text-xs">{service.code}</p>
                <h2 className="font-display mt-2 text-xl font-bold">
                  {service.name}
                </h2>
              </div>
              <p className="text-primary font-display font-extrabold whitespace-nowrap">
                {formatCLP(service.price)}
              </p>
            </div>
            <p className="text-muted mt-4 leading-7">{service.description}</p>
            <p className="text-muted mt-5 flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4" name="clock" />
              {service.durationMinutes} minutos
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
