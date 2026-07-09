// Aplica database/migrations/*.sql contra DATABASE_URL usando node-postgres,
// con la misma semántica que infra/docker/run-migrations.sh (tabla
// schema_migrations, idempotente por nombre de archivo). Pensado para entornos
// sin psql, como el pre-deploy de Render o la shell del servicio.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir =
  process.env.MIGRATIONS_DIR ??
  path.resolve(scriptDir, '../../../database/migrations');

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const { rowCount } = await client.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [filename],
    );
    if (rowCount > 0) {
      console.log(`Skipping ${filename} (already applied)`);
      continue;
    }

    console.log(`Applying ${filename}`);
    const sql = await readFile(path.join(migrationsDir, filename), 'utf8');
    // Cada archivo trae su propio BEGIN/COMMIT, así que se envía tal cual.
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [
      filename,
    ]);
  }
} finally {
  await client.end();
}
