// Corresponde a: src/tests/features/anotacion-recurso-inexistente.feature
//
// Prueba de integración contra la base de datos de DESARROLLO (igual que
// categoria-duplicada.test.ts). Levanta la infra antes de correr `npm test`:
//   npm run infra:up
//   npm run db:push
//
// HOY ESTA PRUEBA FALLA (rojo): updateAnnotation() y deleteAnnotation() no
// revisan cuántas filas afectó el UPDATE/DELETE, así que sobre un id que no
// existe no lanzan nada — el route handler responde 200 igual. Agrega la
// verificación (por ejemplo leyendo `ResultSetHeader.affectedRows` que
// devuelve mysql2, o hacienda un SELECT previo) hasta que la prueba pase.

import '../lib/load-env';
import { describe, expect, it } from 'vitest';
import { deleteAnnotation, updateAnnotation } from '../lib/services/annotations';

const NON_EXISTENT_ID = 999_999;

describe('Feature: Integridad al modificar anotaciones inexistentes', () => {
  it('When intento actualizar la anotación 999999, Then debe rechazar indicando que no existe', async () => {
    await expect(updateAnnotation(NON_EXISTENT_ID, { categoryId: 1 })).rejects.toThrow(
      /no existe/i,
    );
  });

  it('When intento borrar la anotación 999999, Then debe rechazar indicando que no existe', async () => {
    await expect(deleteAnnotation(NON_EXISTENT_ID)).rejects.toThrow(/no existe/i);
  });
});
