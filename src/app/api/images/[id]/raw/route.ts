import { NextResponse } from 'next/server';
import { getImage } from '@/lib/services/images';
import { getImageStream } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Sirve el archivo desde MinIO a través de la app (sin exponer el bucket). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const image = await getImage(Number(id));
  if (!image) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  const stream = await getImageStream(image.objectKey);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
