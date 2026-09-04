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
| Ninguna caja sin categoría (bbox debe tener `categoryId`) | SPEC-01 | `src/tests/features/anotacion-categoria.feature` | `src/tests/anotaciones.spec.ts` + `src/tests/features/bbox-categoria.steps.ts` | ✅ Cubierta y `.feature` conectado (ver nota abajo) |
| Nombre de categoría único | SPEC-05 | `src/tests/features/categoria-nombre-unico.feature` | `src/tests/categoria-duplicada.test.ts` + `src/tests/features/categoria-duplicada.steps.ts` | ✅ Cubierta y `.feature` conectado |
| Update/delete sobre anotación inexistente se rechaza | SPEC-06 | `src/tests/features/anotacion-recurso-inexistente.feature` | `src/tests/anotacion-inexistente.test.ts` + `src/tests/features/anotacion-inexistente.steps.ts` | ✅ Cubierta y `.feature` conectado |
| Export COCO: bbox absoluto, área, ids, iscrowd | SPEC-07 | `src/tests/features/exportacion-coco.feature` | `src/tests/coco.test.ts` + `src/tests/features/export-coco.steps.ts` | ✅ Cubierta y `.feature` conectado |
| `area = width × height` | SPEC-02 | `src/tests/features/area-bbox.feature` | `src/tests/coco.test.ts` → `areaOf` + `src/tests/features/area-bbox.steps.ts` | ✅ Cubierta y `.feature` conectado |
| Un bbox con ancho o alto ≤ 0 se rechaza | SPEC-03 | `src/tests/features/bbox-dimensiones-invalidas.feature` | `src/tests/coco.test.ts` + `src/tests/features/bbox-dimensiones-invalidas.steps.ts` | ✅ Cubierta y `.feature` conectado |

**Actualización — las 6 reglas documentadas tienen SPEC + `.feature` + prueba conectados.**
`vitest.config.ts` incluye `src/tests/features/*.feature` en `test.include` y apunta
`test.cucumber.stepDefinitions.include` a `src/tests/features/*.steps.ts`, así que cada escenario se
ejecuta como prueba real (`npx vitest run`: 11 archivos, 47 pruebas). Verificado también con
mutación real en `areaOf` (cambiar `*` por `+`): `area-bbox.feature` lo detecta y falla. Dos notas
técnicas de por qué quedó así:

- **Los step definitions viven en la misma carpeta que los `.feature`, no en un subdirectorio.**
  `vitest-cucumber-plugin@0.6.2` arma el import del step file con `path.relative()` y lo mete tal
  cual en la línea `import './${relativePath}';` del código que genera. En Windows, `path.relative`
  devuelve `\` como separador, y ese `\` cae dentro de un string literal de JS sin escapar — si el
  siguiente carácter no es un escape válido (p. ej. `\e` de `\export-coco...`), JS simplemente se
  come la barra y el import queda roto (`Cannot find module './step_definitionsexport-coco...'`).
  Es un bug real del plugin en Windows, no algo de este proyecto. Poner los `.steps.ts` en la misma
  carpeta que el `.feature` hace que la ruta relativa sea solo el nombre de archivo (sin separador),
  así que el bug nunca se dispara. También se tuvieron que quitar los guiones de los tags
  (`@categoria-nombre-unico` → `@categoriaNombreUnico`): el mini-parser de expresiones de tags del
  plugin no acepta `-` en el nombre de un tag.
- **Los pasos `Given`/`When`/`Then` de este plugin no esperan promesas.** El bridge interno
  (`Test()` en `vitest-cucumber-plugin.ts`) llama al step definition de forma síncrona y no hace
  `await` del resultado — si el paso es `async`, el siguiente step recibe una Promise pendiente en
  vez del estado resuelto. Por eso, en los dos escenarios que sí tocan la BD
  (`categoria-nombre-unico.feature`, `anotacion-recurso-inexistente.feature`), la llamada real
  (`createCategory`/`updateAnnotation`/`deleteAnnotation`) ocurre dentro de un hook `Before` con tag
  propio por escenario — los hooks `Before`/`After` sí se esperan correctamente (van dentro de un
  `beforeAll`/`afterAll` con `await` real) — y los pasos Given/When/Then solo hacen aserciones
  síncronas sobre el resultado ya resuelto. Se verificó con una prueba de mutación real: desactivar
  temporalmente el guard clause de `createCategory` hizo fallar
  `categoria-nombre-unico.feature` (y se restauró después).

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
