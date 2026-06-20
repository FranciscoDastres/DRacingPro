import type { Service } from '@dracing/contracts';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../../lib/api-client';

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  currency: 'CLP',
  maximumFractionDigits: 0,
  style: 'currency',
});

export function ServicesPage() {
  const query = useQuery({
    queryFn: () => apiClient.get<Service[]>('/v1/services'),
    queryKey: ['services'],
    staleTime: 5 * 60_000,
  });

  return (
    <div>
      <p className="text-accent text-sm font-semibold">Catálogo</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Servicios NAVI
      </h1>
      <p className="text-muted mt-3">
        Precios y duraciones de referencia para planificar tu visita.
      </p>

      {query.isError && (
        <p className="border-primary/30 bg-primary/10 mt-8 rounded-xl border p-4 text-sm">
          No pudimos cargar los servicios. Intenta nuevamente.
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {query.data?.map((service) => (
          <article
            className="bg-surface rounded-2xl border border-white/10 p-6"
            key={service.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-accent font-mono text-xs">{service.code}</p>
                <h2 className="mt-2 text-xl font-bold">{service.name}</h2>
              </div>
              <p className="text-primary font-black whitespace-nowrap">
                {currencyFormatter.format(service.price)}
              </p>
            </div>
            <p className="text-muted mt-4 leading-7">{service.description}</p>
            <p className="mt-5 text-sm font-semibold">
              {service.durationMinutes} minutos
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
