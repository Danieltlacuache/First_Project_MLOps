import { expect } from 'vitest';
import { Given, Then, When } from 'vitest-cucumber-plugin';
import { type BBox, createAnnotationSchema } from '@/domain/coco';

// Corresponde a: src/tests/features/anotacion-categoria.feature
// Escenario de dominio puro (Zod), sin base de datos.

interface BboxState {
  bbox?: BBox;
  result?: ReturnType<typeof createAnnotationSchema.safeParse>;
}

Given<BboxState, BboxState>('un bounding box con coordenadas x, y, width, height válidas', () => ({
  bbox: { x: 10, y: 10, width: 100, height: 100 },
}));

When<BboxState, BboxState>(
  'intento procesar el bounding box sin proporcionar un category_id',
  (state) => ({
    ...state,
    result: createAnnotationSchema.safeParse({
      imageId: 1,
      bbox: state.bbox,
      isCrowd: 0,
      // categoryId intencionalmente omitido
    }),
  }),
);

Then<BboxState>(
  'el sistema debe rechazar la operación con un error de validación de Zod',
  (state) => {
    expect(state.result?.success).toBe(false);
  },
);
