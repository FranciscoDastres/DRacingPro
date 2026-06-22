import { buildApp } from '../src/app.js';
import { SessionService } from '../src/modules/auth/application/session-service.js';
import {
  MemoryAuthRepository,
  testUser,
} from './helpers/memory-auth-repository.js';

describe('authentication routes', () => {
  it('returns the current user from a valid session', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/auth/me',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(testUser);
    await app.close();
  });

  it('creates a developer session when dev login is allowed', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        allowDevLogin: true,
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev-login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(testUser);
    expect(response.headers['set-cookie']).toBeDefined();
    await app.close();
  });

  it('creates an admin session when dev login requests the admin role', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        allowDevLogin: true,
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      payload: { role: 'admin' },
      url: '/v1/auth/dev-login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ role: 'admin' });
    await app.close();
  });

  it('promotes a configured admin email to the admin role on Google login', async () => {
    const repository = new MemoryAuthRepository();
    const sessions = new SessionService(repository, undefined, [
      'jefe@taller.cl',
    ]);

    const session = await sessions.loginWithGoogle(
      {
        avatarUrl: null,
        displayName: 'Jefe Taller',
        email: 'Jefe@Taller.cl',
        subject: 'google-admin',
      },
      {},
    );

    expect(session.user.role).toBe('admin');
  });

  it('keeps non-admin emails as customers on Google login', async () => {
    const repository = new MemoryAuthRepository();
    const sessions = new SessionService(repository, undefined, [
      'jefe@taller.cl',
    ]);

    const session = await sessions.loginWithGoogle(
      {
        avatarUrl: null,
        displayName: 'Cliente Cualquiera',
        email: 'cliente@correo.cl',
        subject: 'google-customer',
      },
      {},
    );

    expect(session.user.role).toBe('customer');
  });

  it('enters as admin when the dev login email is configured as admin', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        allowDevLogin: true,
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository, undefined, ['jefe@taller.cl']),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      payload: { email: 'jefe@taller.cl' },
      url: '/v1/auth/dev-login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ role: 'admin' });
    await app.close();
  });

  it('hides dev login when it is not allowed', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/dev-login',
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('protects logout with an origin check and revokes the session', async () => {
    const repository = new MemoryAuthRepository();
    const app = await buildApp({
      appOrigin: 'http://localhost:5173',
      auth: {
        apiOrigin: 'http://localhost:3000',
        appOrigin: 'http://localhost:5173',
        secureCookies: false,
        sessions: new SessionService(repository),
      },
      checkDatabase: async () => undefined,
      logger: false,
    });

    const rejected = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'POST',
      url: '/v1/auth/logout',
    });
    expect(rejected.statusCode).toBe(403);

    const accepted = await app.inject({
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'POST',
      url: '/v1/auth/logout',
    });
    expect(accepted.statusCode).toBe(204);
    expect(repository.revoked).toBe(true);
    await app.close();
  });
});
