import { useState, useCallback } from 'react';
import type { DrawingObject, DrawingType, Point } from '../types/drawing.types';

export const useChartDrawings = () => {
  const [activeTool, setActiveTool] = useState<DrawingType>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingObject | null>(null);

  const clearAllDrawings = useCallback(() => {
    setDrawings([]);
    setCurrentDrawing(null);
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const startDrawing = useCallback((point: Point, symbol: string, range: string) => {
    if (activeTool === 'cursor') return;

    const newId = crypto.randomUUID();
    const newDrawing: DrawingObject = {
      id: newId,
      type: activeTool,
      symbol,
      range,
      points: [point],
      style: {
        color: '#3b82f6', // blue-500 default
        width: 2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentDrawing(newDrawing);
  }, [activeTool]);

  const updateCurrentDrawing = useCallback((point: Point) => {
    if (!currentDrawing) return;
    
    // Most basic tools need 2 points (start and current/end)
    const newPoints = [currentDrawing.points[0], point];
    
    setCurrentDrawing({
      ...currentDrawing,
      points: newPoints,
      updatedAt: new Date().toISOString(),
    });
  }, [currentDrawing]);

  const completeDrawing = useCallback(() => {
    if (!currentDrawing) return;
    setDrawings((prev) => [...prev, currentDrawing]);
    setCurrentDrawing(null);
    setActiveTool('cursor'); // Reset to cursor after drawing
  }, [currentDrawing]);

  // Future server-provided drawings can be appended here.
  const applyAIDrawings = useCallback((drawingsFromAI: DrawingObject[]) => {
    setDrawings((prev) => [...prev, ...drawingsFromAI]);
  }, []);

  return {
    activeTool,
    setActiveTool,
    drawings,
    currentDrawing,
    startDrawing,
    updateCurrentDrawing,
    completeDrawing,
    clearAllDrawings,
    removeDrawing,
    applyAIDrawings,
  };
};



