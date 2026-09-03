'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Controles de paginación de los RESULTADOS DE BÚSQUEDA. Igual que
 * SearchAndFilter, este componente NO busca nada: solo cambia la URL.
 *   - Anterior/Siguiente → cambian ?page=N conservando los filtros (q, status…).
 *   - Volver al inicio    → va a "/" limpio, sin ningún parámetro (ni page).
 * Al cambiar la URL, page.tsx se re-ejecuta y pide a listImages() el trozo.
 */
export default function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goTo = (target: number) => {
    // Partimos de los parámetros actuales para no perder los filtros activos.
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(target));
    router.push(`/?${params.toString()}`);
  };

  return (
    <nav className="pagination" aria-label="Paginación de resultados">
      <button type="button" className="ghost" onClick={() => router.push('/')}>
        ← Volver al inicio
      </button>

      {totalPages > 1 && (
        <span className="pagination-controls">
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1}>
            ← Anterior
          </button>
          <span className="faint">
            Página {page} de {totalPages}
          </span>
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>
            Siguiente →
          </button>
        </span>
      )}
    </nav>
  );
}
