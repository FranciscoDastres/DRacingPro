import { buildApp } from '../src/app.js';
import { SessionService } from '../src/modules/auth/application/session-service.js';
import { hashPassword } from '../src/modules/auth/infrastructure/password.js';
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

  it('never creates an admin session through the development route', async () => {
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
    expect(response.json()).toMatchObject({ role: 'customer' });
    await app.close();
  });

  it('authenticates the local administrator with a password', async () => {
    const repository = new MemoryAuthRepository();
    repository.user = {
      ...testUser,
      email: 'jefe@taller.cl',
      role: 'admin',
    };
    repository.passwordHash = await hashPassword('a-secure-password');
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
      headers: { origin: 'http://localhost:5173' },
      method: 'POST',
      payload: {
        email: 'JEFE@TALLER.CL',
        password: 'a-secure-password',
      },
      url: '/v1/auth/login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      email: 'jefe@taller.cl',
      role: 'admin',
    });
    expect(response.headers['set-cookie']).toBeDefined();
    await app.close();
  });

  it('rejects invalid administrator credentials', async () => {
    const repository = new MemoryAuthRepository();
    repository.user = { ...testUser, role: 'admin' };
    repository.passwordHash = await hashPassword('a-secure-password');
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
      headers: { origin: 'http://localhost:5173' },
      method: 'POST',
      payload: {
        email: testUser.email,
        password: 'wrong-password',
      },
      url: '/v1/auth/login',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'invalid_credentials' });
    await app.close();
  });

  it('keeps Google users as customers', async () => {
    const repository = new MemoryAuthRepository();
    const sessions = new SessionService(repository);

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

  it('revokes every session for the user on logout-all and clears the cookie', async () => {
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
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'POST',
      url: '/v1/auth/logout-all',
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(repository.revokedAllForUserId).toBe(testUser.id);

    // The session no longer authenticates after a global logout.
    const me = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/auth/me',
    });
    expect(me.statusCode).toBe(401);
    await app.close();
  });

  it('rejects logout-all from an untrusted origin', async () => {
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
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://evil.example',
      },
      method: 'POST',
      url: '/v1/auth/logout-all',
    });
    expect(response.statusCode).toBe(403);
    expect(repository.revokedAllForUserId).toBeNull();
    await app.close();
  });

  it('rejects logout-all when not authenticated', async () => {
    const repository = new MemoryAuthRepository();
    repository.user = null;
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
      headers: { origin: 'http://localhost:5173' },
      method: 'POST',
      url: '/v1/auth/logout-all',
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('anonymizes the account on delete, clears the cookie and ends the session', async () => {
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
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'DELETE',
      url: '/v1/auth/me',
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(repository.anonymizedUserId).toBe(testUser.id);

    // The session no longer authenticates after the account is deleted.
    const me = await app.inject({
      headers: { cookie: 'drp_session=test-session' },
      method: 'GET',
      url: '/v1/auth/me',
    });
    expect(me.statusCode).toBe(401);
    await app.close();
  });

  it('rejects account deletion from an untrusted origin', async () => {
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
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://evil.example',
      },
      method: 'DELETE',
      url: '/v1/auth/me',
    });
    expect(response.statusCode).toBe(403);
    expect(repository.anonymizedUserId).toBeNull();
    await app.close();
  });

  it('rejects account deletion when not authenticated', async () => {
    const repository = new MemoryAuthRepository();
    repository.user = null;
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
      headers: { origin: 'http://localhost:5173' },
      method: 'DELETE',
      url: '/v1/auth/me',
    });
    expect(response.statusCode).toBe(401);
    expect(repository.anonymizedUserId).toBeNull();
    await app.close();
  });

  it('refuses to delete the administrator account', async () => {
    const repository = new MemoryAuthRepository();
    repository.user = { ...testUser, role: 'admin' };
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
      headers: {
        cookie: 'drp_session=test-session',
        origin: 'http://localhost:5173',
      },
      method: 'DELETE',
      url: '/v1/auth/me',
    });
    expect(response.statusCode).toBe(403);
    expect(repository.anonymizedUserId).toBeNull();
    await app.close();
  });
});
