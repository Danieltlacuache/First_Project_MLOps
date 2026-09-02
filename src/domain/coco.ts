import { z } from 'zod';

/**
 * Capa de lógica — contratos del dominio.
 * Formato COCO "object detection": https://cocodataset.org/#format-data
 */

export const bboxSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type BBox = z.infer<typeof bboxSchema>;

export const createAnnotationSchema = z.object({
  imageId: z.number().int().positive(),
  categoryId: z.number().int().positive().optional(),
  bbox: bboxSchema,
  isCrowd: z.union([z.literal(0), z.literal(1)]).default(0),
});
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(128),
  supercategory: z.string().min(1).max(128).default('object'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Debe ser un color hex tipo #ef4444')
    .default('#ef4444'),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ── Estructuras COCO de salida ────────────────────────────────────────
export const cocoImageSchema = z.object({
  id: z.number().int(),
  file_name: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  date_captured: z.string(),
});

export const cocoCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  supercategory: z.string(),
});

export const cocoAnnotationSchema = z.object({
  id: z.number().int(),
  image_id: z.number().int(),
  category_id: z.number().int(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  area: z.number(),
  iscrowd: z.union([z.literal(0), z.literal(1)]),
  segmentation: z.array(z.array(z.number())),
});

export const cocoDatasetSchema = z.object({
  info: z.object({
    description: z.string(),
    version: z.string(),
    year: z.number().int(),
    date_created: z.string(),
  }),
  licenses: z.array(z.object({ id: z.number().int(), name: z.string(), url: z.string() })),
  images: z.array(cocoImageSchema),
  categories: z.array(cocoCategorySchema),
  annotations: z.array(cocoAnnotationSchema),
});
export type CocoDataset = z.infer<typeof cocoDatasetSchema>;

export const areaOf = (b: BBox): number => b.width * b.height;

type ImageLike = {
  id: number;
  fileName: string;
  width: number;
  height: number;
  createdAt: Date;
};
type CategoryLike = { id: number; name: string; supercategory: string };
type AnnotationLike = {
  id: number;
  imageId: number;
  categoryId: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  area: number;
  isCrowd: number;
};

/** Convierte filas de la BD al JSON COCO listo para entrenar. */
export function buildCocoDataset(
  images: ImageLike[],
  categories: CategoryLike[],
  annotations: AnnotationLike[],
  meta: { description?: string; version?: string } = {},
): CocoDataset {
  const now = new Date();
  return {
    info: {
      description: meta.description ?? 'Annotation Portal dataset',
      version: meta.version ?? '1.0',
      year: now.getUTCFullYear(),
      date_created: now.toISOString(),
    },
    licenses: [{ id: 1, name: 'Uso interno', url: '' }],
    images: images.map((i) => ({
      id: i.id,
      file_name: i.fileName,
      width: i.width,
      height: i.height,
      date_captured: i.createdAt.toISOString(),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      supercategory: c.supercategory,
    })),
    annotations: annotations.map((a) => ({
      id: a.id,
      image_id: a.imageId,
      category_id: a.categoryId,
      bbox: [a.bboxX, a.bboxY, a.bboxWidth, a.bboxHeight] as [number, number, number, number],
      area: a.area,
      iscrowd: (a.isCrowd === 1 ? 1 : 0) as 0 | 1,
      segmentation: [],
    })),
  };
}
