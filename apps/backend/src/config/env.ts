import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

// Defaults that are convenient for local development but must never be used
// once NODE_ENV=production. Enforced by the superRefine below.
const INSECURE_DEFAULTS = {
  SESSION_SECRET: 'development-session-secret-change-me-now',
} as const;

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    APP_ORIGIN: z.url().default('http://localhost:5173'),
    API_ORIGIN: z.url().default('http://localhost:3000'),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    DATABASE_URL: z
      .url()
      .default('postgresql://dracing:dracing@localhost:55432/dracing'),
    SESSION_SECRET: z
      .string()
      .min(32)
      .default(INSECURE_DEFAULTS.SESSION_SECRET),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    GOOGLE_REDIRECT_URI: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url().optional(),
    ),
    // Flow payment gateway (https://www.flow.cl/docs/api.html). Defaults to the
    // sandbox; credentials are injected per environment and never exposed to the
    // frontend.
    FLOW_API_BASE: z.url().default('https://sandbox.flow.cl/api'),
    FLOW_API_KEY: optionalString,
    FLOW_SECRET_KEY: optionalString,
    FLOW_CONFIRM_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url().optional(),
    ),
    FLOW_RETURN_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.url().optional(),
    ),
    // WhatsApp coordination provider. Only 'noop' is implemented today; future
    // providers (e.g. 'twilio') are selected here without touching call sites.
    WHATSAPP_PROVIDER: optionalString,
    // How much to trust X-Forwarded-* headers for the client IP. Leave empty to
    // use the safe per-environment default (a single nginx hop in production, no
    // trust locally). Accepts a hop count ("1") or an IP/CIDR allowlist
    // ("10.0.0.0/8,127.0.0.1"). Never set to "true" on a directly-exposed API:
    // it lets anyone spoof their IP and bypass per-IP rate limiting.
    TRUSTED_PROXY: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.SESSION_SECRET === INSECURE_DEFAULTS.SESSION_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_SECRET'],
        message:
          'SESSION_SECRET must be set to a strong, unique value in production',
      });
    }

    if (!env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be "true" in production',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): Environment {
  return environmentSchema.parse(input);
}

// Resolves the value passed to Fastify's `trustProxy`. Returning `false` makes
// Fastify use the raw socket address, so a forged `X-Forwarded-For` cannot
// poison `request.ip` (which feeds rate limiting and audit logs).
export function resolveTrustProxy(env: Environment): boolean | number | string {
  const raw = env.TRUSTED_PROXY?.trim();
  if (raw === undefined || raw === '') {
    return env.NODE_ENV === 'production' ? 1 : false;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  // Comma-separated IP/CIDR allowlist handed straight to Fastify.
  return raw;
}
