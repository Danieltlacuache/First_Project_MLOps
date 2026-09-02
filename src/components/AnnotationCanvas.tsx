'use client';

import { useState, useRef, MouseEvent, useEffect, SyntheticEvent } from 'react';

type BBox = { x: number; y: number; width: number; height: number };

export default function AnnotationCanvas({ imageUrl }: { imageUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [drawingBox, setDrawingBox] = useState<BBox | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Dimensiones explícitas para evitar el colapso del SVG
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  const handleImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const targetWidth = 500;
    const targetHeight = (img.naturalHeight / img.naturalWidth) * targetWidth;
    setDimensions({ width: targetWidth, height: targetHeight });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIndex !== null) {
        setBoxes(boxes.filter((_, i) => i !== selectedIndex));
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boxes, selectedIndex]);

  const handleMouseDown = (e: MouseEvent) => {
    if (!containerRef.current) return;
    setSelectedIndex(null);
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });
    setDrawingBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!startPos || !drawingBox || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setDrawingBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (drawingBox && drawingBox.width > 5 && drawingBox.height > 5) {
      setBoxes([...boxes, drawingBox]);
    }
    setDrawingBox(null);
    setStartPos(null);
  };

  return (
    <div className="flex justify-center w-full my-4">
      <div 
        ref={containerRef}
        className="relative border-2 border-blue-500 cursor-crosshair select-none overflow-hidden bg-black"
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          src={imageUrl} 
          alt="Anotación" 
          onLoad={handleImageLoad}
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px`, display: 'block' }}
          draggable={false}
        />
        
        {/* SVG con dimensiones explícitas para contener perfectamente los rectángulos */}
        <svg 
          className="absolute top-0 left-0 pointer-events-none"
          width={dimensions.width}
          height={dimensions.height}
        >
          {boxes.map((box, i) => (
            <rect 
              key={i} 
              x={box.x} y={box.y} width={box.width} height={box.height} 
              fill={selectedIndex === i ? "rgba(234, 179, 8, 0.4)" : "rgba(239, 68, 68, 0.3)"} 
              stroke={selectedIndex === i ? "#eab308" : "#ef4444"} 
              strokeWidth="2" 
              className="pointer-events-auto cursor-pointer transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation(); 
                setSelectedIndex(i);
              }}
            />
          ))}
          {drawingBox && (
            <rect 
              x={drawingBox.x} y={drawingBox.y} width={drawingBox.width} height={drawingBox.height} 
              fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4" 
            />
          )}
        </svg>
      </div>
    </div>
  );
}