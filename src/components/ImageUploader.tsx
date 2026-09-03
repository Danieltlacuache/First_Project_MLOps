'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Selección, validación y envío de una imagen a /api/images.
 * Reescrito con el CSS del proyecto: antes usaba clases de Tailwind, que no
 * está instalado, así que no se aplicaba ningún estilo.
 */

const ALLOWED = ['image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_MB = MAX_BYTES / (1024 * 1024);

type Status = { kind: 'ok' | 'error'; message: string } | null;

export default function ImageUploader({ onUploaded }: { onUploaded?: () => void }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setStatus(null);

    if (!selected) return;
    if (!ALLOWED.includes(selected.type)) {
      setStatus({ kind: 'error', message: 'Solo se admiten archivos JPG o PNG.' });
      return;
    }
    if (selected.size > MAX_BYTES) {
      const mb = (selected.size / (1024 * 1024)).toFixed(1);
      setStatus({ kind: 'error', message: `El archivo pesa ${mb} MB; el máximo es ${MAX_MB} MB.` });
      return;
    }

    // Liberamos la URL anterior para no fugar memoria entre selecciones.
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/images', { method: 'POST', body: formData });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `El servidor respondió ${response.status}`);
      }

      setStatus({ kind: 'ok', message: 'Imagen guardada en MinIO y MariaDB.' });
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      // Refresca los datos del servidor (respetando los filtros/queries activos)
      // para que la nueva imagen aparezca en el Lienzo de anotación si coincide.
      router.refresh();
      onUploaded?.();
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="uploader">
      <label className="field" htmlFor="file-input">
        Archivo (JPG o PNG)
      </label>
      <input
        id="file-input"
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileChange}
      />

      {preview && (
        <div className="uploader-preview">
          {/* biome-ignore lint/performance/noImgElement: es un blob local, no pasa por el optimizador */}
          <img src={preview} alt="Vista previa" />
          <span className="faint">{file?.name}</span>
        </div>
      )}

      {status && (
        <p className={`panel-${status.kind === 'ok' ? 'ok' : 'error'}`}>{status.message}</p>
      )}

      <button
        type="button"
        className="primary"
        onClick={handleUpload}
        disabled={!file || isUploading}
      >
        {isUploading ? 'Subiendo…' : 'Subir imagen'}
      </button>
    </div>
  );
}
