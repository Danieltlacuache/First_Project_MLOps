import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Client } from 'minio';
import { env } from '@/lib/env';

/**
 * Capa de datos — archivos binarios (MinIO / S3).
 * `internal` habla por la red de docker (host: minio).
 * `publicClient` firma URLs con el host que ve el navegador (localhost).
 */
const globalForMinio = globalThis as unknown as { __minio?: Client; __minioPublic?: Client };

export const minio =
  globalForMinio.__minio ??
  new Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ROOT_USER,
    secretKey: env.MINIO_ROOT_PASSWORD,
  });

const publicUrl = new URL(env.MINIO_PUBLIC_ENDPOINT);

export const minioPublic =
  globalForMinio.__minioPublic ??
  new Client({
    endPoint: publicUrl.hostname,
    port: Number(publicUrl.port || (publicUrl.protocol === 'https:' ? 443 : 80)),
    useSSL: publicUrl.protocol === 'https:',
    accessKey: env.MINIO_ROOT_USER,
    secretKey: env.MINIO_ROOT_PASSWORD,
  });

if (env.NODE_ENV !== 'production') {
  globalForMinio.__minio = minio;
  globalForMinio.__minioPublic = minioPublic;
}

export const BUCKET = env.MINIO_BUCKET;

export async function ensureBucket(): Promise<void> {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) await minio.makeBucket(BUCKET);
}

export function buildObjectKey(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin';
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `raw/${y}/${m}/${randomUUID()}.${ext}`;
}

export async function putImage(objectKey: string, body: Buffer, mimeType: string): Promise<void> {
  await minio.putObject(BUCKET, objectKey, body, body.byteLength, {
    'Content-Type': mimeType,
  });
}

export async function getImageStream(objectKey: string): Promise<Readable> {
  return minio.getObject(BUCKET, objectKey);
}

/** URL temporal para que el navegador lea el objeto directo de MinIO. */
export async function presignedImageUrl(objectKey: string, seconds = 3600): Promise<string> {
  return minioPublic.presignedGetObject(BUCKET, objectKey, seconds);
}

export async function pingStorage(): Promise<boolean> {
  return minio.bucketExists(BUCKET);
}
