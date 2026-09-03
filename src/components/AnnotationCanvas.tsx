'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Lienzo de anotación.
 *
 * REGLA CENTRAL: las cajas se guardan SIEMPRE en píxeles de la imagen original,
 * nunca en píxeles de pantalla. Antes el componente forzaba la imagen a 500 px y
 * guardaba las coordenadas en ese sistema: una foto de 4000 px producía cajas
 * 8 veces más pequeñas de lo real. En pantalla se veían bien, pero el dataset
 * COCO salía corrupto.
 *
 * La conversión pantalla → imagen la hace el propio SVG con getScreenCTM(), que
 * ya incluye el tamaño renderizado, el scroll, el zoom del navegador y cualquier
 * transform CSS de un ancestro. Por eso el resultado es correcto a cualquier
 * tamaño y el diseño puede ser responsivo sin recalcular nada a mano.
 */

export type CanvasBox = {
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
  /** Categoría activa del panel lateral; pinta las cajas nuevas. */
  category: { id: number; name: string; color: string } | null;
};

const MIN_SIZE = 2; // en píxeles de imagen

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

  // Cambiar de imagen invalida las cajas: pertenecen a otro sistema de coordenadas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe dispararse al cambiar de imagen; los setters de useState son estables
  useEffect(() => {
    setBoxes([]);
    setDraft(null);
    setSelected(null);
    setNatural(null);
    setFailed(false);
  }, [imageId]);

  const readNaturalSize = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0) return;
    setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplayWidth(img.clientWidth);
    setFailed(false);
  }, []);

  /**
   * Si la imagen ya estaba en caché, el evento `load` se dispara ANTES de que
   * React hidrate y el onLoad no llega nunca: el lienzo se quedaba en
   * "Cargando imagen…" para siempre al recargar la página. Al montar leemos
   * las dimensiones directamente del elemento.
   */
  useEffect(() => {
    readNaturalSize();
  }, [readNaturalSize]);

  // El ancho renderizado solo se usa para INFORMAR la escala al usuario.
  // Ningún cálculo de coordenadas depende de él.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setDisplayWidth(entry.contentRect.width);
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  /**
   * Pantalla → imagen. getScreenCTM() devuelve la matriz que va de coordenadas
   * del viewBox a coordenadas de pantalla; la invertimos para hacer el camino
   * contrario. Es la pieza que elimina el desfase.
   */
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

    // Endereza el arrastre invertido (de derecha a izquierda o de abajo a arriba).
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

    // La caja final se calcula desde el evento, NO desde el estado `draft`:
    // en un arrastre muy rápido React puede agrupar el move y el up en el mismo
    // lote, y el manejador vería un `draft` todavía sin confirmar.
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
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? 'sin categoría',
        color: category?.color ?? '#94a3b8',
      },
    ]);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (typing) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
        e.preventDefault();
        setBoxes((prev) => prev.filter((_, i) => i !== selected));
        setSelected(null);
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const scale = natural && displayWidth > 0 ? displayWidth / natural.width : 1;

  return (
    <div className="canvas-block">
      <div className="canvas-frame">
        {/* biome-ignore lint/performance/noImgElement: el archivo llega por stream desde MinIO, no por el optimizador de Next */}
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
            aria-label="Área de dibujo de bounding boxes"
          >
            <title>Bounding boxes</title>

            {boxes.map((box, i) => (
              <rect
                // biome-ignore lint/suspicious/noArrayIndexKey: las cajas no tienen id hasta que se persistan
                key={i}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                className={`canvas-box ${selected === i ? 'selected' : ''}`}
                style={{ color: box.color }}
                // El trazo no se escala con el viewBox: 2 px reales a cualquier tamaño.
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

        {failed && (
          <p className="canvas-error">
            No se pudo cargar la imagen #{imageId}. ¿Sigue existiendo en MinIO?
          </p>
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
            <span className="canvas-hint">
              Arrastra para dibujar · clic para seleccionar · <kbd>Supr</kbd> borra
            </span>
          </>
        ) : (
          <span>Cargando imagen…</span>
        )}
      </div>

      {boxes.length > 0 && (
        <table className="coord-table">
          <caption>
            Coordenadas en píxeles de la imagen original — son las que exige COCO, independientes
            del tamaño al que se muestre.
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Categoría</th>
              <th scope="col">x</th>
              <th scope="col">y</th>
              <th scope="col">ancho</th>
              <th scope="col">alto</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((box, i) => (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: las cajas no tienen id hasta que se persistan
                key={i}
                className={selected === i ? 'on' : ''}
              >
                <td>{i + 1}</td>
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
