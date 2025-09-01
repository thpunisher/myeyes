import React from 'react';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';
import type { DetectionBox } from '@/types/detection';

export function BoundingBoxes({
  boxes,
  width,
  height
}: {
  boxes: DetectionBox[];
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="absolute inset-0">
      {boxes.map((b) => {
        const x = b.bbox[0] * width;
        const y = b.bbox[1] * height;
        const w = b.bbox[2] * width;
        const h = b.bbox[3] * height;
        return (
          <React.Fragment key={b.id}>
            <Rect x={x} y={y} width={w} height={h} stroke="#22d3ee" strokeWidth={2} fill="transparent" />
            <SvgText x={x + 4} y={y + 16} fill="#22d3ee" fontSize={14}>
              {`${b.class} ${Math.round(b.score * 100)}%`}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

