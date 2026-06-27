import { parseEnvironment, resolveTrustProxy } from '../src/config/env.js';

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

describe('resolveTrustProxy', () => {
  it('does not trust forwarded headers by default in development', () => {
    const env = parseEnvironment({ NODE_ENV: 'development' });
    expect(resolveTrustProxy(env)).toBe(false);
  });

  it('trusts a single reverse-proxy hop by default in production', () => {
    const env = parseEnvironment(productionBase);
    expect(resolveTrustProxy(env)).toBe(1);
  });

  it('parses an explicit hop count', () => {
    const env = parseEnvironment({ ...productionBase, TRUSTED_PROXY: '2' });
    expect(resolveTrustProxy(env)).toBe(2);
  });

  it('passes an IP/CIDR allowlist straight through', () => {
    const env = parseEnvironment({
      ...productionBase,
      TRUSTED_PROXY: '10.0.0.0/8,127.0.0.1',
    });
    expect(resolveTrustProxy(env)).toBe('10.0.0.0/8,127.0.0.1');
  });

  it('honours an explicit false', () => {
    const env = parseEnvironment({ ...productionBase, TRUSTED_PROXY: 'false' });
    expect(resolveTrustProxy(env)).toBe(false);
  });
});
