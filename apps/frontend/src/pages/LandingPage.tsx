import type { HealthResponse } from '@dracing/contracts';
import { useEffect, useState, type ReactNode } from 'react';

type ApiState = 'checking' | 'online' | 'offline';
type IconName =
  | 'bike'
  | 'calendar'
  | 'check'
  | 'clock'
  | 'close'
  | 'history'
  | 'menu'
  | 'shield'
  | 'spark'
  | 'tool'
  | 'user';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const LOGIN_URL = `${API_URL}/v1/auth/google?returnTo=/app`;
const BOOKING_URL = `${API_URL}/v1/auth/google?returnTo=/app/appointments`;

const menuItems: Array<{
  description: string;
  href: string;
  icon: IconName;
  label: string;
}> = [
  {
    description: 'Mantención y cuidado especializado',
    href: '#servicios',
    icon: 'tool',
    label: 'Servicios',
  },
  {
    description: 'Reserva fecha y hora en pocos pasos',
    href: BOOKING_URL,
    icon: 'calendar',
    label: 'Agendar cita',
  },
  {
    description: 'Sigue el trabajo de tu moto',
    href: LOGIN_URL,
    icon: 'clock',
    label: 'Estado en vivo',
  },
  {
    description: 'Revisa servicios y kilometraje',
    href: LOGIN_URL,
    icon: 'history',
    label: 'Historial',
  },
];

const serviceCards: Array<{
  description: string;
  icon: IconName;
  number: string;
  title: string;
}> = [
  {
    description:
      'Aceite, frenos, transmisión y puntos críticos revisados con una pauta clara.',
    icon: 'tool',
    number: '01',
    title: 'Mantención preventiva',
  },
  {
    description:
      'Identificamos el origen del problema y te explicamos el trabajo antes de comenzar.',
    icon: 'spark',
    number: '02',
    title: 'Diagnóstico integral',
  },
  {
    description:
      'Atención enfocada en resolver ajustes frecuentes sin sacrificar el estándar técnico.',
    icon: 'clock',
    number: '03',
    title: 'Servicio express',
  },
];

const processSteps = [
  ['Elige', 'Selecciona tu moto y el servicio que necesitas.'],
  ['Agenda', 'Escoge una fecha y hora disponibles en tiempo real.'],
  ['Sigue', 'Recibe actualizaciones claras durante todo el trabajo.'],
];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    bike: (
      <>
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M6 17l4-7h4l4 7M9 13h6M10 10 8.5 7.5H6M14 10l2-3h2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    shield: (
      <>
        <path d="M12 3 4.5 6v5.5c0 4.6 3 7.7 7.5 9.5 4.5-1.8 7.5-4.9 7.5-9.5V6L12 3Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    spark: (
      <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    ),
    tool: (
      <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3.5 17.5a2.1 2.1 0 0 0 3 3l5.7-5.7a4 4 0 0 0 5.3-5.3l-2.4 2.4-3-3 2.4-2.4Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export function LandingPage() {
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [menuOpen, setMenuOpen] = useState(false);

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
        if (!controller.signal.aborted) setApiState('offline');
      }
    };

    void checkApi();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const systemLabel =
    apiState === 'online'
      ? 'Sistema operativo'
      : apiState === 'offline'
        ? 'API sin conexión'
        : 'Verificando sistema';

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/95 backdrop-blur-xl">
        <div className="bg-primary text-center text-[10px] font-semibold tracking-[0.16em] text-white uppercase sm:text-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2">
            <Icon name="calendar" />
            Agenda online disponible las 24 horas
          </div>
        </div>

        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <a
            className="group flex items-center gap-3"
            href="#top"
            aria-label="D Racing Pro"
          >
            <span className="bg-primary font-display grid size-10 -skew-x-6 place-items-center text-xs font-extrabold tracking-tight text-white shadow-[0_0_24px_rgba(230,0,35,0.28)] transition-transform group-hover:skew-x-0">
              <span className="skew-x-6 group-hover:skew-x-0">DR</span>
            </span>
            <span className="font-display text-[13px] font-bold tracking-[0.12em] uppercase sm:text-sm">
              D Racing <span className="text-primary">Pro</span>
            </span>
          </a>

          <nav
            aria-label="Navegación de portada"
            className="hidden items-center gap-7 lg:flex"
          >
            <a className="landing-nav-link" href="#servicios">
              Servicios
            </a>
            <a className="landing-nav-link" href="#proceso">
              Cómo funciona
            </a>
            <a className="landing-nav-link" href="#confianza">
              Especialistas
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="hidden items-center gap-2 text-xs text-[#b8b8b8] md:flex"
              role="status"
            >
              <span
                className={`size-2 rounded-full ${
                  apiState === 'online'
                    ? 'bg-success shadow-[0_0_10px_var(--color-success)]'
                    : apiState === 'offline'
                      ? 'bg-primary'
                      : 'bg-warning animate-pulse'
                }`}
              />
              {systemLabel}
            </span>
            <a
              className="landing-secondary-button hidden sm:inline-flex"
              href={LOGIN_URL}
            >
              <Icon name="user" />
              Mi cuenta
            </a>
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="hover:border-primary hover:bg-primary grid size-11 place-items-center border border-white/15 bg-white/[0.04] text-white transition"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-40 transition duration-300 ${
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <button
          aria-label="Cerrar menú"
          className="absolute inset-0 size-full bg-black/75 backdrop-blur-[3px]"
          onClick={() => setMenuOpen(false)}
          tabIndex={menuOpen ? 0 : -1}
          type="button"
        />
        <aside
          aria-label="Menú principal"
          className={`absolute top-[108px] right-0 bottom-0 w-full max-w-sm border-l border-white/10 bg-[#0c0c0c] p-6 shadow-2xl transition-transform duration-300 sm:p-8 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
            Navegación
          </p>
          <h2 className="mt-3 text-2xl">Todo para tu Navi</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {menuItems.map((item) => (
              <a
                className="group flex items-center gap-4 py-5"
                href={item.href}
                key={item.label}
                onClick={() => setMenuOpen(false)}
                tabIndex={menuOpen ? 0 : -1}
              >
                <span className="group-hover:border-primary group-hover:bg-primary grid size-11 shrink-0 place-items-center border border-white/10 bg-white/[0.04] text-white transition">
                  <Icon name={item.icon} />
                </span>
                <span>
                  <span className="font-display block text-sm font-bold tracking-[0.05em] uppercase">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs text-[#8f8f8f]">
                    {item.description}
                  </span>
                </span>
                <span className="text-primary ml-auto text-xl transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
            ))}
          </div>
          <p className="mt-8 text-sm leading-6 text-[#9c9c9c]">
            Atención especializada para Honda Navi, con información clara antes,
            durante y después del servicio.
          </p>
        </aside>
      </div>

      <main id="top">
        <section className="landing-hero relative isolate min-h-[calc(100svh-108px)] overflow-hidden">
          <div className="landing-hero-image absolute inset-0 -z-20" />
          <div className="landing-hero-overlay absolute inset-0 -z-10" />
          <div className="absolute inset-y-0 left-0 -z-10 hidden w-2/3 bg-[linear-gradient(105deg,rgba(0,0,0,.7),transparent)] lg:block" />

          <div className="mx-auto flex min-h-[calc(100svh-108px)] max-w-7xl items-end px-5 pt-20 pb-16 sm:px-6 sm:pb-20 lg:items-center lg:px-10 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-primary mb-5 flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase sm:text-xs">
                <span className="bg-primary h-0.5 w-10" />
                Especialistas en Honda Navi
              </p>
              <h1 className="max-w-3xl text-[clamp(2.9rem,8vw,6.6rem)] leading-[0.9] font-extrabold tracking-[-0.045em] text-[#f4f4f4]">
                Tu Navi lista para
                <span className="text-primary block">volver a rodar.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-[#c9c9c9] sm:text-lg sm:leading-8">
                Agenda mantenciones, sigue cada avance y conserva el historial
                completo de tu moto en un solo lugar.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a className="landing-primary-button" href={BOOKING_URL}>
                  <Icon name="calendar" />
                  Agendar una cita
                  <span aria-hidden="true">→</span>
                </a>
                <a className="landing-secondary-button" href="#proceso">
                  Ver cómo funciona
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-[#d0d0d0]">
                {[
                  'Agenda 24/7',
                  'Seguimiento en vivo',
                  'Historial digital',
                ].map((item) => (
                  <span className="flex items-center gap-2" key={item}>
                    <span className="text-primary">
                      <Icon name="check" />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <nav
          aria-label="Categorías de servicio"
          className="landing-category-nav sticky top-[108px] z-30"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-5 sm:justify-center sm:gap-12 sm:px-6">
            {[
              ['Servicios', '#servicios'],
              ['Proceso', '#proceso'],
              ['Seguimiento', '#proceso'],
              ['Historial', '#confianza'],
              ['Agenda', BOOKING_URL],
            ].map(([label, href], index) => (
              <a
                className={index === 0 ? 'is-active' : ''}
                href={href}
                key={label}
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <section className="bg-[#f2f2f0] text-[#151515]" id="servicios">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
              <div>
                <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
                  Cuidado especializado
                </p>
                <h2 className="mt-4 max-w-3xl text-3xl leading-tight sm:text-5xl">
                  Todo lo que tu Navi necesita, sin vueltas.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#626262] lg:justify-self-end">
                Un servicio profesional también debe ser fácil de entender. Te
                mostramos qué haremos, cuánto tarda y cómo avanza tu moto.
              </p>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden border border-black/10 bg-black/10 md:grid-cols-3">
              {serviceCards.map((service) => (
                <article
                  className="group bg-[#f8f8f6] p-7 transition hover:bg-white sm:p-9"
                  key={service.number}
                >
                  <div className="flex items-start justify-between">
                    <span className="group-hover:bg-primary group-hover:border-primary grid size-12 place-items-center border border-black/10 text-[#1a1a1a] transition group-hover:text-white">
                      <Icon name={service.icon} />
                    </span>
                    <span className="font-display text-xs font-bold tracking-[0.14em] text-[#a4a4a4]">
                      {service.number}
                    </span>
                  </div>
                  <h3 className="mt-14 text-xl leading-tight">
                    {service.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-[#686868]">
                    {service.description}
                  </p>
                  <a
                    className="mt-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase"
                    href={BOOKING_URL}
                  >
                    Agendar servicio{' '}
                    <span className="text-primary text-base">→</span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0a0a0a]" id="proceso">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_30%,rgba(230,0,35,.2),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
                Simple desde el inicio
              </p>
              <h2 className="mt-4 text-3xl leading-tight text-[#f4f4f4] sm:text-5xl">
                Agenda en minutos. Sigue todo en línea.
              </h2>
              <p className="mt-6 max-w-xl text-[#a8a8a8]">
                Diseñamos el proceso para que tengas control y claridad sin
                depender de llamadas.
              </p>
            </div>

            <div className="mt-14 grid gap-10 border-t border-white/15 pt-10 md:grid-cols-3">
              {processSteps.map(([title, description], index) => (
                <article className="relative" key={title}>
                  <span className="text-primary font-display text-sm font-bold">
                    0{index + 1}
                  </span>
                  <h3 className="mt-5 text-xl text-[#f4f4f4]">{title}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-[#999]">
                    {description}
                  </p>
                </article>
              ))}
            </div>

            <a className="landing-primary-button mt-12" href={BOOKING_URL}>
              Comenzar ahora <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="bg-[#f2f2f0] text-[#151515]" id="confianza">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10">
            <div className="landing-detail-image relative min-h-[420px] overflow-hidden bg-[#171717] sm:min-h-[560px]">
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.65),transparent_55%)]" />
              <div className="absolute right-0 bottom-0 left-0 p-7 text-white sm:p-10">
                <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                  Tu moto, siempre visible
                </p>
                <p className="font-display mt-3 max-w-md text-2xl font-bold tracking-[0.03em] uppercase sm:text-3xl">
                  Información clara en cada etapa.
                </p>
              </div>
            </div>

            <div className="lg:pl-8">
              <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
                Confianza digital
              </p>
              <h2 className="mt-4 text-3xl leading-tight sm:text-5xl">
                Más control. Menos incertidumbre.
              </h2>
              <p className="mt-6 text-base leading-7 text-[#626262]">
                Desde la reserva hasta la entrega, la información relevante
                queda centralizada y disponible desde tu teléfono.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  [
                    'Estado actualizado',
                    'Consulta en qué etapa se encuentra el trabajo.',
                  ],
                  [
                    'Historial completo',
                    'Mantenciones y kilometraje ordenados por fecha.',
                  ],
                  [
                    'Decisiones informadas',
                    'Entiende el servicio antes de aprobarlo.',
                  ],
                ].map(([title, description]) => (
                  <div
                    className="flex gap-4 border-t border-black/10 pt-5"
                    key={title}
                  >
                    <span className="text-primary mt-0.5">
                      <Icon name="shield" />
                    </span>
                    <div>
                      <h3 className="text-sm">{title}</h3>
                      <p className="mt-1 text-sm text-[#747474]">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
                Tu próxima mantención
              </p>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
                Tu Navi lista. Tu agenda también.
              </h2>
            </div>
            <a
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-[#151515] transition hover:bg-[#151515] hover:text-white"
              href={BOOKING_URL}
            >
              Agendar una cita <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>

      <a
        className="landing-floating-cta"
        href={BOOKING_URL}
        aria-label="Agendar una cita"
      >
        <Icon name="calendar" />
        <span>Agendar cita</span>
      </a>

      <footer className="bg-[#090909] text-[#919191]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
          <a
            className="font-display text-sm font-bold tracking-[0.12em] text-white uppercase"
            href="#top"
          >
            D Racing <span className="text-primary">Pro</span>
          </a>
          <p>Servicio especializado para Honda Navi · Santiago, Chile</p>
          <a
            className="hover:text-primary text-white transition"
            href={LOGIN_URL}
          >
            Acceder a mi cuenta
          </a>
        </div>
      </footer>
    </div>
  );
}
