import { desc, eq } from 'drizzle-orm';
import { imageSize } from 'image-size';
import { db } from '@/db';
import { images } from '@/db/schema';
import { buildObjectKey, putImage } from '@/lib/storage';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function listImages() {
  return db.select().from(images).orderBy(desc(images.createdAt));
}

export async function getImage(id: number) {
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Sube el archivo a MinIO y guarda sus metadatos en MariaDB. */
export async function uploadImage(file: File) {
  if (!ALLOWED.has(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}. Usa JPEG, PNG o WebP.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dims = imageSize(buffer);
  if (!dims.width || !dims.height) throw new Error('No se pudieron leer las dimensiones.');

  const objectKey = buildObjectKey(file.name);
  await putImage(objectKey, buffer, file.type);

  const result = await db.insert(images).values({
    fileName: file.name,
    objectKey,
    width: dims.width,
    height: dims.height,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
  });

  const [header] = result;
  const insertId = header.insertId;
  return getImage(Number(insertId));
}
