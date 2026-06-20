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
