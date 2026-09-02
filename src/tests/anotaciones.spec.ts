import { describe, expect, it } from 'vitest';
import { createAnnotationSchema } from '../domain/coco';

describe('Feature: Validación de Bounding Boxes', () => {
  it('Then el sistema debe rechazar la operación si falta el categoryId', () => {
    const cajaSinCategoria = {
      imageId: 1,
      bbox: { x: 10, y: 10, width: 100, height: 100 },
      isCrowd: 0 as const,
      // categoryId intencionalmente omitido
    };

    const result = createAnnotationSchema.safeParse(cajaSinCategoria);

    // Esperamos que falle la validación (success === false)
    expect(result.success).toBe(false);
  });
});
