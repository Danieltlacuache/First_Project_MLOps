import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { annotations, categories } from '@/db/schema';
import {
  areaOf,
  type CreateAnnotationInput,
  type CreateCategoryInput,
  type UpdateAnnotationInput,
} from '@/domain/coco';

export async function listCategories() {
  return db.select().from(categories).orderBy(categories.id);
}

export async function createCategory(input: CreateCategoryInput) {
  const existente = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, input.name));

  if (existente.length > 0) {
    throw new Error(`La categoría "${input.name}" ya existe.`);
  }

  await db.insert(categories).values(input);
  return listCategories();
}

export async function listAnnotationsByImage(imageId: number) {
  const rows = await db
    .select({
      id: annotations.id,
      imageId: annotations.imageId,
      categoryId: annotations.categoryId,
      bboxX: annotations.bboxX,
      bboxY: annotations.bboxY,
      bboxWidth: annotations.bboxWidth,
      bboxHeight: annotations.bboxHeight,
      isCrowd: annotations.isCrowd,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(annotations)
    .leftJoin(categories, eq(annotations.categoryId, categories.id))
    .where(eq(annotations.imageId, imageId));

  return rows.map((r) => ({
    id: r.id,
    imageId: r.imageId,
    categoryId: r.categoryId,
    bbox: { x: r.bboxX, y: r.bboxY, width: r.bboxWidth, height: r.bboxHeight },
    isCrowd: r.isCrowd,
    category: r.categoryName ? { name: r.categoryName, color: r.categoryColor } : null,
  }));
}

export async function createAnnotation(input: CreateAnnotationInput) {
  const { bbox } = input;
  const result = await db.insert(annotations).values({
    imageId: input.imageId,
    categoryId: input.categoryId,
    bboxX: bbox.x,
    bboxY: bbox.y,
    bboxWidth: bbox.width,
    bboxHeight: bbox.height,
    area: areaOf(bbox),
    isCrowd: input.isCrowd,
  });
  const [header] = result;
  const insertId = header.insertId;
  return Number(insertId);
}

export async function deleteAnnotation(id: number) {
  const [header] = await db.delete(annotations).where(eq(annotations.id, id));
  if (header.affectedRows === 0) {
    throw new Error(`La anotación ${id} no existe.`);
  }
}

export async function updateAnnotation(id: number, data: UpdateAnnotationInput) {
  // Tipado estricto en lugar de 'any'
  const updateData: {
    updatedAt: Date;
    categoryId?: number;
    bboxX?: number;
    bboxY?: number;
    bboxWidth?: number;
    bboxHeight?: number;
    area?: number;
  } = { updatedAt: new Date() };

  if (data.categoryId) updateData.categoryId = data.categoryId;
  if (data.bbox) {
    updateData.bboxX = data.bbox.x;
    updateData.bboxY = data.bbox.y;
    updateData.bboxWidth = data.bbox.width;
    updateData.bboxHeight = data.bbox.height;
    updateData.area = areaOf(data.bbox);
  }

    const [header] = await db.update(annotations).set(updateData).where(eq(annotations.id, id));
  if (header.affectedRows === 0) {
    throw new Error(`La anotación ${id} no existe.`);
  }
}
