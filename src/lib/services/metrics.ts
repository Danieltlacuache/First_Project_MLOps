import { count, eq } from 'drizzle-orm'; // Importamos count directamente
import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';

export async function getDashboardMetrics() {
  // Conteo total resuelto en SQL tipado
  const [imagesRecord] = await db.select({ value: count() }).from(images);
  const [annotationsRecord] = await db.select({ value: count() }).from(annotations);

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

  return {
    totals: {
      images: imagesRecord?.value ?? 0,
      annotations: annotationsRecord?.value ?? 0,
    },
    chartData: objectsPerClass,
  };
}
