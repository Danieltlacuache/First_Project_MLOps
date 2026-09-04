import { describe, expect, it } from 'vitest';
import { buildCocoDataset } from '@/domain/coco';

// Corresponde a: src/tests/features/exportacion-coco.feature
// Escenario: "Cada anotación exportada incluye el campo iscrowd"
// Los otros 3 escenarios de ese .feature ya estaban cubiertos por
// src/tests/coco.test.ts; a este le faltaba prueba propia.

describe('Feature: Exportación del dataset en formato COCO', () => {
  it('Then la anotación exportada debe incluir iscrowd igual a 0', () => {
    const dataset = buildCocoDataset(
      [{ id: 1, fileName: 'gato.jpg', width: 640, height: 480, createdAt: new Date() }],
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

    expect(dataset.annotations[0]?.iscrowd).toBe(0);
  });
});
