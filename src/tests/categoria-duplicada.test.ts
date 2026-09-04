// Corresponde a: src/tests/features/categoria-nombre-unico.feature
//
// A diferencia de coco.test.ts (dominio puro, sin BD), esta prueba es de
// integración: llama al servicio real contra la base de datos de DESARROLLO.
// Necesitas tenerla levantada antes de correr `npm test`:
//   npm run infra:up
//   npm run db:push
//
// HOY ESTA PRUEBA FALLA (rojo): createCategory() no valida nombres
// duplicados antes de insertar, así que el error que revienta es el crudo
// de MySQL (ER_DUP_ENTRY), no el mensaje claro que pide el .feature.
// Implementa el guard clause en src/lib/services/annotations.ts hasta que
// pase (verde), y ese es tu commit de "Green".

import { randomUUID } from 'node:crypto';
// 'load-env' debe importarse ANTES que '@/db' para que las variables de
// entorno estén listas (mismo patrón que usa src/db/seed.ts).
import '../lib/load-env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../db';
import { categories } from '../db/schema';
import { createCategory } from '../lib/services/annotations';

describe('Feature: Unicidad del nombre de categoría', () => {
  const name = `test-dup-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    // Given una categoría ya registrada
    await createCategory({ name, supercategory: 'object', color: '#ef4444' });
  });

  afterAll(async () => {
    await db.delete(categories).where(eq(categories.name, name));
  });

  it('When intento crear otra con el mismo nombre, Then debe rechazarse con un error claro', async () => {
    await expect(
      createCategory({ name, supercategory: 'object', color: '#3b82f6' }),
    ).rejects.toThrow(/ya existe/i);
  });

  it('And la categoría original no debe modificarse', async () => {
    const rows = await db.select().from(categories).where(eq(categories.name, name));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.color).toBe('#ef4444');
  });
});
