import { defineConfig } from 'drizzle-kit';
import { APP_ENV } from './src/lib/load-env';

console.log(`drizzle-kit → entorno ${APP_ENV}, base de datos "${process.env.DB_NAME}"`);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'annotation_portal_dev',
  },
  verbose: true,
  strict: true,
});
