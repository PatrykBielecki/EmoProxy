import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRootEnvPath = path.resolve(currentFileDir, '../../../.env');

dotenv.config({
  path: monorepoRootEnvPath,
  override: false
});
dotenv.config({ override: false });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://emotions:emotions@localhost:5432/emotions?schema=public'),
  JWT_SECRET: z.string().min(16).default('development_jwt_secret_change_me'),
  ADMIN_DEFAULT_USERNAME: z.string().min(3).default('admin'),
  ADMIN_DEFAULT_PASSWORD: z.string().min(8).default('admin12345'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIME_WINDOW: z
    .string()
    .describe('Rate-limit window in Fastify format, e.g. 1 minute or 30 seconds')
    .default('1 minute')
});

export const env = envSchema.parse(process.env);
