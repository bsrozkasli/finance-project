import type { DrawingObject, DrawingType } from '../types/drawing.types';

interface DrawingOverlayProps {
  width: number;
  height: number;
  drawings: DrawingObject[];
  currentDrawing: DrawingObject | null;
  activeTool: DrawingType;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
}

export const DrawingOverlay = ({
  width,
  height,
  drawings,
  currentDrawing,
  activeTool,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: DrawingOverlayProps) => {
  const allDrawings = currentDrawing ? [...drawings, currentDrawing] : drawings;

  return (
    <svg
      width={width}
      height={height}
      className="absolute top-0 left-0 z-10"
      style={{ pointerEvents: activeTool === 'cursor' ? 'none' : 'auto' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {allDrawings.map((drawing) => {
        const p1 = drawing.points[0];
        const p2 = drawing.points[1];

        if (!p1 || p1.x === undefined || p1.y === undefined) return null;

        const color = drawing.style.color || '#3b82f6';
        const strokeWidth = drawing.style.width || 2;

        if (drawing.type === 'trendline' && p2 && p2.x !== undefined && p2.y !== undefined) {
          return (
            <line
              key={drawing.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        }

        if (drawing.type === 'horizontal-line') {
          return (
            <line
              key={drawing.id}
              x1={0}
              y1={p1.y}
              x2={width}
              y2={p1.y}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        }

        if (drawing.type === 'vertical-line') {
          return (
            <line
              key={drawing.id}
              x1={p1.x}
              y1={0}
              x2={p1.x}
              y2={height}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        }

        if (drawing.type === 'rectangle' && p2 && p2.x !== undefined && p2.y !== undefined) {
          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const w = Math.abs(p2.x - p1.x);
          const h = Math.abs(p2.y - p1.y);
          return (
            <rect
              key={drawing.id}
              x={x}
              y={y}
              width={w}
              height={h}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={`${color}33`} // 20% opacity
            />
          );
        }

        if (drawing.type === 'text') {
          return (
            <text
              key={drawing.id}
              x={p1.x}
              y={p1.y}
              fill={color}
              fontSize={14}
              fontFamily="sans-serif"
            >
              {drawing.style.text || 'Text'}
            </text>
          );
        }
        
        if (drawing.type === 'arrow' && p2 && p2.x !== undefined && p2.y !== undefined) {
          return (
            <g key={drawing.id}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={strokeWidth}
              />
              <circle cx={p2.x} cy={p2.y} r={4} fill={color} />
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
};
