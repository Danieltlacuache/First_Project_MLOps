import { count, countDistinct, eq } from 'drizzle-orm';
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';

export async function getDashboardMetrics() {
  // Conteo total resuelto en SQL tipado
  const [imagesRecord] = await db.select({ value: count() }).from(images);
  const [annotationsRecord] = await db.select({ value: count() }).from(annotations);

  // Progreso de anotación: cuántas imágenes DISTINTAS tienen al menos una caja.
  // countDistinct sobre annotations.imageId → resuelto en la BD, no en memoria.
  const [annotatedRecord] = await db
    .select({ value: countDistinct(annotations.imageId) })
    .from(annotations);

  // Gráfica: Objetos por clase (Agrupación real en BD para evitar valores estáticos)
  const objectsPerClass = await db
    .select({
      className: categories.name,
      color: categories.color,
      count: count(annotations.id), // Uso seguro de count() para la relación
    })
    .from(categories)
    .leftJoin(annotations, eq(categories.id, annotations.categoryId))
    .groupBy(categories.id, categories.name, categories.color);

  const totalImages = imagesRecord?.value ?? 0;
  const annotatedImages = annotatedRecord?.value ?? 0;

  return {
    totals: {
      images: totalImages,
      annotations: annotationsRecord?.value ?? 0,
    },
    progress: {
      total: totalImages,
      annotated: annotatedImages,
      pending: Math.max(0, totalImages - annotatedImages),
    },
    chartData: objectsPerClass,
  };
}
