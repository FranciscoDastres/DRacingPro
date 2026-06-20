import { buildApp } from './app.js';
import { parseEnvironment } from './config/env.js';
import {
  checkDatabase,
  createDatabase,
} from './shared/infrastructure/database/postgres.js';

const environment = parseEnvironment();
const database = createDatabase(environment.DATABASE_URL);
const app = await buildApp({
  appOrigin: environment.APP_ORIGIN,
  checkDatabase: () => checkDatabase(database),
});

app.addHook('onClose', async () => {
  await database.end({ timeout: 5 });
});

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
