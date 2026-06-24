import { type BadgeTone } from './Badge';

type AppointmentStatus =
  | 'pending_payment'
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
  pending_payment: { label: 'Pendiente de pago', tone: 'warning' },
  ready: { label: 'Lista para retiro', tone: 'success' },
  requested: { label: 'Solicitada', tone: 'neutral' },
};

// Buckets used by the agenda so cancelled/no-show appointments don't clutter
// the active workflow (see AdminAppointmentsPage).
export type AgendaBucket = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const AGENDA_BUCKET_OF: Record<AppointmentStatus, AgendaBucket> = {
  cancelled: 'cancelled',
  checked_in: 'in_progress',
  completed: 'completed',
  confirmed: 'pending',
  in_service: 'in_progress',
  no_show: 'cancelled',
  pending_payment: 'pending',
  ready: 'in_progress',
  requested: 'pending',
};

export const AGENDA_BUCKET_LABEL: Record<AgendaBucket, string> = {
  cancelled: 'Canceladas',
  completed: 'Completadas',
  in_progress: 'En proceso',
  pending: 'Pendientes',
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
