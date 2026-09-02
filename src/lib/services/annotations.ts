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
  await db.insert(categories).values(input);
  return listCategories();
}

export async function listAnnotationsByImage(imageId: number) {
  return db.select().from(annotations).where(eq(annotations.imageId, imageId));
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
  await db.delete(annotations).where(eq(annotations.id, id));
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

  await db.update(annotations).set(updateData).where(eq(annotations.id, id));
}
