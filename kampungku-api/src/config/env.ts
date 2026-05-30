import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  // WhatsApp (Fonnte) — optional; reminders skip silently if absent
  FONNTE_API_KEY: z.string().optional(),
  FONNTE_SENDER_NUMBER: z.string().optional(),
  // Cron
  IURAN_REMINDER_DAY: z.coerce.number().int().min(1).max(28).default(25),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment variables tidak valid:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
