import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { healthRoutes } from './modules/health/presentation/routes.js';

export interface BuildAppOptions {
  appOrigin: string;
  checkDatabase: () => Promise<void>;
  logger?: boolean;
}

export async function buildApp({
  appOrigin,
  checkDatabase,
  logger = true,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    disableRequestLogging: false,
    logger,
    trustProxy: true,
  });

  await app.register(cors, {
    credentials: true,
    origin: appOrigin,
  });

  await app.register(healthRoutes, {
    checkDatabase,
    prefix: '/health',
  });

  app.get('/api', async () => ({
    name: 'D Racing Pro API',
    version: '0.1.0',
  }));

  return app;
}
