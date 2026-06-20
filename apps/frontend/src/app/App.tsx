import type { HealthResponse } from '@dracing/contracts';
import { useEffect, useState } from 'react';

type ApiState = 'checking' | 'online' | 'offline';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function App() {
  const [apiState, setApiState] = useState<ApiState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    const checkApi = async () => {
      try {
        const response = await fetch(`${API_URL}/health/live`, {
          signal: controller.signal,
        });
        const health = (await response.json()) as HealthResponse;
        setApiState(
          response.ok && health.status === 'ok' ? 'online' : 'offline',
        );
      } catch {
        if (!controller.signal.aborted) {
          setApiState('offline');
        }
      }
    };

    void checkApi();
    return () => controller.abort();
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(39,211,194,0.12),transparent_30%),radial-gradient(circle_at_10%_70%,rgba(240,68,56,0.1),transparent_34%)]" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a
          className="flex items-center gap-3"
          href="#top"
          aria-label="D Racing Pro"
        >
          <span className="bg-primary grid size-10 place-items-center rounded-xl font-black text-white italic shadow-[0_0_30px_rgba(240,68,56,0.25)]">
            DR
          </span>
          <span className="text-sm font-bold tracking-[0.24em] uppercase">
            D Racing <span className="text-accent">Pro</span>
          </span>
        </a>

        <div className="text-muted flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <span
            className={`size-2 rounded-full ${
              apiState === 'online'
                ? 'bg-success shadow-[0_0_10px_var(--color-success)]'
                : apiState === 'offline'
                  ? 'bg-primary'
                  : 'bg-warning animate-pulse'
            }`}
          />
          {apiState === 'online'
            ? 'Sistema operativo'
            : apiState === 'offline'
              ? 'API sin conexión'
              : 'Verificando sistema'}
        </div>
      </header>

      <main
        id="top"
        className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 lg:px-10 lg:pt-28"
      >
        <div className="max-w-4xl">
          <p className="text-accent mb-6 flex items-center gap-3 text-xs font-bold tracking-[0.28em] uppercase">
            <span className="bg-accent h-px w-10" />
            Especialistas Honda NAVI
          </p>
          <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Tu NAVI lista para
            <span className="from-primary block bg-gradient-to-r to-[#ff8a60] bg-clip-text text-transparent">
              volver a rodar.
            </span>
          </h1>
          <p className="text-muted mt-8 max-w-2xl text-lg leading-8 sm:text-xl">
            Agenda mantenciones, sigue el avance del trabajo y conserva todo el
            historial de tu moto en un solo lugar.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              className="bg-primary focus-visible:outline-accent rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(240,68,56,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ff554a] focus-visible:outline-2 focus-visible:outline-offset-4"
              href={`${API_URL}/v1/auth/google?returnTo=/`}
            >
              Ingresar con Google
            </a>
            <span className="text-muted text-sm">Agenda disponible 24/7</span>
          </div>
        </div>

        <section
          className="mt-16 grid gap-4 md:grid-cols-3"
          aria-label="Características"
        >
          {[
            [
              '01',
              'Agenda simple',
              'Elige servicio, fecha y hora sin llamadas.',
            ],
            [
              '02',
              'Estado en vivo',
              'Revisa cada etapa del trabajo desde tu teléfono.',
            ],
            [
              '03',
              'Historial completo',
              'Servicios y kilometraje siempre disponibles.',
            ],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className="group bg-surface/85 hover:border-accent/40 rounded-2xl border border-white/10 p-6 backdrop-blur-sm transition hover:-translate-y-1"
            >
              <span className="text-accent font-mono text-xs">{number}</span>
              <h2 className="mt-8 text-xl font-bold">{title}</h2>
              <p className="text-muted mt-3 leading-7">{description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
