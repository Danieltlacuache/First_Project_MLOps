import '@/lib/load-env';
import { expect } from 'vitest';
import { Before, Given, Then, When } from 'vitest-cucumber-plugin';
import { deleteAnnotation, updateAnnotation } from '@/lib/services/annotations';

// Corresponde a: src/tests/features/anotacion-recurso-inexistente.feature
//
// Prueba de integración real contra la BD de desarrollo. Igual que en
// categoria-duplicada.steps.ts, la llamada async real ocurre en un Before
// hook con tag propio por escenario (el bridge síncrono Given/When/Then no
// espera promesas); los pasos solo hacen aserciones sobre el resultado ya
// resuelto.

const NON_EXISTENT_ID = 999_999;

interface AnotacionState {
  error?: Error;
}

Before<AnotacionState, AnotacionState>(
  { name: 'intenta actualizar la anotación inexistente', tags: '@anotacionUpdateInexistente' },
  async () => {
    let error: Error | undefined;
    try {
      await updateAnnotation(NON_EXISTENT_ID, { categoryId: 1 });
    } catch (err) {
      error = err as Error;
    }
    return { error };
  },
);

Before<AnotacionState, AnotacionState>(
  { name: 'intenta borrar la anotación inexistente', tags: '@anotacionDeleteInexistente' },
  async () => {
    let error: Error | undefined;
    try {
      await deleteAnnotation(NON_EXISTENT_ID);
    } catch (err) {
      error = err as Error;
    }
    return { error };
  },
);

Given<AnotacionState>('no existe ninguna anotación con id 999999', () => {
  // Garantizado por el seed: nunca se inserta una anotación con este id.
});

When<AnotacionState>('intento actualizar la categoría de la anotación 999999', () => {
  // El intento real ya ocurrió en el Before hook de este escenario.
});

When<AnotacionState>('intento borrar la anotación 999999', () => {
  // El intento real ya ocurrió en el Before hook de este escenario.
});

Then<AnotacionState>(
  'el sistema debe rechazar la operación indicando que el recurso no existe',
  (state) => {
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error?.message).toMatch(/no existe/i);
  },
);
