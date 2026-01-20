'use client';

import { useMemo } from 'react';

type AlignmentMatrix =
  | number[][]
  | {
      dim: [number, number];
      data: number[];
    };

interface AlignmentViewerProps {
  matrix: AlignmentMatrix;
  path?: number[][];
  cStar?: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

const parseMatrix = (input: AlignmentMatrix): number[][] => {
  if (Array.isArray(input)) {
    return input;
  }
  if (input && Array.isArray(input.dim) && Array.isArray(input.data)) {
    const [rows, cols] = input.dim;
    const matrix: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const start = r * cols;
      matrix.push(input.data.slice(start, start + cols));
    }
    return matrix;
  }
  return [];
};

export default function AlignmentViewer({
  matrix,
  path,
  cStar,
  title = 'DTW Alignment',
  xLabel = 'Circuit 2 Gate Index',
  yLabel = 'Circuit 1 Gate Index',
}: AlignmentViewerProps) {
  const rawMatrix = useMemo(() => parseMatrix(matrix), [matrix]);

  const { displayData, scaleX, scaleY, rows, cols } = useMemo(() => {
    const rows = rawMatrix.length;
    const cols = rawMatrix[0]?.length ?? 0;
    if (!rows || !cols) {
      return { displayData: [], scaleX: 1, scaleY: 1, rows, cols };
    }

    const targetX = Math.min(120, cols);
    const targetY = Math.min(120, rows);
    const scaleX = cols / targetX;
    const scaleY = rows / targetY;

    const result: number[][] = [];
    for (let y = 0; y < targetY; y++) {
      const row: number[] = [];
      for (let x = 0; x < targetX; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const dist = rawMatrix[srcY]?.[srcX] ?? 0;
        const similarity = Math.max(0, Math.min(1, 1 - dist));
        row.push(similarity);
      }
      result.push(row);
    }

    return { displayData: result, scaleX, scaleY, rows, cols };
  }, [rawMatrix]);

  const scaledPath = useMemo(() => {
    if (!path || !path.length || !rows || !cols || !displayData.length) {
      return [];
    }
    const targetX = displayData[0]?.length ?? 0;
    const targetY = displayData.length;
    if (!targetX || !targetY) return [];

    const points: Array<[number, number]> = [];
    let last: [number, number] | null = null;
    for (const step of path) {
      const row = step?.[0];
      const col = step?.[1];
      if (row === undefined || col === undefined) continue;
      const x = Math.min(targetX - 1, Math.floor(col / scaleX));
      const y = Math.min(targetY - 1, Math.floor(row / scaleY));
      if (!last || last[0] !== x || last[1] !== y) {
        points.push([x, y]);
        last = [x, y];
      }
    }
    return points;
  }, [path, rows, cols, displayData, scaleX, scaleY]);

  const pathStats = useMemo(() => {
    if (!path || path.length < 2) {
      return { steps: 0, nonDiagonal: 0, warpRatio: 0 };
    }
    let nonDiagonal = 0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const dr = curr[0] - prev[0];
      const dc = curr[1] - prev[1];
      if (dr !== 1 || dc !== 1) {
        nonDiagonal += 1;
      }
    }
    const steps = path.length - 1;
    return {
      steps,
      nonDiagonal,
      warpRatio: steps ? nonDiagonal / steps : 0,
    };
  }, [path]);

  const getColor = (value: number): string => {
    const v = Math.min(1, Math.max(0, value));
    const hue = Math.round(v * 120);
    return `hsl(${hue}, 75%, 45%)`;
  };

  const cellSize = Math.max(
    2,
    Math.min(6, 600 / Math.max(displayData.length, displayData[0]?.length || 1))
  );

  if (!displayData.length || !displayData[0]?.length) {
    return (
      <div className="alignment-container">
        <div className="alignment-empty">Alignment matrix unavailable.</div>
        <style jsx>{`
          .alignment-container {
            background: rgba(20, 20, 30, 0.8);
            border-radius: 12px;
            padding: 16px;
          }
          .alignment-empty {
            text-align: center;
            font-size: 0.75rem;
            color: rgba(200, 200, 220, 0.6);
          }
        `}</style>
      </div>
    );
  }

  const svgWidth = displayData[0].length * cellSize || 100;
  const svgHeight = displayData.length * cellSize || 100;

  return (
    <div className="alignment-container">
      <h4>{title}</h4>
      <div className="alignment-wrapper">
        <div className="y-axis-label">{yLabel}</div>
        <div className="alignment-content">
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
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
            {scaledPath.length > 1 && (
              <polyline
                points={scaledPath
                  .map(
                    ([x, y]) =>
                      `${x * cellSize + cellSize / 2},${y * cellSize + cellSize / 2}`
                  )
                  .join(' ')}
                fill="none"
                stroke="rgba(0, 0, 0, 0.7)"
                strokeWidth={Math.max(1, cellSize / 2)}
              />
            )}
          </svg>
          <div className="x-axis-label">{xLabel}</div>
        </div>
      </div>

      <div className="alignment-stats">
        <span>Cost (c*): {cStar !== undefined ? cStar.toFixed(4) : 'n/a'}</span>
        <span>Path Len: {path?.length ?? 0}</span>
        <span>
          Warp Ratio: {(pathStats.warpRatio * 100).toFixed(1)}%
        </span>
      </div>

      <div className="legend">
        <span className="legend-low">Low</span>
        <div className="legend-gradient" />
        <span className="legend-high">High</span>
      </div>

      <style jsx>{`
        .alignment-container {
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

        .alignment-wrapper {
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

        .alignment-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .alignment-content svg {
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 4px;
        }

        .x-axis-label {
          margin-top: 8px;
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
        }

        .alignment-stats {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.7);
          flex-wrap: wrap;
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
          width: 120px;
          height: 10px;
          background: linear-gradient(
            90deg,
            hsl(0, 75%, 45%),
            hsl(60, 75%, 45%),
            hsl(120, 75%, 45%)
          );
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
