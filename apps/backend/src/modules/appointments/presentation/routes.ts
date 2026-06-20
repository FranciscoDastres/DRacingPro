import {
  AvailabilityRequestSchema,
  CreateMotorcycleStatusUpdateSchema,
  CreateAppointmentSchema,
  UpdateAppointmentStatusSchema,
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
  AppointmentTransitionError,
} from '../application/appointment-service.js';

const availabilityQuerySchema = z.object({
  date: z.string(),
  serviceIds: z.string(),
});
const appointmentParamsSchema = z.object({ id: z.uuid() });

export interface AppointmentRoutesOptions {
  appOrigin: string;
  appointments: Pick<
    AppointmentService,
    | 'addMotorcycleUpdate'
    | 'create'
    | 'getAvailability'
    | 'getTimeline'
    | 'list'
    | 'listAdmin'
    | 'listCustomerUpdates'
    | 'updateStatus'
  >;
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

  app.get('/appointments/:id/timeline', async (request, reply) => {
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;
    const params = appointmentParamsSchema.safeParse(request.params);
    if (!params.success)
      return reply.status(400).send({ error: 'validation_error' });
    try {
      return reply.send(
        await options.appointments.getTimeline(user.id, params.data.id),
      );
    } catch (error) {
      if (error instanceof AppointmentInputError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.get('/notifications', async (request, reply) => {
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;
    return reply.send(await options.appointments.listCustomerUpdates(user.id));
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

  app.get('/admin/appointments', async (request, reply) => {
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;
    if (user.role !== 'admin')
      return reply.status(403).send({ error: 'forbidden' });
    return reply.send(await options.appointments.listAdmin());
  });

  app.patch('/admin/appointments/:id/status', async (request, reply) => {
    if (!hasTrustedOrigin(request, options.appOrigin)) {
      return reply.status(403).send({ error: 'invalid_origin' });
    }
    const user = await requireUser(request, reply, options.sessions);
    if (!user) return;
    if (user.role !== 'admin')
      return reply.status(403).send({ error: 'forbidden' });

    const params = appointmentParamsSchema.safeParse(request.params);
    const input = UpdateAppointmentStatusSchema.safeParse(request.body);
    if (!params.success || !input.success) {
      return reply.status(400).send({ error: 'validation_error' });
    }

    try {
      return reply.send(
        await options.appointments.updateStatus(
          user.id,
          params.data.id,
          input.data,
        ),
      );
    } catch (error) {
      if (error instanceof AppointmentTransitionError) {
        return reply.status(409).send({ error: 'invalid_status_transition' });
      }
      if (error instanceof AppointmentInputError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post(
    '/admin/appointments/:id/motorcycle-updates',
    async (request, reply) => {
      if (!hasTrustedOrigin(request, options.appOrigin)) {
        return reply.status(403).send({ error: 'invalid_origin' });
      }
      const user = await requireUser(request, reply, options.sessions);
      if (!user) return;
      if (user.role !== 'admin')
        return reply.status(403).send({ error: 'forbidden' });

      const params = appointmentParamsSchema.safeParse(request.params);
      const input = CreateMotorcycleStatusUpdateSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return reply.status(400).send({ error: 'validation_error' });
      }

      try {
        const update = await options.appointments.addMotorcycleUpdate(
          user.id,
          params.data.id,
          input.data,
        );
        return reply.status(201).send(update);
      } catch (error) {
        if (error instanceof AppointmentInputError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
