# Guía — cómo dejar evidencia real de Red-Green-Refactor en los commits

Tu profesor dijo explícitamente: *"la evidencia del ciclo TDD en los commits... no se puede
recuperar al final."* Ahora mismo el repo no tiene ni un solo commit, así que el ciclo completo
(rojo → verde → refactor) todavía se puede documentar de verdad si lo hacen en este orden real,
no simulado.

## Antes que nada

Corre `git init` en la raíz del proyecto y confirma que `main` es la rama por defecto:

```bash
git init
git branch -M main
```

## El ciclo para los 2 huecos reales de `TRAZABILIDAD.md`

Para cada uno de los dos archivos de prueba en `tests-sugeridos/`:

### 1. Commit "Red" — el test existe y falla

```bash
# copia el .feature y el .test.ts correspondientes a src/tests/
npm test    # confirma que el nuevo test FALLA (los demás siguen en verde)

git add src/tests/features/categoria-nombre-unico.feature src/tests/categoria-duplicada.test.ts
git commit -m "test: agrega spec de unicidad de nombre de categoría (red)"
```

No hagas commit de ningún cambio en `src/lib/services/annotations.ts` todavía — el punto es
que el commit quede con el test en rojo, visible en el historial.

### 2. Commit "Green" — el mínimo cambio para pasar

Implementa solo lo necesario para que el test pase (por ejemplo, en `createCategory`, un
`SELECT` previo por nombre que lance un error claro si ya existe; en `updateAnnotation` /
`deleteAnnotation`, revisar `affectedRows` del resultado y lanzar si es 0).

```bash
npm test    # confirma que ahora SÍ pasa, y que nada más se rompió

git add src/lib/services/annotations.ts
git commit -m "feat: rechaza nombres de categoría duplicados con error claro (green)"
```

### 3. Commit "Refactor" (opcional pero suma puntos)

Si al implementar los dos fixes notas código repetido (por ejemplo, la verificación de
"¿existe esta fila?" se repite entre `updateAnnotation` y `deleteAnnotation`), extrae un
helper y vuelve a correr `npm test` para confirmar que el comportamiento no cambió.

```bash
npm test    # sigue en verde, sin cambiar comportamiento

git add src/lib/services/annotations.ts
git commit -m "refactor: extrae assertAnnotationExists compartido (refactor)"
```

## Para el resto del proyecto (código que ya existe)

El código que ya está escrito (canvas, dashboard, export COCO, etc.) no se puede "hacer TDD"
retroactivamente sin fingir — y fingir un historial es peor que no tenerlo, porque un
revisor que compare fechas de commit contra el contenido lo nota. Para esa parte, lo más
honesto y que igual suma en la sección 9 (Git y flujo, 6 pts) es:

- Comitear por capas lógicas y en orden real de dependencia, no todo de un jalón:
  1. `chore: entorno base (docker-compose, .env.example, drizzle config)`
  2. `feat: schema Drizzle + migración inicial`
  3. `feat: dominio COCO (zod schemas) + tests de dominio`
  4. `feat: servicios de imágenes/anotaciones/categorías`
  5. `feat: rutas API`
  6. `feat: componentes de UI (canvas, dashboard, búsqueda)`
  7. Los 3 commits del ciclo TDD real de arriba
- Mensajes descriptivos, no `"cambios"` o `"fix"` a secas.
- Si son varios en el equipo, que cada quien haga su propio commit de la parte que le tocó
  (aunque sea reorganizando quién aplica qué fragmento) — la rúbrica pide *"participación
  visible de todo el equipo"*.

## Checklist final antes de entregar

- [ ] `git branch` muestra `main` como rama activa y por defecto
- [ ] `git log --oneline` tiene múltiplos commits pequeños, no uno solo
- [ ] Al menos un par de commits muestran el patrón red → green (idealmente los de arriba)
- [ ] `git status` limpio, sin `.env` ni `node_modules` versionados (ya lo cubre el `.gitignore`
      actual)
- [ ] `npm run check` (typecheck + lint + test) pasa en la última copia de `main`
