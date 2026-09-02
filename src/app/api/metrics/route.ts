import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/services/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (_error) {
    return NextResponse.json({ error: 'Error calculando métricas de la BD' }, { status: 500 });
  }
}
