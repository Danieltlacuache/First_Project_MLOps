import { and, desc, eq, exists, gte, lte, not } from 'drizzle-orm';
import { imageSize } from 'image-size';
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';
import { buildObjectKey, putImage } from '@/lib/storage';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

type SearchParams = {
  q?: string | string[];
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

export async function listImages(params: SearchParams = {}) {
  const conditions = [];


  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const to = Array.isArray(params.to) ? params.to[0] : params.to;


  if (from) {
    conditions.push(gte(images.createdAt, new Date(`${from}T00:00:00.000Z`)));
  }
  if (to) {
    conditions.push(lte(images.createdAt, new Date(`${to}T23:59:59.999Z`)));
  }


  if (status === 'annotated') {
    conditions.push(
      exists(db.select({ id: annotations.id }).from(annotations).where(eq(annotations.imageId, images.id)))
    );
  } else if (status === 'pending') {
    conditions.push(
      not(exists(db.select({ id: annotations.id }).from(annotations).where(eq(annotations.imageId, images.id))))
    );
  }


  if (q) {
    const classes = q.split('AND').map((s) => s.trim()).filter(Boolean);
    
    for (const className of classes) {
      conditions.push(
        exists(
          db.select({ id: annotations.id })
            .from(annotations)
            .innerJoin(categories, eq(annotations.categoryId, categories.id))
            .where(
              and(
                eq(annotations.imageId, images.id),
                eq(categories.name, className)
              )
            )
        )
      );
    }
  }

  return db.select()
    .from(images)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(images.createdAt));
}

export async function getImage(id: number) {
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ?? null;
}

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