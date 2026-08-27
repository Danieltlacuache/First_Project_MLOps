import { NextResponse } from 'next/server';
import { pingDb } from '@/db';
import { env } from '@/lib/env';
import { pingStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [dbRes, storageRes] = await Promise.allSettled([pingDb(), pingStorage()]);

  const database = dbRes.status === 'fulfilled' && dbRes.value;
  const storage = storageRes.status === 'fulfilled' && storageRes.value;
  const ok = database && storage;

  return NextResponse.json(
    {
      ok,
      environment: env.NODE_ENV,
      database: env.DB_NAME,
      bucket: env.MINIO_BUCKET,
      services: {
        database: database ? 'up' : 'down',
        storage: storage ? 'up' : 'down',
      },
      errors: {
        database: dbRes.status === 'rejected' ? String(dbRes.reason) : null,
        storage: storageRes.status === 'rejected' ? String(storageRes.reason) : null,
      },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
