import {
  AvailabilityRequestSchema,
  CreateAppointmentSchema,
} from '@dracing/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { SessionService } from '../../auth/application/session-service.js';
import {
  hasTrustedOrigin,
  requireUser,
} from '../../auth/presentation/routes.js';
import {
  AppointmentConflictError,
  AppointmentInputError,
  type AppointmentService,
} from '../application/appointment-service.js';

const availabilityQuerySchema = z.object({
  date: z.string(),
  serviceIds: z.string(),
});

export interface AppointmentRoutesOptions {
  appOrigin: string;
  appointments: AppointmentService;
  sessions: SessionService;
}

export const appointmentRoutes: FastifyPluginAsync<
  AppointmentRoutesOptions
> = async (app, options) => {
  app.get('/availability', async (request, reply) => {
    const query = availabilityQuerySchema.safeParse(request.query);
    if (!query.success)
      return reply.status(400).send({ error: 'validation_error' });

    const input = AvailabilityRequestSchema.safeParse({
      date: query.data.date,
      serviceIds: query.data.serviceIds.split(',').filter(Boolean),
    });
    if (!input.success)
      return reply.status(400).send({ error: 'validation_error' });

    return reply.send(
      await options.appointments.getAvailability(
        input.data.serviceIds,
        input.data.date,
      ),
    );
  });

  app.get('/appointments', async (request, reply) => {
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;
    return reply.send(await options.appointments.list(user.id));
  });

  app.post('/appointments', async (request, reply) => {
    if (!hasTrustedOrigin(request, options.appOrigin)) {
      return reply.status(403).send({ error: 'invalid_origin' });
    }
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;

    const input = CreateAppointmentSchema.safeParse(request.body);
    if (!input.success)
      return reply.status(400).send({ error: 'validation_error' });

    try {
      const appointment = await options.appointments.create(
        user.id,
        input.data,
      );
      return reply.status(201).send(appointment);
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        return reply.status(409).send({ error: 'slot_unavailable' });
      }
      if (error instanceof AppointmentInputError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });
};
