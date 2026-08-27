import { NextResponse } from 'next/server';
import { exportCoco } from '@/lib/services/dataset';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dataset = await exportCoco();
  return NextResponse.json(dataset, {
    headers: {
      'Content-Disposition': 'attachment; filename="annotations_coco.json"',
    },
  });
}
