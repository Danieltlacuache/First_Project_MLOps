import { pingDb } from '@/db';
import { env } from '@/lib/env';
import { listCategories } from '@/lib/services/annotations';
import { listImages } from '@/lib/services/images';
import { pingStorage } from '@/lib/storage';
import ImageUploader from '@/components/ImageUploader';
import AnnotationCanvas from '@/components/AnnotationCanvas';

export const dynamic = 'force-dynamic';

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function Home() {
  const [dbOk, storageOk, imgs, cats] = await Promise.all([
    safe(pingDb),
    safe(pingStorage),
    safe(listImages),
    safe(listCategories),
  ]);

  const isProd = env.NODE_ENV === 'production';

  const Status = ({ up }: { up: boolean }) => (
    <span className={`pill ${up ? 'up' : 'down'}`}>{up ? 'UP' : 'DOWN'}</span>
  );

  return (
    <main>
      <div className={`env-banner ${isProd ? 'prod' : 'dev'}`}>
        {isProd ? 'PRODUCCIÓN · :3100' : 'DESARROLLO · :3000'}
      </div>

      <h1>Annotation Portal</h1>
      <p className="sub">Entorno listo. A partir de aquí solo falta frontend y backend.</p>

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
          <strong>{imgs?.length ?? '—'}</strong>
        </div>
        <div className="row">
          <span>Categorías</span>
          <strong>{cats?.length ?? '—'}</strong>
        </div>
      </div>

      {/* Nueva sección del Uploader */}
      <div className="card">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Subir Nueva Imagen</p>
        <ImageUploader />
      </div>

      {/* Área de prueba del Lienzo */}
      <div className="card">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Prueba del Lienzo Interactivo</p>
        <AnnotationCanvas imageUrl="/api/images/1/raw" />
      </div>

      <div className="card">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Endpoints ya disponibles</p>
        <div className="row">
          <code>GET /api/health</code>
          <span style={{ color: 'var(--muted)' }}>diagnóstico</span>
        </div>
        <div className="row">
          <code>GET|POST /api/images</code>
          <span style={{ color: 'var(--muted)' }}>listar / subir</span>
        </div>
        <div className="row">
          <code>GET /api/images/:id/raw</code>
          <span style={{ color: 'var(--muted)' }}>archivo</span>
        </div>
        <div className="row">
          <code>GET|POST /api/categories</code>
          <span style={{ color: 'var(--muted)' }}>categorías</span>
        </div>
        <div className="row">
          <code>GET|POST /api/annotations</code>
          <span style={{ color: 'var(--muted)' }}>bounding boxes</span>
        </div>
        <div className="row">
          <code>GET /api/export/coco</code>
          <span style={{ color: 'var(--muted)' }}>dataset COCO</span>
        </div>
      </div>

      <div className="card">
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>Consolas</p>
        <div className="row">
          <a href="http://localhost:9001">MinIO Console :9001</a>
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