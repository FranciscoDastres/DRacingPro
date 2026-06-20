import postgres, { type Sql } from 'postgres';

export type Database = Sql;

export function createDatabase(databaseUrl: string): Database {
  return postgres(databaseUrl, {
    connect_timeout: 5,
    idle_timeout: 20,
    max: 10,
  });
}

export async function checkDatabase(database: Database): Promise<void> {
  await database`SELECT 1`;
}
