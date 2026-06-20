import { createDatabaseClient } from '@dracing/database';

import { buildApp } from './app.js';
import { parseEnvironment } from './config/env.js';
import { AppointmentService } from './modules/appointments/application/appointment-service.js';
import { SessionService } from './modules/auth/application/session-service.js';
import { GoogleOidcClient } from './modules/auth/infrastructure/google-oidc.js';
import { PrismaAuthRepository } from './modules/auth/infrastructure/prisma-auth-repository.js';
import { PrismaMotorcycleRepository } from './modules/motorcycles/infrastructure/prisma-motorcycle-repository.js';
import { PrismaServiceRepository } from './modules/services/infrastructure/prisma-service-repository.js';

const environment = parseEnvironment();
const database = createDatabaseClient(environment.DATABASE_URL);
const sessions = new SessionService(new PrismaAuthRepository(database));
const google = createGoogleClient();
const app = await buildApp({
  appointments: {
    appOrigin: environment.APP_ORIGIN,
    appointments: new AppointmentService(database),
    sessions,
  },
  auth: {
    apiOrigin: environment.API_ORIGIN,
    appOrigin: environment.APP_ORIGIN,
    ...(google && { google }),
    secureCookies: environment.COOKIE_SECURE,
    sessions,
  },
  appOrigin: environment.APP_ORIGIN,
  checkDatabase: async () => {
    await database.$queryRaw`SELECT 1`;
  },
  cookieSecret: environment.SESSION_SECRET,
  motorcycles: {
    appOrigin: environment.APP_ORIGIN,
    repository: new PrismaMotorcycleRepository(database),
    sessions,
  },
  services: {
    repository: new PrismaServiceRepository(database),
  },
});

app.addHook('onClose', async () => {
  await database.$disconnect();
});

function createGoogleClient(): GoogleOidcClient | undefined {
  if (
    !environment.GOOGLE_CLIENT_ID ||
    !environment.GOOGLE_CLIENT_SECRET ||
    !environment.GOOGLE_REDIRECT_URI
  ) {
    return undefined;
  }

  return new GoogleOidcClient({
    clientId: environment.GOOGLE_CLIENT_ID,
    clientSecret: environment.GOOGLE_CLIENT_SECRET,
    redirectUri: environment.GOOGLE_REDIRECT_URI,
  });
}

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  process.exit(0);
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: environment.HOST, port: environment.PORT });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
