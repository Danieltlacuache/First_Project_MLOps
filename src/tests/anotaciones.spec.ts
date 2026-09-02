import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Simulación de tu esquema actual antes de programar la solución
const boundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  categoryId: z.number().optional(), // Esto hará que la prueba falle a propósito
});

describe('Feature: Validación de Bounding Boxes', () => {
  it('Then el sistema debe rechazar la operación con un error de validación', () => {
    const invalidBox = { x: 15, y: 20, width: 100, height: 150 }; 
    const result = boundingBoxSchema.safeParse(invalidBox);
    
    // Esperamos que falle (success === false), pero como es opcional, pasará y el test tronará.
    expect(result.success).toBe(false); 
  });
});