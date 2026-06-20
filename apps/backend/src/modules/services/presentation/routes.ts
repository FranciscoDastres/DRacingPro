import type { FastifyPluginAsync } from 'fastify';

import type { ServiceRepository } from '../domain/service-repository.js';

export interface ServiceRoutesOptions {
  repository: ServiceRepository;
}

export const serviceRoutes: FastifyPluginAsync<ServiceRoutesOptions> = async (
  app,
  options,
) => {
  app.get('/', async (_request, reply) => {
    return reply.send(await options.repository.listActive());
  });
};
