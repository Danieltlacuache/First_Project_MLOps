import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/lib/env';
import * as schema from './schema';

/**
 * Pool único reutilizado entre hot-reloads de Next (si no, se agotan
 * las conexiones de MariaDB en desarrollo).
 */
const globalForDb = globalThis as unknown as { __pool?: mysql.Pool };

export const pool =
  globalForDb.__pool ??
  mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
    timezone: 'Z',
  });

if (env.NODE_ENV !== 'production') globalForDb.__pool = pool;

export const db = drizzle(pool, { schema, mode: 'default' });

export async function pingDb(): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

export { schema };
