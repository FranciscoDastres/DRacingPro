import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';

import {
  authRoutes,
  type AuthRoutesOptions,
} from './modules/auth/presentation/routes.js';
import { healthRoutes } from './modules/health/presentation/routes.js';
import {
  motorcycleRoutes,
  type MotorcycleRoutesOptions,
} from './modules/motorcycles/presentation/routes.js';
import {
  serviceRoutes,
  type ServiceRoutesOptions,
} from './modules/services/presentation/routes.js';

export interface BuildAppOptions {
  appOrigin: string;
  auth?: AuthRoutesOptions;
  checkDatabase: () => Promise<void>;
  cookieSecret?: string;
  logger?: boolean;
  motorcycles?: MotorcycleRoutesOptions;
  services?: ServiceRoutesOptions;
}

export async function buildApp({
  appOrigin,
  auth,
  checkDatabase,
  cookieSecret = 'test-cookie-secret-must-have-32-characters',
  logger = true,
  motorcycles,
  services,
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
  await app.register(cookie, { secret: cookieSecret });

  await app.register(healthRoutes, {
    checkDatabase,
    prefix: '/health',
  });

  if (auth) await app.register(authRoutes, { ...auth, prefix: '/v1/auth' });
  if (motorcycles) {
    await app.register(motorcycleRoutes, {
      ...motorcycles,
      prefix: '/v1/motorcycles',
    });
  }
  if (services) {
    await app.register(serviceRoutes, { ...services, prefix: '/v1/services' });
  }

  app.get('/api', async () => ({
    name: 'D Racing Pro API',
    version: '0.1.0',
  }));

  return app;
}
