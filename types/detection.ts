export type DetectionBox = {
  id: string;
  class: string;
  score: number;
  bbox: [number, number, number, number];
  distance?: number;
  position?: 'left' | 'center' | 'right';
};

