export type Tool =
  | 'select'
  | 'sticky'
  | 'text'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'emoji'
  | 'sticker'
  | 'image'
  | 'chart-bar'
  | 'chart-line'
  | 'chart-pie';

export type BoardObject = {
  id: string;
  type: Tool | 'connector';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  points?: number[];
  text?: string;
  fill?: string;
  stroke?: string;
  fontSize?: number;
  emoji?: string;
  src?: string;
  data?: number[];
  labels?: string[];
  fromId?: string;
  toId?: string;
};

export type BoardState = { objects: BoardObject[] };
