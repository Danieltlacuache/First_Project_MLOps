import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { annotations, categories } from '@/db/schema';
import { areaOf, type CreateAnnotationInput, type CreateCategoryInput } from '@/domain/coco';

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
