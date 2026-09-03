'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Panel lateral de clases: selección visual de la categoría activa y alta de
 * categorías nuevas con su color hexadecimal. El color elegido es el que el
 * lienzo usa para pintar las cajas de esa clase.
 */

export type Category = {
  id: number;
  name: string;
  supercategory: string;
  color: string;
};

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function CategoryPanel({
  selected,
  onSelect,
}: {
  selected: Category | null;
  onSelect: (category: Category) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0] ?? '#ef4444');

  const load = useCallback(async (): Promise<Category[]> => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
      const data = (await res.json()) as Category[];
      setCategories(data);
      setError(null);
      return data;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Al montar: cargamos y activamos la primera clase para poder dibujar ya.
  // onSelect es el setter de useState del padre, así que es estable.
  useEffect(() => {
    void load().then((data) => {
      const first = data[0];
      if (first) onSelect(first);
    });
  }, [load, onSelect]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !HEX.test(color)) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, supercategory: 'object', color }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(
          typeof body?.error === 'string' ? body.error : 'No se pudo crear la categoría',
        );
      }
      const updated = (await res.json()) as Category[];
      setCategories(updated);
      const created = updated.find((c) => c.name === trimmed);
      if (created) onSelect(created);
      setName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <aside className="cat-panel">
      <h3 className="panel-title">Clases</h3>

      {error && <p className="panel-error">{error}</p>}

      {loading ? (
        <p className="faint">Cargando…</p>
      ) : categories.length === 0 ? (
        <p className="faint">Todavía no hay categorías. Crea la primera abajo.</p>
      ) : (
        <ul className="cat-list">
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={`cat-btn ${selected?.id === category.id ? 'on' : ''}`}
                onClick={() => onSelect(category)}
                aria-pressed={selected?.id === category.id}
              >
                <span className="cat-dot" style={{ background: category.color }} />
                <span className="cat-name">{category.name}</span>
                <code className="cat-hex">{category.color}</code>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="cat-form" onSubmit={create}>
        <h3 className="panel-title">Nueva clase</h3>

        <label className="field" htmlFor="cat-name">
          Nombre
        </label>
        <input
          id="cat-name"
          type="text"
          value={name}
          maxLength={128}
          placeholder="p. ej. traffic_light"
          onChange={(e) => setName(e.target.value)}
        />

        <label className="field" htmlFor="cat-color">
          Color hexadecimal
        </label>
        <div className="color-row">
          <input
            id="cat-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="text"
            value={color}
            maxLength={7}
            aria-label="Código hexadecimal"
            className={HEX.test(color) ? '' : 'invalid'}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <div className="swatch-row">
          {PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`swatch-btn ${color.toLowerCase() === hex ? 'on' : ''}`}
              style={{ background: hex }}
              aria-label={`Usar ${hex}`}
              onClick={() => setColor(hex)}
            />
          ))}
        </div>

        <button
          type="submit"
          className="primary"
          disabled={adding || name.trim() === '' || !HEX.test(color)}
        >
          {adding ? 'Creando…' : 'Añadir clase'}
        </button>
      </form>
    </aside>
  );
}
