'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type CanvasBox = {
  id?: number; // ID real en MariaDB (undefined = caja nueva sin guardar)
  tempId: string; // Clave estable para React
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
  /** Si se provee, aparece el botón "Guardar y siguiente". */
  onSaveAndNext?: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };
type Handle = 'nw' | 'ne' | 'sw' | 'se';
type Interaction =
  | { type: 'draw'; start: { x: number; y: number } }
  | { type: 'move'; index: number; pointerStart: { x: number; y: number }; boxStart: Rect }
  | { type: 'resize'; index: number; handle: Handle; boxStart: Rect };
type Snapshot = { boxes: CanvasBox[]; deletedIds: number[] };

const MIN_SIZE = 2;
const MAX_ZOOM = 6;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const round = (n: number) => Math.round(n * 100) / 100;

const HANDLES: { key: Handle; cursor: string }[] = [
  { key: 'nw', cursor: 'nwse-resize' },
  { key: 'ne', cursor: 'nesw-resize' },
  { key: 'sw', cursor: 'nesw-resize' },
  { key: 'se', cursor: 'nwse-resize' },
];

function resizeRect(start: Rect, handle: Handle, px: number, py: number): Rect {
  let x1 = start.x;
  let y1 = start.y;
  let x2 = start.x + start.width;
  let y2 = start.y + start.height;
  if (handle === 'nw') {
    x1 = px;
    y1 = py;
  } else if (handle === 'ne') {
    x2 = px;
    y1 = py;
  } else if (handle === 'sw') {
    x1 = px;
    y2 = py;
  } else {
    x2 = px;
    y2 = py;
  }
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    x: round(x),
    y: round(y),
    width: Math.max(MIN_SIZE, round(Math.abs(x2 - x1))),
    height: Math.max(MIN_SIZE, round(Math.abs(y2 - y1))),
  };
}

export default function AnnotationCanvas({ imageId, category, onSaveAndNext }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const interactionDirtyRef = useRef(false); // ¿el move/resize actual ya movió algo?

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [boxes, setBoxes] = useState<CanvasBox[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState<Rect | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Guarda el estado actual en la pila de deshacer, ANTES de cada cambio.
  const snapshot = useCallback(() => {
    setHistory((h) => [...h.slice(-49), { boxes, deletedIds }]);
    setDirty(true);
  }, [boxes, deletedIds]);

  const updateBoxAt = (index: number, partial: Partial<CanvasBox>) => {
    setBoxes((prev) => prev.map((b, i) => (i === index ? { ...b, ...partial } : b)));
  };

  // ── Carga desde la BD ────────────────────────────────────────────────
  useEffect(() => {
    setBoxes([]);
    setDeletedIds([]);
    setHistory([]);
    setDirty(false);
    setDraft(null);
    setSelected(null);
    setNatural(null);
    setFailed(false);
    setZoom(1);

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

  // Zoom con Ctrl + rueda (listener nativo para poder preventDefault).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => clamp(round(z * (e.deltaY < 0 ? 1.15 : 0.87)), 1, MAX_ZOOM));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
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

  // ── Puntero sobre el fondo → dibujar caja nueva ──────────────────────
  function onSvgPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const p = toImagePoint(e.clientX, e.clientY);
    if (!p) return;
    setSelected(null);
    interactionRef.current = { type: 'draw', start: p };
    setDraft({ x: p.x, y: p.y, width: 0, height: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSvgPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const it = interactionRef.current;
    if (!it || !natural) return;
    const p = toImagePoint(e.clientX, e.clientY);
    if (!p) return;

    if (it.type === 'draw') {
      setDraft({
        x: Math.min(it.start.x, p.x),
        y: Math.min(it.start.y, p.y),
        width: Math.abs(p.x - it.start.x),
        height: Math.abs(p.y - it.start.y),
      });
      return;
    }

    // El primer desplazamiento real de un move/resize registra el "deshacer".
    if (!interactionDirtyRef.current) {
      snapshot();
      interactionDirtyRef.current = true;
    }

    if (it.type === 'move') {
      const dx = p.x - it.pointerStart.x;
      const dy = p.y - it.pointerStart.y;
      updateBoxAt(it.index, {
        x: round(clamp(it.boxStart.x + dx, 0, natural.width - it.boxStart.width)),
        y: round(clamp(it.boxStart.y + dy, 0, natural.height - it.boxStart.height)),
      });
    } else {
      updateBoxAt(it.index, resizeRect(it.boxStart, it.handle, p.x, p.y));
    }
  }

  function onSvgPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const it = interactionRef.current;
    interactionRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!it) return;

    if (it.type === 'draw') {
      setDraft(null);
      const p = toImagePoint(e.clientX, e.clientY);
      if (!p) return;
      const box = {
        x: round(Math.min(it.start.x, p.x)),
        y: round(Math.min(it.start.y, p.y)),
        width: round(Math.abs(p.x - it.start.x)),
        height: round(Math.abs(p.y - it.start.y)),
      };
      if (box.width < MIN_SIZE || box.height < MIN_SIZE) return;
      snapshot();
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
    // move / resize ya se aplicaron en vivo; el snapshot se tomó al iniciar.
  }

  // ── Empezar a mover una caja existente ───────────────────────────────
  function onBoxPointerDown(e: ReactPointerEvent<SVGRectElement>, index: number) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = toImagePoint(e.clientX, e.clientY);
    if (!p) return;
    setSelected(index);
    const b = boxes[index];
    if (!b) return;
    interactionDirtyRef.current = false;
    interactionRef.current = {
      type: 'move',
      index,
      pointerStart: p,
      boxStart: { x: b.x, y: b.y, width: b.width, height: b.height },
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Empezar a redimensionar por una esquina ──────────────────────────
  function onHandlePointerDown(
    e: ReactPointerEvent<SVGRectElement>,
    index: number,
    handle: Handle,
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(index);
    const b = boxes[index];
    if (!b) return;
    interactionDirtyRef.current = false;
    interactionRef.current = {
      type: 'resize',
      index,
      handle,
      boxStart: { x: b.x, y: b.y, width: b.width, height: b.height },
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  // ── Teclado: borrar, deshacer, deseleccionar ─────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (typing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        if (!prev) return;
        setBoxes(prev.boxes);
        setDeletedIds(prev.deletedIds);
        setHistory(history.slice(0, -1));
        setSelected(null);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
        e.preventDefault();
        snapshot();
        const box = boxes[selected];
        if (box?.id) setDeletedIds((prev) => [...prev, box.id as number]);
        setBoxes((prev) => prev.filter((_, i) => i !== selected));
        setSelected(null);
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, boxes, history, snapshot]);

  // ── Guardar: reconcilia el estado local con la BD ────────────────────
  const save = async (advance: boolean) => {
    if (boxes.some((b) => b.categoryId === null)) {
      alert('Asigna una clase a todas las cajas antes de guardar.');
      return;
    }
    setIsSaving(true);
    try {
      await Promise.all(
        deletedIds.map((id) => fetch(`/api/annotations/${id}`, { method: 'DELETE' })),
      );

      const saved = await Promise.all(
        boxes.map(async (b) => {
          const bbox = { x: b.x, y: b.y, width: b.width, height: b.height };
          if (b.id) {
            await fetch(`/api/annotations/${b.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ categoryId: b.categoryId, bbox }),
            });
            return b;
          }
          const res = await fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageId, categoryId: b.categoryId, bbox }),
          });
          if (!res.ok) throw new Error('Fallo al guardar una caja');
          const data = await res.json();
          return { ...b, id: data.id as number };
        }),
      );

      setBoxes(saved);
      setDeletedIds([]);
      setHistory([]);
      setDirty(false);
      if (advance) onSaveAndNext?.();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Algunas anotaciones fallaron. Revisa la consola.');
    } finally {
      setIsSaving(false);
    }
  };

  const scale = natural && displayWidth > 0 ? displayWidth / natural.width : 1;
  const handleSize = 9 / scale; // ~9 px en pantalla, sin importar el zoom
  const selectedBox = selected !== null ? boxes[selected] : null;

  return (
    <div className="canvas-block">
      <div className="canvas-toolbar">
        <span className="faint">Zoom {Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(round(z * 0.8), 1, MAX_ZOOM))}
          disabled={zoom <= 1}
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(round(z * 1.25), 1, MAX_ZOOM))}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Acercar"
        >
          +
        </button>
        <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1}>
          Reset
        </button>
        <span className="faint canvas-hint">Ctrl + rueda para zoom · Ctrl+Z deshacer</span>
      </div>

      <div className="canvas-scroll" ref={scrollRef}>
        <div className="canvas-frame" style={{ width: `${zoom * 100}%` }}>
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
              onPointerDown={onSvgPointerDown}
              onPointerMove={onSvgPointerMove}
              onPointerUp={onSvgPointerUp}
              onPointerCancel={onSvgPointerUp}
            >
              <title>Lienzo de anotación: dibuja, mueve y redimensiona bounding boxes</title>
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
                  onPointerDown={(e) => onBoxPointerDown(e, i)}
                />
              ))}

              {selectedBox &&
                selected !== null &&
                HANDLES.map(({ key, cursor }) => {
                  const cx =
                    key === 'ne' || key === 'se'
                      ? selectedBox.x + selectedBox.width
                      : selectedBox.x;
                  const cy =
                    key === 'sw' || key === 'se'
                      ? selectedBox.y + selectedBox.height
                      : selectedBox.y;
                  return (
                    <rect
                      key={key}
                      className="canvas-handle"
                      x={cx - handleSize / 2}
                      y={cy - handleSize / 2}
                      width={handleSize}
                      height={handleSize}
                      style={{ cursor }}
                      vectorEffect="non-scaling-stroke"
                      onPointerDown={(e) => onHandlePointerDown(e, selected, key)}
                    />
                  );
                })}

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
              {boxes.length} {boxes.length === 1 ? 'caja' : 'cajas'}
            </span>
            {dirty && (
              <span style={{ color: 'var(--warning, #eab308)' }}>· cambios sin guardar</span>
            )}
          </>
        ) : (
          <span>Cargando imagen…</span>
        )}
      </div>

      <div className="canvas-actions">
        <button type="button" onClick={() => save(false)} disabled={!dirty || isSaving}>
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
        {onSaveAndNext && (
          <button type="button" className="primary" onClick={() => save(true)} disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar y siguiente →'}
          </button>
        )}
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
                    <span style={{ color: 'var(--success, #22c55e)' }}>✔ Guardado</span>
                  ) : (
                    <span style={{ color: 'var(--warning, #eab308)' }}>Nuevo</span>
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
