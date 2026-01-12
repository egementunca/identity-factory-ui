'use client';

import { useMemo } from 'react';

interface HeatmapViewerProps {
  data: number[][];
  xSize: number;
  ySize: number;
  xLabel?: string;
  yLabel?: string;
  title?: string;
}

export default function HeatmapViewer({
  data,
  xSize,
  ySize,
  xLabel = 'Obfuscated Gate Index',
  yLabel = 'Original Gate Index',
  title = 'Circuit Heatmap',
}: HeatmapViewerProps) {
  // Compute color for each cell
  const getColor = (value: number): string => {
    // Normalize value to 0-1 (assuming input is 0-1 already)
    const v = Math.min(1, Math.max(0, value));

    // Blue (low) -> Yellow (mid) -> Red (high)
    if (v < 0.5) {
      const t = v * 2;
      const r = Math.round(t * 255);
      const g = Math.round(t * 255);
      const b = Math.round(255 - t * 128);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (v - 0.5) * 2;
      const r = 255;
      const g = Math.round(255 - t * 200);
      const b = Math.round(127 - t * 127);
      return `rgb(${r},${g},${b})`;
    }
  };

  // Downsample if too large
  const displayData = useMemo(() => {
    if (xSize <= 100 && ySize <= 100) {
      return data;
    }

    // Downsample to max 100x100
    const targetX = Math.min(100, xSize);
    const targetY = Math.min(100, ySize);

    const scaleX = xSize / targetX;
    const scaleY = ySize / targetY;

    const result: number[][] = [];
    for (let y = 0; y < targetY; y++) {
      const row: number[] = [];
      for (let x = 0; x < targetX; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        row.push(data[srcY]?.[srcX] ?? 0);
      }
      result.push(row);
    }
    return result;
  }, [data, xSize, ySize]);

  const cellSize = Math.max(
    2,
    Math.min(6, 600 / Math.max(displayData.length, displayData[0]?.length || 1))
  );

  return (
    <div className="heatmap-container">
      <h4>{title}</h4>
      <div className="heatmap-wrapper">
        <div className="y-axis-label">{yLabel}</div>
        <div className="heatmap-content">
          <svg
            width={displayData[0]?.length * cellSize || 100}
            height={displayData.length * cellSize || 100}
            viewBox={`0 0 ${displayData[0]?.length * cellSize || 100} ${displayData.length * cellSize || 100}`}
          >
            {displayData.map((row, y) =>
              row.map((value, x) => (
                <rect
                  key={`${x}-${y}`}
                  x={x * cellSize}
                  y={y * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={getColor(value)}
                />
              ))
            )}
          </svg>
          <div className="x-axis-label">{xLabel}</div>
        </div>
      </div>

      <div className="legend">
        <span className="legend-low">Low</span>
        <div className="legend-gradient" />
        <span className="legend-high">High</span>
      </div>

      <style jsx>{`
        .heatmap-container {
          background: rgba(20, 20, 30, 0.8);
          border-radius: 12px;
          padding: 16px;
        }

        h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin-bottom: 12px;
          text-align: center;
        }

        .heatmap-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .y-axis-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
        }

        .heatmap-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .heatmap-content svg {
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 4px;
        }

        .x-axis-label {
          margin-top: 8px;
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
        }

        .legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }

        .legend-low,
        .legend-high {
          font-size: 0.65rem;
          color: rgba(200, 200, 220, 0.5);
        }

        .legend-gradient {
          width: 100px;
          height: 10px;
          background: linear-gradient(
            90deg,
            rgb(0, 0, 255),
            rgb(255, 255, 127),
            rgb(255, 55, 0)
          );
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
