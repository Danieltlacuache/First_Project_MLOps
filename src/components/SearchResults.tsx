'use client';

import { useState } from 'react';
import AnnotationCanvas from '@/components/AnnotationCanvas';
import CategoryPanel, { type Category } from '@/components/CategoryPanel';
import Pagination from '@/components/Pagination';

type ResultClass = { name: string; color: string };
type Result = { id: number; fileName: string; classes: ResultClass[] };

/**
 * Vista de RESULTADOS DE BÚSQUEDA (paginados). Muestra cada imagen con su
 * título y sus clases anotadas. Al hacer clic en una, se abre el lienzo debajo
 * para anotarla. Reutiliza el mismo canvas y panel de clases del flujo normal.
 */
export default function SearchResults({
  results,
  page,
  totalPages,
}: {
  results: Result[];
  page: number;
  totalPages: number;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div>
      {results.length === 0 ? (
        <p className="faint">Ninguna imagen coincide con la búsqueda.</p>
      ) : (
        <ul className="results-list">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`result-item ${selectedId === r.id ? 'on' : ''}`}
                onClick={() => setSelectedId(r.id)}
              >
                <span className="result-title">
                  #{r.id} · {r.fileName}
                </span>
                <span className="result-classes">
                  {r.classes.length === 0 ? (
                    <span className="faint">sin anotaciones</span>
                  ) : (
                    r.classes.map((c) => (
                      <span key={c.name} className="chip">
                        <span className="cat-dot" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    ))
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} />

      {selectedId !== null && (
        <div className="workspace" style={{ marginTop: '1.25rem' }}>
          <div className="workspace-main">
            <AnnotationCanvas key={selectedId} imageId={selectedId} category={category} />
          </div>
          <CategoryPanel selected={category} onSelect={setCategory} />
        </div>
      )}
    </div>
  );
}
