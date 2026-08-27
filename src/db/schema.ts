import { relations } from 'drizzle-orm';
import {
  bigint,
  double,
  index,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

/**
 * Capa de datos — modelo alineado al formato COCO (detection).
 *   images  →  "images"
 *   categories → "categories"
 *   annotations → "annotations" (bbox = [x, y, width, height])
 */

export const images = mysqlTable(
  'images',
  {
    id: int('id').primaryKey().autoincrement(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    // Llave del objeto en MinIO (bucket definido en .env)
    objectKey: varchar('object_key', { length: 512 }).notNull(),
    width: int('width').notNull(),
    height: int('height').notNull(),
    mimeType: varchar('mime_type', { length: 64 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    checksum: varchar('checksum', { length: 64 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('images_object_key_uq').on(t.objectKey)],
);

export const categories = mysqlTable(
  'categories',
  {
    id: int('id').primaryKey().autoincrement(),
    name: varchar('name', { length: 128 }).notNull(),
    supercategory: varchar('supercategory', { length: 128 }).notNull().default('object'),
    // Color hex para pintar la caja en la UI, ej. "#ef4444"
    color: varchar('color', { length: 9 }).notNull().default('#ef4444'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_name_uq').on(t.name)],
);

export const annotations = mysqlTable(
  'annotations',
  {
    id: int('id').primaryKey().autoincrement(),
    imageId: int('image_id')
      .notNull()
      .references(() => images.id, { onDelete: 'cascade' }),
    categoryId: int('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    // bbox en píxeles, esquina superior izquierda + tamaño (convención COCO)
    bboxX: double('bbox_x').notNull(),
    bboxY: double('bbox_y').notNull(),
    bboxWidth: double('bbox_width').notNull(),
    bboxHeight: double('bbox_height').notNull(),
    area: double('area').notNull(),
    isCrowd: tinyint('is_crowd').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index('annotations_image_idx').on(t.imageId),
    index('annotations_category_idx').on(t.categoryId),
  ],
);

export const imagesRelations = relations(images, ({ many }) => ({
  annotations: many(annotations),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  annotations: many(annotations),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  image: one(images, { fields: [annotations.imageId], references: [images.id] }),
  category: one(categories, { fields: [annotations.categoryId], references: [categories.id] }),
}));

export type ImageRow = typeof images.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type AnnotationRow = typeof annotations.$inferSelect;
