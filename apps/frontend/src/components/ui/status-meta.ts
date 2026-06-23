import { type BadgeTone } from './Badge';

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
