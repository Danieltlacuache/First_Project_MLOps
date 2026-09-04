import { expect } from 'vitest';
import { Given, Then, When } from 'vitest-cucumber-plugin';
import { areaOf, type BBox } from '@/domain/coco';

// Corresponde a: src/tests/features/area-bbox.feature
// Escenario de dominio puro (areaOf), sin base de datos — mismos valores que
// ya cubría src/tests/coco.test.ts > describe('areaOf').

interface AreaState {
  bbox?: BBox;
  area?: number;
}

Given<AreaState, AreaState>('un bounding box con width=30 y height=4', () => ({
  bbox: { x: 0, y: 0, width: 30, height: 4 },
}));

When<AreaState, AreaState>('calculo el área del bounding box', (state) => ({
  ...state,
  area: state.bbox ? areaOf(state.bbox) : undefined,
}));

Then<AreaState>('el área debe ser 120', (state) => {
  expect(state.area).toBe(120);
});
