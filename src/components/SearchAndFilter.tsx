'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchAndFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') ?? '');

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query); // "car AND person"
    if (status !== 'all') params.set('status', status);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-6 text-black">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="flex flex-col">
          <label htmlFor="search-query" className="text-sm font-semibold mb-1">
            Búsqueda Lógica (Clases)
          </label>
          <input
            id="search-query"
            type="text"
            placeholder="ej. cat OR dog"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="search-status" className="text-sm font-semibold mb-1">
            Estado
          </label>
          <select
            id="search-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">Todos</option>
            <option value="annotated">Anotados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="search-date-from" className="text-sm font-semibold mb-1">
            Rango de Fechas
          </label>
          <div className="flex gap-2">
            <input
              id="search-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border p-2 rounded w-full"
            />
            <input
              aria-label="Fecha hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          className="bg-blue-600 text-white font-semibold p-2 rounded hover:bg-blue-700 transition"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
