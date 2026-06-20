import { buildApp } from '../src/app.js';

describe('health routes', () => {
  it('reports the process as alive', async () => {
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'dracing-api',
      status: 'ok',
    });

    await app.close();
  });

  it('reports database failure as not ready', async () => {
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      checkDatabase: async () => {
        throw new Error('database unavailable');
      },
      logger: false,
    });

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: 'degraded',
      checks: { database: 'degraded' },
    });

    await app.close();
  });
});
