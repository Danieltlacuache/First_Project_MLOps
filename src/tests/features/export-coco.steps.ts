import { expect } from 'vitest';
import { Given, Then, When } from 'vitest-cucumber-plugin';
import { buildCocoDataset, type CocoDataset } from '@/domain/coco';

// Corresponde a: src/tests/features/exportacion-coco.feature
// Escenarios de dominio puro (buildCocoDataset), sin base de datos — mismo
// patrón que src/tests/coco.test.ts.

interface CocoImageInput {
  id: number;
  fileName: string;
  width: number;
  height: number;
  createdAt: Date;
}
interface CocoCategoryInput {
  id: number;
  name: string;
  supercategory: string;
}
interface CocoAnnotationInput {
  id: number;
  imageId: number;
  categoryId: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  area: number;
  isCrowd: number;
}

interface CocoState {
  images?: CocoImageInput[];
  categories?: CocoCategoryInput[];
  annotations?: CocoAnnotationInput[];
  dataset?: CocoDataset;
}

const BASE_IMAGE: CocoImageInput = {
  id: 1,
  fileName: 'gato.jpg',
  width: 640,
  height: 480,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
const BASE_CATEGORY: CocoCategoryInput = { id: 5, name: 'cat', supercategory: 'animal' };

Given<CocoState, CocoState>(
  'una anotación guardada con bbox x=10, y=20, width=100, height=50',
  () => ({
    images: [BASE_IMAGE],
    categories: [BASE_CATEGORY],
    annotations: [
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
  }),
);

Given<CocoState, CocoState>('una anotación guardada con bbox width=100, height=50', () => ({
  images: [BASE_IMAGE],
  categories: [BASE_CATEGORY],
  annotations: [
    {
      id: 9,
      imageId: 1,
      categoryId: 5,
      bboxX: 0,
      bboxY: 0,
      bboxWidth: 100,
      bboxHeight: 50,
      area: 5000,
      isCrowd: 0,
    },
  ],
}));

Given<CocoState, CocoState>('una imagen, una categoría y una anotación que las referencia', () => ({
  images: [BASE_IMAGE],
  categories: [BASE_CATEGORY],
  annotations: [
    {
      id: 9,
      imageId: BASE_IMAGE.id,
      categoryId: BASE_CATEGORY.id,
      bboxX: 10,
      bboxY: 20,
      bboxWidth: 100,
      bboxHeight: 50,
      area: 5000,
      isCrowd: 0,
    },
  ],
}));

Given<CocoState, CocoState>(
  'una anotación guardada sin marcar como grupo \\(isCrowd = 0\\)',
  () => ({
    images: [BASE_IMAGE],
    categories: [BASE_CATEGORY],
    annotations: [
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
  }),
);

When<CocoState, CocoState>('exporto el dataset a formato COCO', (state) => ({
  ...state,
  dataset: buildCocoDataset(state.images ?? [], state.categories ?? [], state.annotations ?? []),
}));

Then<CocoState>('la anotación exportada debe traer bbox igual a [10, 20, 100, 50]', (state) => {
  expect(state.dataset?.annotations[0]?.bbox).toEqual([10, 20, 100, 50]);
});

Then<CocoState>('el campo area de la anotación exportada debe ser 5000', (state) => {
  expect(state.dataset?.annotations[0]?.area).toBe(5000);
});

Then<CocoState>(
  'annotations[].image_id debe coincidir con el id de esa imagen en images[]',
  (state) => {
    expect(state.dataset?.annotations[0]?.image_id).toBe(state.dataset?.images[0]?.id);
  },
);

Then<CocoState>(
  'annotations[].category_id debe coincidir con el id de esa categoría en categories[]',
  (state) => {
    expect(state.dataset?.annotations[0]?.category_id).toBe(state.dataset?.categories[0]?.id);
  },
);

Then<CocoState>('la anotación exportada debe incluir iscrowd igual a 0', (state) => {
  expect(state.dataset?.annotations[0]?.iscrowd).toBe(0);
});
