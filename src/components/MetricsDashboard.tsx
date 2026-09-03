'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Consume GET /api/metrics, cuyos totales y agrupación por clase se calculan
 * con count() y GROUP BY en MariaDB.
 *
 * Los totales son cifras sueltas → tarjetas, no una gráfica de una barra.
 * El reparto por clase sí es comparación de magnitudes → barras horizontales,
 * que toleran nombres largos sin rotar el texto. Cada barra lleva su nombre y
 * su valor escritos, así que la identidad nunca depende solo del color: la
 * gráfica es su propia tabla.
 */

type Metrics = {
  totals: { images: number; annotations: number };
  chartData: { className: string; color: string; count: number }[];
};

const nf = new Intl.NumberFormat('es-MX');

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
      setMetrics((await res.json()) as Metrics);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="faint">Cargando métricas…</p>;

  if (error) {
    return (
      <div className="panel-error">
        No se pudieron cargar las métricas: {error}{' '}
        <button type="button" className="ghost" onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const rows = [...metrics.chartData].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const labelled = rows.filter((r) => r.count > 0).length;

  return (
    <div className="metrics">
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">Imágenes</span>
          <span className="stat-value">{nf.format(metrics.totals.images)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Anotaciones</span>
          <span className="stat-value">{nf.format(metrics.totals.annotations)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Clases con ejemplos</span>
          <span className="stat-value">
            {labelled}
            <span className="stat-of"> / {rows.length}</span>
          </span>
        </div>
      </div>

      <div className="chart">
        <div className="chart-head">
          <h3 className="panel-title">Objetos por clase</h3>
          <button type="button" className="ghost" onClick={() => void load()}>
            Actualizar
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="faint">No hay categorías registradas.</p>
        ) : metrics.totals.annotations === 0 ? (
          <p className="faint">
            Todavía no hay anotaciones guardadas, así que todas las clases están en cero.
          </p>
        ) : (
          <ul className="bars">
            {rows.map((row) => (
              <li key={row.className} className="bar-row">
                <span className="bar-label">
                  <span className="cat-dot" style={{ background: row.color }} />
                  {row.className}
                </span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      background: row.color,
                    }}
                  />
                </span>
                <span className="bar-value">{nf.format(row.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
