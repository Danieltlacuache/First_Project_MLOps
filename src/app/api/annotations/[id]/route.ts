import { NextResponse } from 'next/server';
import { updateAnnotationSchema } from '@/domain/coco';
import { deleteAnnotation, updateAnnotation } from '@/lib/services/annotations';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (Number.isNaN(id) || id <= 0)
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const parsed = updateAnnotationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  await updateAnnotation(id, parsed.data);
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (Number.isNaN(id) || id <= 0)
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  await deleteAnnotation(id);
  return NextResponse.json({ success: true });
}
