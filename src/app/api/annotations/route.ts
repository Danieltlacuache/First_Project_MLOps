import { NextResponse } from 'next/server';
import { createAnnotationSchema } from '@/domain/coco';
import { createAnnotation, listAnnotationsByImage } from '@/lib/services/annotations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const imageId = Number(new URL(request.url).searchParams.get('imageId'));
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return NextResponse.json({ error: 'Parámetro imageId requerido' }, { status: 400 });
  }
  return NextResponse.json(await listAnnotationsByImage(imageId));
}

export async function POST(request: Request) {
  const parsed = createAnnotationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }
  const id = await createAnnotation(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
