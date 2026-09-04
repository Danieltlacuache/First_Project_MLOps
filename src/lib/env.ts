import { z } from 'zod';

/**
 * Capa 0 — configuración.
 * Valida process.env una sola vez, al arrancar. Si falta algo, la app
 * revienta aquí con un mensaje claro en vez de fallar a media petición.
 * NO importar esto desde componentes 'use client'.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  MINIO_PUBLIC_ENDPOINT: z.url().default('http://localhost:9000'),
  // URL de la consola web de MinIO (para enlazarla en la UI sin hardcodear).
  MINIO_CONSOLE_URL: z.url().default('http://localhost:9001'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas o faltantes:\n${detail}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
