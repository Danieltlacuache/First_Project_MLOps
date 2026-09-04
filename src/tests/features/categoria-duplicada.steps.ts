import { randomUUID } from 'node:crypto';
import '@/lib/load-env';
import { eq } from 'drizzle-orm';
import { expect } from 'vitest';
import { After, Before, Given, Then, When } from 'vitest-cucumber-plugin';
import { db } from '@/db';
import { type CategoryRow, categories } from '@/db/schema';
import { createCategory } from '@/lib/services/annotations';

// Corresponde a: src/tests/features/categoria-nombre-unico.feature
//
// Prueba de integración real contra la BD de desarrollo (requiere
// `npm run infra:up && npm run db:push` antes de `npm test`, igual que
// categoria-duplicada.test.ts).
//
// El Gherkin describe la regla en términos de "car" (la categoría del seed),
// pero el Before hook usa un nombre aleatorio para no depender de/mutar la
// categoría compartida del seed y evitar contaminar corridas en paralelo.
//
// Nota técnica: el bridge Given/When/Then de este plugin (Test() en
// vitest-cucumber-plugin.js) no espera promesas devueltas por los pasos, así
// que una llamada async dentro de un When no se esperaría correctamente. Por
// eso la acción real (crear la categoría duplicada) ocurre en un Before hook
// con tag propio — los Before/After sí se esperan (ver generate/tests.js,
// que los ejecuta con `await` dentro de beforeAll/afterAll) — y los pasos
// Given/When/Then solo hacen aserciones síncronas sobre el resultado ya
// resuelto.

interface CategoriaState {
  name?: string;
  error?: Error;
  rows?: CategoryRow[];
}

Before<CategoriaState, CategoriaState>(
  { name: 'crea la categoría y reintenta el nombre duplicado', tags: '@categoriaNombreUnico' },
  async () => {
    const name = `test-dup-${randomUUID().slice(0, 8)}`;
    await createCategory({ name, supercategory: 'object', color: '#ef4444' });

    let error: Error | undefined;
    try {
      await createCategory({ name, supercategory: 'object', color: '#3b82f6' });
    } catch (err) {
      error = err as Error;
    }

    const rows = await db.select().from(categories).where(eq(categories.name, name));
    return { name, error, rows };
  },
);

After<CategoriaState, CategoriaState>(
  { name: 'limpia la categoría de prueba', tags: '@categoriaNombreUnico' },
  async (state) => {
    if (state.name) await db.delete(categories).where(eq(categories.name, state.name));
    return state;
  },
);

Given<CategoriaState>('una categoría {string} ya registrada en el sistema', () => {
  // La categoría de prueba ya se creó en el Before hook (ver nota arriba).
});

When<CategoriaState>('intento crear otra categoría también llamada {string}', () => {
  // El intento real ya ocurrió en el Before hook de este escenario.
});

Then<CategoriaState>(
  'el sistema debe rechazar la operación con un error claro de nombre duplicado',
  (state) => {
    expect(state.error).toBeInstanceOf(Error);
    expect(state.error?.message).toMatch(/ya existe/i);
  },
);

Then<CategoriaState>('la categoría original no debe modificarse', (state) => {
  expect(state.rows).toHaveLength(1);
  expect(state.rows?.[0]?.color).toBe('#ef4444');
});
