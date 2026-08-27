/**
 * Seeder — categorías base para poder anotar desde el primer minuto.
 *   npm run db:seed        → base de datos de desarrollo
 *   npm run db:seed:prod   → base de datos de producción
 *
 * Nota: load-env debe ejecutarse ANTES de tocar la BD o el storage, por eso
 * el resto de módulos se importan dinámicamente dentro de main().
 */
import { APP_ENV } from '../lib/load-env';

const BASE_CATEGORIES = [
  { name: 'person', supercategory: 'human', color: '#ef4444' },
  { name: 'car', supercategory: 'vehicle', color: '#3b82f6' },
  { name: 'bicycle', supercategory: 'vehicle', color: '#22c55e' },
  { name: 'dog', supercategory: 'animal', color: '#eab308' },
  { name: 'cat', supercategory: 'animal', color: '#a855f7' },
];

async function main() {
  const { db, pool } = await import('./index');
  const { categories } = await import('./schema');
  const { ensureBucket } = await import('../lib/storage');

  console.log(`Sembrando entorno ${APP_ENV} → BD "${process.env.DB_NAME}"`);

  await ensureBucket();
  console.log('✓ bucket de MinIO verificado');

  const existing = await db.select().from(categories);
  if (existing.length > 0) {
    console.log(`✓ ya hay ${existing.length} categorías, no se re-siembra`);
  } else {
    await db.insert(categories).values(BASE_CATEGORIES);
    console.log(`✓ ${BASE_CATEGORIES.length} categorías insertadas`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('✗ seed falló:', err);
  process.exit(1);
});
