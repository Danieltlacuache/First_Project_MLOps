import AnnotationWorkspace from '@/components/AnnotationWorkspace';
import ExportButton from '@/components/ExportButton';
import ImageUploader from '@/components/ImageUploader';
import MetricsDashboard from '@/components/MetricsDashboard';
import SearchAndFilter from '@/components/SearchAndFilter';
import SearchResults from '@/components/SearchResults';
import { pingDb } from '@/db';
import { env } from '@/lib/env';
import { listCategories } from '@/lib/services/annotations';
import { listImages } from '@/lib/services/images';
import { pingStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function Home({
  searchParams,
}: {
  // 1. Tipamos searchParams como una Promesa
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 2. Desenvolvemos la promesa antes de usarla
  const resolvedSearchParams = await searchParams;

  const [dbOk, storageOk, imgs, cats] = await Promise.all([
    safe(pingDb),
    safe(pingStorage),
    // 3. Pasamos el objeto ya desenvuelto a la consulta de base de datos
    safe(() => listImages(resolvedSearchParams)),
    safe(listCategories),
  ]);

  const Status = ({ up }: { up: boolean }) => (
    <span className={`pill ${up ? 'up' : 'down'}`}>{up ? 'UP' : 'DOWN'}</span>
  );

  return (
    <main>
      <h1>Annotation Portal</h1>
      <p className="sub">
        Sube imágenes, dibuja bounding boxes por clase y exporta el dataset en formato COCO.
      </p>

      <div className="card">
        <div className="row">
          <span>Base de datos</span>
          <span>
            <code>{env.DB_NAME}</code> <Status up={dbOk === true} />
          </span>
        </div>
        <div className="row">
          <span>Bucket de MinIO</span>
          <span>
            <code>{env.MINIO_BUCKET}</code> <Status up={storageOk === true} />
          </span>
        </div>
        <div className="row">
          <span>Imágenes registradas</span>
          <strong>{imgs?.total ?? '—'}</strong>
        </div>
        <div className="row">
          <span>Categorías</span>
          <strong>{cats?.length ?? '—'}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Métricas del dataset</h2>
        <MetricsDashboard />
      </div>

      <div className="card">
        <h2>Subir nueva imagen</h2>
        <ImageUploader />
      </div>

      <div className="card">
        <h2>Lienzo de anotación</h2>
        <SearchAndFilter />
        {imgs?.searchActive ? (
          <SearchResults results={imgs.data} page={imgs.page} totalPages={imgs.totalPages} />
        ) : (
          <AnnotationWorkspace
            images={(imgs?.data ?? []).map((i) => ({ id: i.id, fileName: i.fileName }))}
          />
        )}
      </div>

      <div className="card">
        <h2>Exportar dataset COCO</h2>
        <ExportButton />
      </div>

      <div className="card">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Consolas</p>
        <div className="row">
          <a href={env.MINIO_CONSOLE_URL}>MinIO Console</a>
          <span style={{ color: 'var(--muted)' }}>archivos</span>
        </div>
        <div className="row">
          <span>
            <code>npm run db:studio</code> → Drizzle Studio
          </span>
          <span style={{ color: 'var(--muted)' }}>base de datos</span>
        </div>
      </div>
    </main>
  );
}
