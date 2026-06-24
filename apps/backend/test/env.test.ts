import { parseEnvironment } from '../src/config/env.js';

const productionBase = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://app.dracing.cl',
  API_ORIGIN: 'https://api.dracing.cl',
  DATABASE_URL: 'postgresql://dracing:secret@db:5432/dracing',
  SESSION_SECRET: 'a-very-strong-production-secret-32+chars',
  COOKIE_SECURE: 'true',
} satisfies NodeJS.ProcessEnv;

describe('parseEnvironment in production', () => {
  it('rejects the built-in default SESSION_SECRET', () => {
    expect(() =>
      parseEnvironment({
        ...productionBase,
        SESSION_SECRET: 'development-session-secret-change-me-now',
      }),
    ).toThrow();
  });

  it('rejects COOKIE_SECURE=false', () => {
    expect(() =>
      parseEnvironment({ ...productionBase, COOKIE_SECURE: 'false' }),
    ).toThrow();
  });

  it('accepts a hardened production configuration', () => {
    const env = parseEnvironment(productionBase);
    expect(env.SESSION_SECRET).toBe(productionBase.SESSION_SECRET);
    expect(env.COOKIE_SECURE).toBe(true);
  });
});

describe('parseEnvironment in development', () => {
  it('still allows defaults for local development', () => {
    const env = parseEnvironment({ NODE_ENV: 'development' });
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
