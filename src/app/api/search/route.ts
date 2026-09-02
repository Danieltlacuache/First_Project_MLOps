import { NextResponse } from 'next/server';
import { searchImages } from '@/lib/services/search';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  const dateFromStr = searchParams.get('dateFrom');
  const dateToStr = searchParams.get('dateTo');

  if (dateFromStr && dateToStr) {
    dateFrom = new Date(dateFromStr);
    dateTo = new Date(dateToStr);
  }

  try {
    const result = await searchImages({ query, dateFrom, dateTo, page, limit });
    return NextResponse.json(result);
  } catch (_error) {
    return NextResponse.json({ error: 'Error procesando la búsqueda SQL' }, { status: 500 });
  }
}
