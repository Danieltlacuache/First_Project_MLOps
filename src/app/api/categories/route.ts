import { NextResponse } from 'next/server';
import { createCategorySchema } from '@/domain/coco';
import { createCategory, listCategories } from '@/lib/services/annotations';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await listCategories());
}

export async function POST(request: Request) {
  const parsed = createCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }
  return NextResponse.json(await createCategory(parsed.data), { status: 201 });
}
