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
