import { and, count, desc, eq, exists, gte, inArray, lte, not } from 'drizzle-orm';
import { imageSize } from 'image-size';
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';
import { MAX_UPLOAD_BYTES, uploadImageSchema } from '@/domain/coco';
import { parseQuery } from '@/lib/services/search';
import { buildObjectKey, putImage } from '@/lib/storage';

// Cuántos resultados se muestran por página en una BÚSQUEDA.
const PAGE_SIZE = 3;

// Una categoría anotada en una imagen (para mostrar los "chips" de clase).
type ImageClass = { name: string; color: string };

/** Clases distintas anotadas en cada imagen del listado (resuelto en SQL). */
async function getClassesByImage(imageIds: number[]): Promise<Map<number, ImageClass[]>> {
  const map = new Map<number, ImageClass[]>();
  if (imageIds.length === 0) return map;

  const rows = await db
    .selectDistinct({
      imageId: annotations.imageId,
      name: categories.name,
      color: categories.color,
    })
    .from(annotations)
    .innerJoin(categories, eq(annotations.categoryId, categories.id))
    .where(inArray(annotations.imageId, imageIds));

  for (const r of rows) {
    const list = map.get(r.imageId) ?? [];
    list.push({ name: r.name, color: r.color });
    map.set(r.imageId, list);
  }
  return map;
}

type SearchParams = {
  q?: string | string[];
  status?: string | string[];
  from?: string | string[];
  to?: string | string[];
  page?: string | string[];
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
      exists(
        db
          .select({ id: annotations.id })
          .from(annotations)
          .where(eq(annotations.imageId, images.id)),
      ),
    );
  } else if (status === 'pending') {
    conditions.push(
      not(
        exists(
          db
            .select({ id: annotations.id })
            .from(annotations)
            .where(eq(annotations.imageId, images.id)),
        ),
      ),
    );
  }

  if (q) {
    conditions.push(parseQuery(q));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // ¿Hay una búsqueda o filtro activo? Solo en ese caso paginamos.
  const searchActive = Boolean(q || (status && status !== 'all') || from || to);

  // Índice normal (sin búsqueda): TODAS las imágenes, sin paginar ni clases.
  if (!searchActive) {
    const rows = await db.select().from(images).where(where).orderBy(desc(images.createdAt));
    const data = rows.map((r) => ({ ...r, classes: [] as ImageClass[] }));
    return { data, total: data.length, page: 1, totalPages: 1, searchActive: false };
  }

  // Resultados de búsqueda: paginados de a PAGE_SIZE.
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // 1. El "trozo" de resultados de esta página (LIMIT/OFFSET en SQL).
  const rows = await db
    .select()
    .from(images)
    .where(where)
    .orderBy(desc(images.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  // 2. Cuántos resultados cumplen el filtro EN TOTAL (mismos WHERE), para saber
  //    cuántas páginas hay. Se resuelve en la BD con COUNT(*).
  const [totalRow] = await db.select({ value: count() }).from(images).where(where);
  const total = totalRow?.value ?? 0;

  // 3. Adjuntamos a cada resultado sus clases anotadas (para los chips).
  const classesByImage = await getClassesByImage(rows.map((r) => r.id));
  const data = rows.map((r) => ({ ...r, classes: classesByImage.get(r.id) ?? [] }));

  return {
    data,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    searchActive: true,
  };
}

export async function getImage(id: number) {
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function uploadImage(file: File) {
  const meta = uploadImageSchema.safeParse({ type: file.type, size: file.size });
  if (!meta.success) {
    const failed = meta.error.issues[0]?.path[0];
    if (failed === 'type') {
      throw new Error(`Tipo no permitido: ${file.type}. Usa JPEG, PNG o WebP.`);
    }
    throw new Error(`El archivo supera el máximo de ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
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
