import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import {
  adminRoutes,
  type AdminRoutesOptions,
} from './modules/admin/presentation/routes.js';
import {
  appointmentRoutes,
  type AppointmentRoutesOptions,
} from './modules/appointments/presentation/routes.js';
import {
  authRoutes,
  type AuthRoutesOptions,
} from './modules/auth/presentation/routes.js';
import { healthRoutes } from './modules/health/presentation/routes.js';
import {
  customerRoutes,
  type CustomerRoutesOptions,
} from './modules/customer/presentation/routes.js';
import {
  motorcycleRoutes,
  type MotorcycleRoutesOptions,
} from './modules/motorcycles/presentation/routes.js';
import {
  serviceRoutes,
  type ServiceRoutesOptions,
} from './modules/services/presentation/routes.js';
import {
  type WorkshopAdminRoutesOptions,
  workshopAdminRoutes,
} from './modules/workshop/presentation/routes.js';

export interface BuildAppOptions {
  admin?: AdminRoutesOptions;
  appOrigin: string;
  appointments?: AppointmentRoutesOptions;
  auth?: AuthRoutesOptions;
  checkDatabase: () => Promise<void>;
  cookieSecret?: string;
  customer?: CustomerRoutesOptions;
  logger?: boolean;
  motorcycles?: MotorcycleRoutesOptions;
  services?: ServiceRoutesOptions;
  workshopAdmin?: WorkshopAdminRoutesOptions;
}

export async function buildApp({
  admin,
  appOrigin,
  appointments,
  auth,
  checkDatabase,
  cookieSecret = 'test-cookie-secret-must-have-32-characters',
  customer,
  logger = true,
  motorcycles,
  services,
  workshopAdmin,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    disableRequestLogging: false,
    logger,
    trustProxy: true,
  });

  // Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.).
  // CORP is relaxed to cross-origin so the separate frontend can consume the API.
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  // Per-IP throttling to mitigate brute force and abuse.
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
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
  if (customer) {
    await app.register(customerRoutes, { ...customer, prefix: '/v1' });
  }
  if (appointments) {
    await app.register(appointmentRoutes, { ...appointments, prefix: '/v1' });
  }
  if (motorcycles) {
    await app.register(motorcycleRoutes, {
      ...motorcycles,
      prefix: '/v1/motorcycles',
    });
  }
  if (services) {
    await app.register(serviceRoutes, { ...services, prefix: '/v1/services' });
  }
  if (workshopAdmin) {
    await app.register(workshopAdminRoutes, {
      ...workshopAdmin,
      prefix: '/v1/admin/workshop',
    });
  }
  if (admin) {
    await app.register(adminRoutes, { ...admin, prefix: '/v1/admin' });
  }

  app.get('/api', async () => ({
    name: 'D Racing Pro API',
    version: '0.1.0',
  }));

  return app;
}
