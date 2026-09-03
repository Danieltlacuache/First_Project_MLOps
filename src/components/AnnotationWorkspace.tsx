'use client';

import { useEffect, useState } from 'react';
import AnnotationCanvas from '@/components/AnnotationCanvas';
import CategoryPanel, { type Category } from '@/components/CategoryPanel';

export default function AnnotationWorkspace({
  images,
}: {
  images: { id: number; fileName: string }[];
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [imageId, setImageId] = useState<number | null>(images[0]?.id ?? null);

  useEffect(() => {
    if (images.length === 0) {
      setImageId(null);
    } else if (!images.some((img) => img.id === imageId)) {
      setImageId(images[0]?.id ?? null);
    }
  }, [images, imageId]);

  if (images.length === 0) {
    return (
      <p className="faint">
        No hay imágenes que coincidan con la búsqueda o la base de datos está vacía.
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
            key={imageId}
            imageId={imageId}
            category={category}
            onSaveAndNext={() => {
              const idx = images.findIndex((img) => img.id === imageId);
              const next = images[idx + 1];
              if (next) setImageId(next.id);
            }}
          />
        )}
      </div>

      <CategoryPanel selected={category} onSelect={setCategory} />
    </div>
  );
}
