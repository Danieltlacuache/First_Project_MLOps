import { describe, expect, it } from 'vitest';
import { areaOf, buildCocoDataset, cocoDatasetSchema, createAnnotationSchema } from '@/domain/coco';

describe('areaOf', () => {
  it('calcula ancho por alto', () => {
    expect(areaOf({ x: 10, y: 20, width: 30, height: 4 })).toBe(120);
  });
});

describe('createAnnotationSchema', () => {
  it('acepta un bbox válido y aplica el default de isCrowd', () => {
    const parsed = createAnnotationSchema.parse({
      imageId: 1,
      categoryId: 2,
      bbox: { x: 0, y: 0, width: 10, height: 10 },
    });
    expect(parsed.isCrowd).toBe(0);
  });

  it('rechaza un bbox con ancho cero', () => {
    const res = createAnnotationSchema.safeParse({
      imageId: 1,
      categoryId: 2,
      bbox: { x: 0, y: 0, width: 0, height: 10 },
    });
    expect(res.success).toBe(false);
  });
});

describe('buildCocoDataset', () => {
  const dataset = buildCocoDataset(
    [
      {
        id: 1,
        fileName: 'gato.jpg',
        width: 640,
        height: 480,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ],
    [{ id: 5, name: 'cat', supercategory: 'animal' }],
    [
      {
        id: 9,
        imageId: 1,
        categoryId: 5,
        bboxX: 10,
        bboxY: 20,
        bboxWidth: 100,
        bboxHeight: 50,
        area: 5000,
        isCrowd: 0,
      },
    ],
  );

  it('produce un JSON que cumple el esquema COCO', () => {
    expect(cocoDatasetSchema.safeParse(dataset).success).toBe(true);
  });

  it('serializa el bbox como [x, y, w, h]', () => {
    expect(dataset.annotations[0]?.bbox).toEqual([10, 20, 100, 50]);
  });

  it('mapea image_id y category_id', () => {
    expect(dataset.annotations[0]?.image_id).toBe(1);
    expect(dataset.annotations[0]?.category_id).toBe(5);
  });
});
