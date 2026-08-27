import { config } from 'dotenv';

/**
 * Carga de .env para herramientas que NO pasan por Next.js
 * (drizzle-kit y el seeder). Next carga estos archivos por su cuenta.
 *
 * Orden = precedencia: dotenv no sobrescribe lo ya definido, así que el
 * archivo específico del entorno gana sobre el .env compartido.
 */
const appEnv = process.env.APP_ENV === 'production' ? 'production' : 'development';

config({ path: `.env.${appEnv}`, quiet: true });
config({ path: '.env', quiet: true });

export const APP_ENV = appEnv;
