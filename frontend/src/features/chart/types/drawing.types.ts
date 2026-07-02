export type DrawingType =
  | 'cursor'
  | 'trendline'
  | 'horizontal-line'
  | 'vertical-line'
  | 'rectangle'
  | 'fibonacci'
  | 'arrow'
  | 'text'
  | 'brush'
  | 'measure';

export interface Point {
  time?: number | string; // logical time
  price?: number; // logical price
  x?: number; // screen coordinate
  y?: number; // screen coordinate
}

export interface DrawingStyle {
  color?: string;
  width?: number;
  text?: string;
  fill?: string;
}

export interface DrawingObject {
  id: string;
  type: DrawingType;
  symbol: string;
  range: string;
  points: Point[];
  style: DrawingStyle;
  createdAt: string;
  updatedAt: string;
}
