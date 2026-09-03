'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchAndFilter() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
          <label className="text-sm font-semibold mb-1">Búsqueda Lógica (Clases)</label>
          <input type="text" placeholder="ej. car AND person" value={query} onChange={(e) => setQuery(e.target.value)} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border p-2 rounded">
            <option value="all">Todos</option>
            <option value="annotated">Anotados</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Rango de Fechas</label>
          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border p-2 rounded w-full" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border p-2 rounded w-full" />
          </div>
        </div>
        <button onClick={handleApplyFilters} className="bg-blue-600 text-white font-semibold p-2 rounded hover:bg-blue-700 transition">
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}