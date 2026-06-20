import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

export type { Prisma } from './generated/prisma/client.js';
export {
  appointment_status as AppointmentStatus,
  motorcycle_progress_status as MotorcycleProgressStatus,
  user_role as UserRole,
} from './generated/prisma/enums.js';

export type DatabaseClient = PrismaClient;

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const connectionUrl = new URL(databaseUrl);
  if (!connectionUrl.searchParams.has('options')) {
    connectionUrl.searchParams.set('options', '-c timezone=UTC');
  }

  const adapter = new PrismaPg({ connectionString: connectionUrl.href });
  return new PrismaClient({ adapter });
}
