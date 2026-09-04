import { Given, When } from 'vitest-cucumber-plugin';
import { type BBox, createAnnotationSchema } from '@/domain/coco';

// Corresponde a: src/tests/features/bbox-dimensiones-invalidas.feature
// Escenario de dominio puro (Zod), sin base de datos — mismos valores que ya
// cubría src/tests/coco.test.ts > 'rechaza un bbox con ancho cero'.
//
// El paso Then ("el sistema debe rechazar la operación con un error de
// validación de Zod") ya está registrado en bbox-categoria.steps.ts con el
// mismo texto exacto; no se repite aquí porque los step definitions son
// globales para toda la corrida (registrarlo dos veces con el mismo texto
// rompería el matching con "More than one step which matches").

interface BboxDimensionesState {
  bbox?: BBox;
  result?: ReturnType<typeof createAnnotationSchema.safeParse>;
}

Given<BboxDimensionesState, BboxDimensionesState>(
  'un bounding box con width=0 y height=10',
  () => ({
    bbox: { x: 0, y: 0, width: 0, height: 10 },
  }),
);

Given<BboxDimensionesState, BboxDimensionesState>(
  'un bounding box con width=10 y height=0',
  () => ({
    bbox: { x: 0, y: 0, width: 10, height: 0 },
  }),
);

When<BboxDimensionesState, BboxDimensionesState>('intento validar el bounding box', (state) => ({
  ...state,
  result: createAnnotationSchema.safeParse({
    imageId: 1,
    categoryId: 2,
    bbox: state.bbox,
  }),
}));
