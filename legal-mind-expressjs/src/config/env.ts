import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PYTHON_API_BASE_URL: z.string().url().default('http://localhost:8001'),
  EXPRESS_INTERNAL_API_KEY: z.string().min(1).default('super-secret-internal-key'),
  APP_JWT_SECRET: z.string().min(32).default('change-me-change-me-change-me-change'),
  APP_REFRESH_JWT_SECRET: z
    .string()
    .min(32)
    .default('change-me-change-me-change-me-refresh'),
  APP_ACCESS_TOKEN_TTL: z.string().default('1h'),
  APP_REFRESH_TOKEN_TTL: z.string().default('30d'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
