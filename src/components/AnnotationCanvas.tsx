'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type CanvasBox = {
  id?: number; // Propiedad añadida para rastrear el ID real de MariaDB
  tempId: string; // Clave estable para React, independiente del id de MariaDB
  x: number;
  y: number;
  width: number;
  height: number;
  categoryId: number | null;
  categoryName: string;
  color: string;
};

type Props = {
  imageId: number;
  category: { id: number; name: string; color: string } | null;
};

const MIN_SIZE = 2;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function AnnotationCanvas({ imageId, category }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [boxes, setBoxes] = useState<CanvasBox[]>([]);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. CARGA AUTOMÁTICA DESDE LA BASE DE DATOS (GET)
  useEffect(() => {
    setBoxes([]);
    setDraft(null);
    setSelected(null);
    setNatural(null);
    setFailed(false);

    fetch(`/api/annotations?imageId=${imageId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setBoxes(
            data.map((a) => ({
              id: a.id,
              tempId: crypto.randomUUID(),
              x: a.bbox?.x ?? a.x,
              y: a.bbox?.y ?? a.y,
              width: a.bbox?.width ?? a.width,
              height: a.bbox?.height ?? a.height,
              categoryId: a.categoryId,
              categoryName: a.category?.name || `Clase ${a.categoryId}`,
              color: a.category?.color || '#94a3b8',
            })),
          );
        }
      })
      .catch(console.error);
  }, [imageId]);

  const readNaturalSize = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplayWidth(img.clientWidth);
    setFailed(false);
  }, []);

  useEffect(() => {
    readNaturalSize();
  }, [readNaturalSize]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDisplayWidth(entry.contentRect.width);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const toImagePoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm || !natural) return null;

      const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return {
        x: clamp(point.x, 0, natural.width),
        y: clamp(point.y, 0, natural.height),
      };
    },
    [natural],
  );

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const point = toImagePoint(e.clientX, e.clientY);
    if (!point) return;

    setSelected(null);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const start = startRef.current;
    if (!start) return;
    const point = toImagePoint(e.clientX, e.clientY);
    if (!point) return;

    setDraft({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const start = startRef.current;
    startRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraft(null);
    if (!start) return;

    const point = toImagePoint(e.clientX, e.clientY);
    if (!point) return;

    const round = (n: number) => Math.round(n * 100) / 100;
    const box = {
      x: round(Math.min(start.x, point.x)),
      y: round(Math.min(start.y, point.y)),
      width: round(Math.abs(point.x - start.x)),
      height: round(Math.abs(point.y - start.y)),
    };
    if (box.width < MIN_SIZE || box.height < MIN_SIZE) return;

    setBoxes((prev) => [
      ...prev,
      {
        ...box,
        tempId: crypto.randomUUID(),
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? 'sin categoría',
        color: category?.color ?? '#94a3b8',
      },
    ]);
  }

  // 2. BORRADO REAL EN LA BASE DE DATOS (DELETE)
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (typing) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
        e.preventDefault();
        const boxToDelete = boxes[selected];

        if (boxToDelete?.id) {
          // Dispara la eliminación física en MariaDB
          await fetch(`/api/annotations/${boxToDelete.id}`, { method: 'DELETE' });
        }

        setBoxes((prev) => prev.filter((_, i) => i !== selected));
        setSelected(null);
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, boxes]);

  // 3. GUARDADO INDIVIDUAL CON CAPTURA DE ID (POST)
  const handleSaveAnnotations = async () => {
    const newBoxes = boxes.filter((b) => !b.id && b.categoryId !== null);

    if (newBoxes.length === 0) {
      alert('Asigna una clase a las nuevas cajas antes de guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const requests = newBoxes.map(async (box) => {
        const payload = {
          imageId: imageId,
          categoryId: box.categoryId,
          bbox: { x: box.x, y: box.y, width: box.width, height: box.height },
        };

        const res = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          return { ...box, id: data.id }; // Retornamos la caja inyectando el ID generado
        }
        throw new Error('Fallo al guardar');
      });

      const savedBoxes = await Promise.all(requests);

      // Actualizamos el estado para que las cajas dibujadas ahora tengan su ID
      setBoxes((prev) =>
        prev.map((pBox) => {
          const saved = savedBoxes.find((s) => s.x === pBox.x && s.y === pBox.y);
          return saved ? saved : pBox;
        }),
      );

      alert('¡Anotaciones guardadas exitosamente en MariaDB!');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Algunas anotaciones fallaron. Revisa la consola.');
    } finally {
      setIsSaving(false);
    }
  };

  const scale = natural && displayWidth > 0 ? displayWidth / natural.width : 1;

  return (
    <div className="canvas-block">
      <div className="canvas-frame">
        {/* biome-ignore lint/performance/noImgElement: archivo crudo desde MinIO */}
        <img
          src={`/api/images/${imageId}/raw`}
          alt="Imagen a anotar"
          className="canvas-img"
          ref={imgRef}
          onLoad={readNaturalSize}
          onError={() => setFailed(true)}
          draggable={false}
        />

        {natural && !failed && (
          <svg
            ref={svgRef}
            className="canvas-svg"
            viewBox={`0 0 ${natural.width} ${natural.height}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <title>Lienzo de anotación: dibuja bounding boxes sobre la imagen</title>
            {boxes.map((box, i) => (
              <rect
                key={box.tempId}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                className={`canvas-box ${selected === i ? 'selected' : ''}`}
                style={{ color: box.color }}
                vectorEffect="non-scaling-stroke"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelected(i);
                }}
              />
            ))}

            {draft && (
              <rect
                x={draft.x}
                y={draft.y}
                width={draft.width}
                height={draft.height}
                className="canvas-draft"
                style={{ color: category?.color ?? '#7dd3fc' }}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      <div className="canvas-status">
        {natural ? (
          <>
            <span>
              Original{' '}
              <strong>
                {natural.width}×{natural.height}
              </strong>{' '}
              px
            </span>
            <span>
              Mostrada al <strong>{Math.round(scale * 100)}%</strong>
            </span>
            <span>
              {boxes.length} {boxes.length === 1 ? 'caja' : 'cajas'}
            </span>
          </>
        ) : (
          <span>Cargando imagen…</span>
        )}
      </div>

      {/* BOTÓN DE GUARDADO DINÁMICO */}
      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <button
          type="button"
          className="primary"
          onClick={handleSaveAnnotations}
          disabled={!boxes.some((b) => !b.id) || isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar Anotaciones Nuevas'}
        </button>
      </div>

      {boxes.length > 0 && (
        <table className="coord-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Categoría</th>
              <th>x</th>
              <th>y</th>
              <th>ancho</th>
              <th>alto</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((box, i) => (
              <tr key={box.tempId} className={selected === i ? 'on' : ''}>
                <td>
                  {box.id ? (
                    <span style={{ color: 'var(--success)' }}>✔ Guardado</span>
                  ) : (
                    <span style={{ color: 'var(--warning)' }}>Pendiente</span>
                  )}
                </td>
                <td>
                  <span className="cat-dot" style={{ background: box.color }} />
                  {box.categoryName}
                </td>
                <td>{box.x}</td>
                <td>{box.y}</td>
                <td>{box.width}</td>
                <td>{box.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
