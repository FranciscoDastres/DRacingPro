import { type ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger';

const tones: Record<BadgeTone, string> = {
  danger: 'text-[#ff8088] bg-[#ff5a66]/12 border-[#ff5a66]/25',
  info: 'text-[#7cc4ff] bg-[#7cc4ff]/12 border-[#7cc4ff]/25',
  neutral: 'text-muted bg-white/5 border-white/10',
  primary: 'text-accent bg-accent/12 border-accent/25',
  success: 'text-success bg-success/12 border-success/25',
  warning: 'text-warning bg-warning/12 border-warning/25',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-[0.04em] whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_service'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; tone: BadgeTone }
> = {
  cancelled: { label: 'Cancelada', tone: 'danger' },
  checked_in: { label: 'Recepcionada', tone: 'info' },
  completed: { label: 'Completada', tone: 'success' },
  confirmed: { label: 'Confirmada', tone: 'primary' },
  in_service: { label: 'En servicio', tone: 'warning' },
  no_show: { label: 'No asistió', tone: 'danger' },
  ready: { label: 'Lista para retiro', tone: 'success' },
  requested: { label: 'Solicitada', tone: 'neutral' },
};

type ProgressStatus =
  | 'received'
  | 'diagnosing'
  | 'waiting_approval'
  | 'repairing'
  | 'quality_check'
  | 'ready_for_pickup'
  | 'delivered';

export const PROGRESS_STATUS_META: Record<
  ProgressStatus,
  { label: string; tone: BadgeTone }
> = {
  delivered: { label: 'Entregada', tone: 'success' },
  diagnosing: { label: 'En diagnóstico', tone: 'info' },
  quality_check: { label: 'Control de calidad', tone: 'warning' },
  received: { label: 'Recibida', tone: 'neutral' },
  ready_for_pickup: { label: 'Lista para retiro', tone: 'success' },
  repairing: { label: 'En reparación', tone: 'warning' },
  waiting_approval: { label: 'Esperando aprobación', tone: 'primary' },
};
