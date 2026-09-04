# Punto 8 — SPECs, Gherkin y TDD (10 pts)

Este documento es la matriz de trazabilidad **regla de negocio → SPEC → `.feature` → prueba**
que pide la rúbrica. Va acompañado de:

- `features/*.feature` — 3 archivos Gherkin nuevos, listos para copiar a `src/tests/features/`.
- `tests-sugeridos/*.ts` — 2 pruebas nuevas para 2 huecos **reales** que encontré en el código
  (no simulados: hoy el sistema los deja pasar sin avisar). Son el material ideal para que el
  ciclo Red → Green → Refactor quede documentado en commits de verdad, porque hoy están en rojo.
- `GUIA-COMMITS-TDD.md` — cómo convertir esto en commits que el profesor pueda leer como evidencia.

**No toqué el repositorio.** Todo esto son archivos sueltos: cópialos tú mismo a las rutas
indicadas, corre las pruebas, y haz los commits en el orden real Red → Green → Refactor.

---

## 1. Qué ya existe (referencia)

| Regla de negocio | SPEC | `.feature` | Prueba | Estado |
|---|---|---|---|---|
| Ninguna caja sin categoría (bbox debe tener `categoryId`) | SPEC-01 | `src/tests/features/anotacion-categoria.feature` | `src/tests/anotaciones.spec.ts` | ✅ Cubierta, **pero el `.feature` no está conectado** — ver nota abajo |
| `area = width × height` | SPEC-02 | *(sin `.feature`)* | `src/tests/coco.test.ts` → `areaOf` | ⚠️ Cubierta por test, sin SPEC/`.feature` formal |
| Un bbox con ancho o alto ≤ 0 se rechaza | SPEC-03 | *(sin `.feature`)* | `src/tests/coco.test.ts` | ⚠️ Cubierta por test, sin SPEC/`.feature` formal |
| El dataset exportado cumple el esquema COCO (`images`, `categories`, `annotations`) | SPEC-04 | *(sin `.feature`)* | `src/tests/coco.test.ts` | ⚠️ Cubierta por test, sin SPEC/`.feature` formal |

**Nota importante sobre `anotacion-categoria.feature`:** tienen `vitest-cucumber-plugin` instalado
y configurado en `vitest.config.ts`, pero **ningún archivo carga ese `.feature` con el plugin**
(no hay glue code / step definitions). Hoy el `.feature` y el `.spec.ts` narran lo mismo a mano,
sin ejecución automática uno del otro — un revisor que abra el repo no puede verificar que el
Gherkin realmente "manda" en la prueba. Si quieren trazabilidad automática de verdad, hay que
usar `defineFeature`/`loadFeature` del plugin para que el `.spec.ts` cargue el `.feature`
directamente. Si prefieren no tocar esa pieza por tiempo, al menos dejen la trazabilidad
**documentada** (como en esta tabla) para que el profesor vea la relación aunque no sea 100%
automática.

---

## 2. Huecos que encontré y que puedes cerrar con TDD real

Estos tres eran features que la rúbrica pide (upload con validación, categorías con clase válida,
export COCO) pero les faltaba SPEC/`.feature` formal aunque la lógica ya funciona. Además,
revisando el código de anotaciones encontré **dos reglas que el sistema rompe hoy mismo**:

### Hueco real #1 — nombres de categoría duplicados

`src/lib/services/annotations.ts:15-18`:

```ts
export async function createCategory(input: CreateCategoryInput) {
  await db.insert(categories).values(input);   // sin verificar si el nombre ya existe
  return listCategories();
}
```

La tabla `categories` tiene `uniqueIndex('categories_name_uq')`, así que insertar un nombre
repetido **sí falla**, pero falla como un error crudo de MySQL (`ER_DUP_ENTRY`) que se propaga
sin capturar hasta el route handler (`src/app/api/categories/route.ts`), y el usuario ve un 500
genérico en vez de un mensaje claro. Ninguna prueba cubre esto hoy.

### Hueco real #2 — actualizar/borrar una anotación que no existe responde "éxito"

`src/lib/services/annotations.ts:65-91`:

```ts
export async function deleteAnnotation(id: number) {
  await db.delete(annotations).where(eq(annotations.id, id));   // si id no existe, no pasa nada... y no avisa
}

export async function updateAnnotation(id: number, data: UpdateAnnotationInput) {
  // ...
  await db.update(annotations).set(updateData).where(eq(annotations.id, id));  // idem
}
```

Si mandas `DELETE /api/annotations/99999` o `PATCH /api/annotations/99999`, MySQL simplemente
afecta 0 filas — no lanza error — y el route handler responde `{ "success": true }` con status
200 igual. Es un bug silencioso: el cliente cree que borró/actualizó algo que nunca existió.

**Por qué estos dos son oro para tu evidencia de TDD:** no son casos inventados para la tarea —
son comportamiento real y verificable hoy. Si escribes la prueba primero, la vas a ver fallar
de verdad (rojo genuino), no fallar "a propósito".

---

## 3. Cómo aplicar esto (sin que yo toque el repo)

1. Copia los 3 archivos de `features/` a `src/tests/features/`.
2. Copia los 2 archivos de `tests-sugeridos/` a `src/tests/`.
3. Corre `npm test` — **deben fallar** `categoria-duplicada.test.ts` y `anotacion-inexistente.test.ts`
   (ese es tu commit "red"). Los otros tests existentes siguen en verde.
4. Haz el commit del punto 3 (test en rojo) — mensaje sugerido en `GUIA-COMMITS-TDD.md`.
5. Implementa el fix mínimo en `src/lib/services/annotations.ts` (agrega el guard clause que
   describe cada test) y en los route handlers si hace falta devolver 404/409.
6. Corre `npm test` de nuevo — ahora deben pasar (commit "green").
7. Si quieres, un tercer commit de "refactor" (por ejemplo, extraer un helper `assertExists`
   compartido entre `updateAnnotation` y `deleteAnnotation`) sin cambiar el comportamiento —
   corre los tests una vez más para confirmar que siguen en verde.

Con eso tienes, con fechas y commits reales, exactamente lo que pide el punto 8.2 (ciclo
Red-Green-Refactor) — y de paso arreglas dos bugs reales del portal.
