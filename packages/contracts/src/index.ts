import { z } from 'zod';

export type ServiceStatus = 'ok' | 'degraded';

export interface HealthResponse {
  service: 'dracing-api';
  status: ServiceStatus;
  timestamp: string;
  checks?: {
    database: ServiceStatus;
  };
}

export const UserRoleSchema = z.enum(['customer', 'admin']);

export const CurrentUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
  role: UserRoleSchema,
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const MotorcycleSchema = z.object({
  id: z.uuid(),
  nickname: z.string().nullable(),
  make: z.string(),
  model: z.string(),
  modelYear: z.number().int().min(2016).max(2100).nullable(),
  color: z.string().nullable(),
  licensePlate: z.string().nullable(),
  vin: z.string().nullable(),
  odometerKm: z.number().int().nonnegative().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateMotorcycleSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  modelYear: z.number().int().min(2016).max(2100).optional(),
  color: z.string().trim().min(1).max(60).optional(),
  licensePlate: z.string().trim().min(1).max(20).optional(),
  vin: z.string().trim().min(11).max(32).optional(),
  odometerKm: z.number().int().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const UpdateMotorcycleSchema = CreateMotorcycleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type Motorcycle = z.infer<typeof MotorcycleSchema>;
export type CreateMotorcycleInput = z.infer<typeof CreateMotorcycleSchema>;
export type UpdateMotorcycleInput = z.infer<typeof UpdateMotorcycleSchema>;

export const ServiceSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  price: z.number().int().nonnegative(),
  currency: z.string().length(3),
});

export type Service = z.infer<typeof ServiceSchema>;

export const AvailabilityRequestSchema = z.object({
  date: z.iso.date(),
  serviceIds: z.array(z.uuid()).min(1).max(10),
});

export const AvailabilitySlotSchema = z.object({
  endsAt: z.iso.datetime(),
  startsAt: z.iso.datetime(),
});

export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const CreateAppointmentSchema = z.object({
  motorcycleId: z.uuid(),
  serviceIds: z.array(z.uuid()).min(1).max(10),
  startsAt: z.iso.datetime(),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const CancelAppointmentSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export type CancelAppointmentInput = z.infer<typeof CancelAppointmentSchema>;

export const AppointmentSchema = z.object({
  endsAt: z.iso.datetime(),
  id: z.uuid(),
  motorcycle: z.object({
    id: z.uuid(),
    label: z.string(),
  }),
  services: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
    }),
  ),
  startsAt: z.iso.datetime(),
  status: z.enum([
    'requested',
    'confirmed',
    'checked_in',
    'in_service',
    'ready',
    'completed',
    'cancelled',
    'no_show',
  ]),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

export const AdminAppointmentSchema = AppointmentSchema.extend({
  customer: z.object({
    displayName: z.string(),
    email: z.email(),
    id: z.uuid(),
  }),
});

export type AdminAppointment = z.infer<typeof AdminAppointmentSchema>;

export const UpdateAppointmentStatusSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  status: AppointmentSchema.shape.status,
});

export type UpdateAppointmentStatusInput = z.infer<
  typeof UpdateAppointmentStatusSchema
>;

export const CreateMotorcycleStatusUpdateSchema = z.object({
  customerVisible: z.boolean().default(true),
  message: z.string().trim().max(2000).optional(),
  odometerKm: z.number().int().nonnegative().optional(),
  progressStatus: z.enum([
    'received',
    'diagnosing',
    'waiting_approval',
    'repairing',
    'quality_check',
    'ready_for_pickup',
    'delivered',
  ]),
});

export type CreateMotorcycleStatusUpdateInput = z.infer<
  typeof CreateMotorcycleStatusUpdateSchema
>;

export const AdminServiceSchema = ServiceSchema.extend({
  isActive: z.boolean(),
});

export const CreateServiceSchema = z.object({
  code: z.string().trim().min(2).max(40),
  currency: z.string().trim().length(3).default('CLP'),
  description: z.string().trim().max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(1440),
  name: z.string().trim().min(2).max(120),
  price: z.number().int().nonnegative(),
});

export const UpdateServiceSchema = CreateServiceSchema.partial()
  .extend({ isActive: z.boolean().optional() })
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required',
  );

export type AdminService = z.infer<typeof AdminServiceSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

const workshopTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const BusinessHourSchema = z.object({
  closesAt: workshopTimeSchema,
  id: z.uuid(),
  opensAt: workshopTimeSchema,
  slotMinutes: z.number().int(),
  validFrom: z.iso.date(),
  validUntil: z.iso.date().nullable(),
  weekday: z.number().int().min(0).max(6),
});

export const SaveBusinessHourSchema = z.object({
  closesAt: workshopTimeSchema,
  opensAt: workshopTimeSchema,
  slotMinutes: z.number().int().min(5).max(240),
  validFrom: z.iso.date(),
  validUntil: z.iso.date().optional(),
  weekday: z.number().int().min(0).max(6),
});

export type BusinessHour = z.infer<typeof BusinessHourSchema>;
export type SaveBusinessHourInput = z.infer<typeof SaveBusinessHourSchema>;

export const ScheduleExceptionSchema = z.object({
  capacityOverride: z.number().int().positive().nullable(),
  endsAt: z.iso.datetime(),
  id: z.uuid(),
  kind: z.enum(['closed', 'availability_override']),
  reason: z.string().nullable(),
  startsAt: z.iso.datetime(),
});

export const CreateScheduleExceptionSchema = z
  .object({
    capacityOverride: z.number().int().positive().optional(),
    endsAt: z.iso.datetime(),
    kind: z.enum(['closed', 'availability_override']),
    reason: z.string().trim().max(255).optional(),
    startsAt: z.iso.datetime(),
  })
  .refine((value) => new Date(value.startsAt) < new Date(value.endsAt), {
    message: 'End must be after start',
    path: ['endsAt'],
  });

export type ScheduleException = z.infer<typeof ScheduleExceptionSchema>;
export type CreateScheduleExceptionInput = z.infer<
  typeof CreateScheduleExceptionSchema
>;

export const CustomerMotorcycleUpdateSchema = z.object({
  appointmentId: z.uuid(),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
  message: z.string().nullable(),
  motorcycleLabel: z.string(),
  progressStatus: z.enum([
    'received',
    'diagnosing',
    'waiting_approval',
    'repairing',
    'quality_check',
    'ready_for_pickup',
    'delivered',
  ]),
});

export const AppointmentTimelineSchema = z.object({
  appointment: AppointmentSchema,
  updates: z.array(CustomerMotorcycleUpdateSchema),
});

export type CustomerMotorcycleUpdate = z.infer<
  typeof CustomerMotorcycleUpdateSchema
>;
export type AppointmentTimeline = z.infer<typeof AppointmentTimelineSchema>;
