import { and, between, count, eq, exists, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';

export async function searchImages(params: {
  query?: string; // Ej: "car AND person"
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}) {
  const conditions: SQL[] = [];

  // 1. Rango de Fechas combinable
  if (params.dateFrom && params.dateTo) {
    conditions.push(between(images.createdAt, params.dateFrom, params.dateTo));
  }

  // 2. Operador Lógico AND resuelto puramente en SQL (Subqueries EXISTS)
  if (params.query) {
    const terms = params.query.split(' AND ').map((t) => t.trim());

    for (const term of terms) {
      conditions.push(
        exists(
          db
            .select()
            .from(annotations)
            .innerJoin(categories, eq(annotations.categoryId, categories.id))
            .where(and(eq(annotations.imageId, images.id), eq(categories.name, term))),
        ),
      );
    }
  }

  const offset = (params.page - 1) * params.limit;

  // 3. Ejecutar consulta principal paginada
  const data = await db
    .select()
    .from(images)
    .where(and(...conditions))
    .limit(params.limit)
    .offset(offset);

  // 4. Conteo total para la paginación correcta
  const [totalRecord] = await db
    .select({ value: count() })
    .from(images)
    .where(and(...conditions));

  const total = totalRecord?.value ?? 0;

  return {
    data,
    meta: {
      total: total,
      page: params.page,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
