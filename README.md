# Annotation Portal — entorno del proyecto

Monolito TypeScript para subir imágenes, dibujar *bounding boxes* con categoría y exportar
el resultado como **dataset COCO**. Este repo trae el **ambiente ya armado**: solo falta
que programes frontend y backend.

**Docker levanta solo la infraestructura. La app corre en tu máquina con npm.**

---

## 1. Qué hay

| Dónde corre | Pieza | Puerto |
|---|---|---|
| 🐳 Docker | **MariaDB 11.4** — dos bases: `annotation_portal_dev` y `annotation_portal_prod` | `3306` |
| 🐳 Docker | **MinIO** — dos buckets: `images-dev` e `images-prod` | `9000` API · `9001` consola |
| 💻 npm local | **App Next.js** — desarrollo | `3000` |
| 💻 npm local | **App Next.js** — producción | `3100` |

Es **la misma app y el mismo código**. Lo único que cambia entre `:3000` y `:3100` es a
qué base de datos y a qué bucket apunta.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Drizzle ORM ·
Zod 4 · Biome 2 · Vitest 4.

> El diagrama decía Next.js 15; usé **16** porque es el estable actual y el App Router es
> idéntico. Si tu materia exige 15, cambia `"next": "^15"` en `package.json` y `npm i`.

---

## 2. Arrancar

```bash
cp .env.example .env     # 1. credenciales de la infraestructura
npm install              # 2. dependencias
npm run setup            # 3. docker up + tablas en dev y prod + categorías base
npm run dev              # 4. http://localhost:3000
```

`npm run setup` es un atajo de:

```bash
npm run infra:up      # docker compose up -d  (MariaDB + MinIO + creación de buckets)
npm run db:push       # crea las tablas en annotation_portal_dev
npm run db:push:prod  # crea las tablas en annotation_portal_prod
npm run db:seed       # categorías base en dev
```

Para levantar **producción** (misma app, otra base de datos):

```bash
npm run prod          # = next build && next start -p 3100
```

Puedes tener **las dos corriendo a la vez** en dos terminales: `npm run dev` en `:3000`
y `npm run prod` en `:3100`. La página muestra un banner azul (DESARROLLO) o amarillo
(PRODUCCIÓN) para que nunca confundas cuál estás viendo.

| URL | Qué es |
|---|---|
| <http://localhost:3000> | app en desarrollo (hot reload) |
| <http://localhost:3100> | app en producción (build optimizado) |
| <http://localhost:3000/api/health> | JSON con entorno, BD, bucket y estado de cada servicio |
| <http://localhost:9001> | consola de MinIO (`minioadmin` / `minioadmin123`) |
| `localhost:3306` | MariaDB para DBeaver / TablePlus (`app` / `app_password_dev`) |

---

## 3. Cómo se separan los entornos

Next.js carga los archivos `.env` solo; no hay magia extra.

```
.env                 credenciales e infraestructura   (COMPARTIDO · en .gitignore)
.env.development     DB_NAME=annotation_portal_dev    · MINIO_BUCKET=images-dev
.env.production      DB_NAME=annotation_portal_prod   · MINIO_BUCKET=images-prod
```

- `next dev` carga `.env` + `.env.development`
- `next build` y `next start` cargan `.env` + `.env.production`

Los archivos `.env.development` y `.env.production` **no tienen secretos**, así que se
suben a git. `.env` sí los tiene y está ignorado — por eso existe `.env.example`.

**Para apuntar producción a un servidor real** (no al Docker local): sobrescribe
`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `MINIO_ENDPOINT` en `.env.production`, o pásalos
como variables de entorno del sistema (ganan sobre los archivos).

---

## 4. Comandos

```bash
# Infraestructura
npm run infra:up       # levanta MariaDB + MinIO
npm run infra:down     # los apaga (los datos se conservan)
npm run infra:reset    # los BORRA y vuelve a crearlos desde cero
npm run infra:logs     # logs de los contenedores

# App
npm run dev            # desarrollo  :3000
npm run prod           # build + producción :3100
npm run build          # solo compilar
npm start              # solo servir el build en :3100

# Calidad (corre esto antes de cada commit)
npm run check          # typecheck + lint + tests
npm test               # Vitest
npm run test:watch     # Vitest en watch (TDD)
npm run lint:fix       # Biome arregla formato e imports

# Base de datos — cada comando tiene su gemelo :prod
npm run db:push        # sincroniza schema.ts → BD (rápido, para desarrollo)
npm run db:push:prod
npm run db:generate    # genera el .sql de migración (para git / producción)
npm run db:migrate     # aplica las migraciones generadas
npm run db:migrate:prod
npm run db:seed        # categorías base
npm run db:seed:prod
npm run db:studio      # GUI de la BD → http://localhost:4983
npm run db:studio:prod
```

Flujo recomendado con la BD: `db:push` mientras experimentas en dev; cuando el schema se
estabilice, `db:generate` para dejar el `.sql` en git y `db:migrate:prod` para aplicarlo.

---

## 5. Estructura (monolito de 3 capas)

```
├── docker-compose.yml       SOLO MariaDB + MinIO
├── docker/mariadb/init/     SQL que crea las dos bases de datos
├── .env.example → .env      credenciales (no va a git)
├── .env.development         config de dev  :3000
├── .env.production          config de prod :3100
├── drizzle/                 migraciones SQL generadas
└── src/
    ├── app/                 ── CAPA UI ──────────────────────────────
    │   ├── page.tsx           dashboard de estado (reemplázalo por tu portal)
    │   ├── layout.tsx · globals.css
    │   └── api/               route handlers = tu backend
    │       ├── health/                GET   diagnóstico
    │       ├── images/                GET   lista · POST sube imagen
    │       ├── images/[id]/raw/       GET   sirve el archivo desde MinIO
    │       ├── categories/            GET   lista · POST crea
    │       ├── annotations/           GET ?imageId= · POST crea bbox
    │       └── export/coco/           GET   dataset COCO (.json)
    ├── lib/                 ── CAPA LÓGICA ─────────────────────────
    │   ├── env.ts             .env validado con Zod 4 (truena al arrancar si falta algo)
    │   ├── load-env.ts        carga .env para drizzle-kit y el seeder
    │   ├── storage.ts         cliente MinIO: subir, leer, URLs prefirmadas
    │   └── services/          reglas de negocio (images, annotations, dataset)
    ├── db/                  ── CAPA DATOS ──────────────────────────
    │   ├── schema.ts          tablas Drizzle: images, categories, annotations
    │   ├── index.ts           pool mysql2 + instancia de Drizzle
    │   └── seed.ts            seeder
    ├── domain/coco.ts         esquemas Zod + conversión a formato COCO
    └── tests/                 Vitest (los del dominio no necesitan BD)
```

---

## 6. Modelo de datos (alineado a COCO)

```
images                      categories                annotations
──────                      ──────────                ───────────
id                          id                        id
file_name                   name (único)              image_id     → images.id
object_key  (llave MinIO)   supercategory             category_id  → categories.id
width, height               color (#hex, para la UI)  bbox_x, bbox_y, bbox_width, bbox_height
mime_type, size_bytes                                 area, is_crowd
created_at                  created_at                created_at, updated_at
```

`GET /api/export/coco` junta las tres tablas y devuelve el JSON COCO estándar
(`info`, `licenses`, `images`, `categories`, `annotations` con `bbox: [x, y, w, h]`).

**Separación clave:** MariaDB guarda **metadatos y anotaciones**; MinIO guarda **los bytes
de las imágenes**. La tabla `images` los une por `object_key`.

---

## 7. Probar que todo jala (sin escribir UI)

```bash
# 1. salud — te dice el entorno, la BD y el bucket que está usando
curl -s localhost:3000/api/health | jq

# 2. subir una imagen
curl -s -F "file=@/ruta/a/foto.jpg" localhost:3000/api/images | jq

# 3. ver categorías
curl -s localhost:3000/api/categories | jq

# 4. crear un bounding box
curl -s -X POST localhost:3000/api/annotations \
  -H 'Content-Type: application/json' \
  -d '{"imageId":1,"categoryId":1,"bbox":{"x":10,"y":20,"width":100,"height":50}}' | jq

# 5. exportar el dataset
curl -s localhost:3000/api/export/coco | jq
```

---

## 8. Lo que te toca programar

- **Frontend:** el canvas de bounding boxes (`<canvas>` o SVG sobre `/api/images/:id/raw`),
  selector de categoría, galería de imágenes, pantalla de exportación.
- **Backend:** editar/borrar anotaciones, paginación, splits train/val/test,
  validación de traslapes, y lo que pida tu rúbrica.
- **TDD:** Vitest ya está configurado. Los tests de `src/domain/` corren sin BD.

## 9. Git

```bash
git init && git add . && git commit -m "chore: entorno base (Next.js + MariaDB + MinIO)"
git branch -M main
```

`.env` está ignorado — sube solo `.env.example`. Cambia las contraseñas antes de
cualquier despliegue real.
