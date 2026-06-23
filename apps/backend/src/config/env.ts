import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const environmentSchema = z.object({
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
    .default('postgresql://dracing:dracing@localhost:5432/dracing'),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default('development-session-secret-change-me-now'),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GOOGLE_REDIRECT_URI: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url().optional(),
  ),
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(
  input: NodeJS.ProcessEnv = process.env,
): Environment {
  return environmentSchema.parse(input);
}
