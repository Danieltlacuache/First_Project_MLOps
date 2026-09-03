'use client';

import { useState } from 'react';
import AnnotationCanvas from '@/components/AnnotationCanvas';
import CategoryPanel, { type Category } from '@/components/CategoryPanel';

/**
 * Une el panel de clases con el lienzo: ambos necesitan compartir cuál es la
 * categoría activa, y eso obliga a un componente de cliente en común.
 */
export default function AnnotationWorkspace({
  images,
}: {
  images: { id: number; fileName: string }[];
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [imageId, setImageId] = useState<number | null>(images[0]?.id ?? null);

  if (images.length === 0) {
    return (
      <p className="faint">
        No hay imágenes en la base de datos. Sube una arriba y recarga la página para empezar a
        dibujar.
      </p>
    );
  }

  return (
    <div className="workspace">
      <div className="workspace-main">
        <label className="field" htmlFor="image-picker">
          Imagen
        </label>
        <select
          id="image-picker"
          value={imageId ?? ''}
          onChange={(e) => setImageId(Number(e.target.value))}
        >
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              #{image.id} · {image.fileName}
            </option>
          ))}
        </select>

        {imageId !== null && (
          <AnnotationCanvas
            // Cambiar de imagen debe reconstruir el lienzo desde cero.
            key={imageId}
            imageId={imageId}
            category={category}
          />
        )}
      </div>

      <CategoryPanel selected={category} onSelect={setCategory} />
    </div>
  );
}
