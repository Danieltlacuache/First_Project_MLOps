'use client';

import { useState } from 'react';

/**
 * Descarga directa del dataset COCO. El route handler ya envía
 * Content-Disposition: attachment, así que basta un enlace con `download`:
 * el navegador guarda el archivo sin pasar por JavaScript ni por memoria.
 */
export default function ExportButton() {
  const [summary, setSummary] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const res = await fetch('/api/export/coco');
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
      const data = (await res.json()) as {
        images: unknown[];
        categories: unknown[];
        annotations: unknown[];
      };
      setSummary(
        `${data.images.length} imágenes · ${data.categories.length} categorías · ${data.annotations.length} anotaciones`,
      );
    } catch (err) {
      setSummary(`No se pudo consultar: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="export-block">
      <a className="btn primary" href="/api/export/coco" download="annotations_coco.json">
        ⭳ Descargar annotations_coco.json
      </a>
      <button type="button" onClick={() => void check()} disabled={checking}>
        {checking ? 'Consultando…' : 'Ver qué contiene'}
      </button>
      {summary && <span className="faint">{summary}</span>}
    </div>
  );
}
