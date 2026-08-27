import { NextResponse } from 'next/server';
import { listImages, uploadImage } from '@/lib/services/images';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await listImages());
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el campo "file"' }, { status: 400 });
  }

  try {
    const row = await uploadImage(file);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
