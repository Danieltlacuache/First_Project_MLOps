import { db } from '@/db';
import { annotations, categories, images } from '@/db/schema';
import { buildCocoDataset, type CocoDataset } from '@/domain/coco';

/** STEP 4 del diagrama: exporta todo como dataset COCO de entrenamiento. */
export async function exportCoco(): Promise<CocoDataset> {
  const [imgRows, catRows, annRows] = await Promise.all([
    db.select().from(images),
    db.select().from(categories),
    db.select().from(annotations),
  ]);
  return buildCocoDataset(imgRows, catRows, annRows);
}
