'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  getECA57Stats,
  getECA57Circuits,
  getECA57Equivalents,
  ECA57Circuit,
  ECA57DatabaseStats,
  ECA57ConfigStats,
  EquivalentsResponse,
} from '@/lib/api';
import { Database, ChevronRight, X, Layers, Eye } from 'lucide-react';

// ===== Circuit Diagram Component =====
function CircuitDiagram({
  gates,
  width,
  compact = false,
}: {
  gates: number[][];
  width: number;
  compact?: boolean;
}) {
  const cellW = compact ? 60 : 80;
  const cellH = compact ? 40 : 50;
  const wireY = (w: number) => 20 + w * cellH;
  const gateX = (g: number) => 50 + g * cellW;

  const svgWidth = 50 + gates.length * cellW + 30;
  const svgHeight = 20 + width * cellH;

  return (
    <svg width={svgWidth} height={svgHeight} className="bg-gray-900 rounded">
      {/* Wire labels */}
      {Array.from({ length: width }, (_, w) => (
        <text
          key={`label-${w}`}
          x={15}
          y={wireY(w) + 5}
          fill="#9ca3af"
          fontSize={compact ? 10 : 12}
          textAnchor="middle"
        >
          q{w}
        </text>
      ))}

      {/* Wires */}
      {Array.from({ length: width }, (_, w) => (
        <line
          key={`wire-${w}`}
          x1={30}
          y1={wireY(w)}
          x2={svgWidth - 10}
          y2={wireY(w)}
          stroke="#4b5563"
          strokeWidth="2"
        />
      ))}

      {/* Gates */}
      {gates.map(([target, ctrl1, ctrl2], gIdx) => {
        const x = gateX(gIdx);
        const targetY = wireY(target);
        const ctrl1Y = wireY(ctrl1);
        const ctrl2Y = wireY(ctrl2);

        // Vertical line connecting all
        const minY = Math.min(targetY, ctrl1Y, ctrl2Y);
        const maxY = Math.max(targetY, ctrl1Y, ctrl2Y);

        return (
          <g key={`gate-${gIdx}`}>
            {/* Vertical connector */}
            <line
              x1={x}
              y1={minY}
              x2={x}
              y2={maxY}
              stroke="#6366f1"
              strokeWidth="2"
            />

            {/* Target (XOR box) */}
            <rect
              x={x - 12}
              y={targetY - 12}
              width={24}
              height={24}
              fill="#1f2937"
              stroke="#6366f1"
              strokeWidth="2"
              rx="4"
            />
            <text
              x={x}
              y={targetY + 5}
              textAnchor="middle"
              fill="#6366f1"
              fontSize="14"
              fontWeight="bold"
            >
              ⊕
            </text>

            {/* Ctrl1 (filled dot - active high) */}
            <circle cx={x} cy={ctrl1Y} r={6} fill="#22c55e" stroke="#22c55e" />

            {/* Ctrl2 (empty dot - inverted/NOT) */}
            <circle
              cx={x}
              cy={ctrl2Y}
              r={6}
              fill="#1f2937"
              stroke="#ef4444"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ===== Skeleton Graph Component =====
// Level colors for topological layout
const LEVEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

function getTopologicalLevels(
  gateCount: number,
  edges: number[][]
): number[][] {
  // Build adjacency and in-degree
  const inDegree = new Array(gateCount).fill(0);
  const adjList: number[][] = Array.from({ length: gateCount }, () => []);

  for (const [src, dst] of edges) {
    adjList[src].push(dst);
    inDegree[dst]++;
  }

  const levels: number[][] = [];
  const remaining = new Set(Array.from({ length: gateCount }, (_, i) => i));

  while (remaining.size > 0) {
    const level: number[] = [];
    for (const node of remaining) {
      if (inDegree[node] === 0) {
        level.push(node);
      }
    }

    if (level.length === 0) {
      // Cycle or remaining nodes
      level.push(...remaining);
      remaining.clear();
    } else {
      for (const node of level) {
        remaining.delete(node);
        for (const neighbor of adjList[node]) {
          inDegree[neighbor]--;
        }
      }
    }

    levels.push(level.sort((a, b) => a - b));
  }

  return levels;
}

function SkeletonGraphView({
  gates,
  edges,
  compact = false,
  onNodeClick,
}: {
  gates: number[][];
  edges?: number[][];
  compact?: boolean;
  onNodeClick?: (idx: number) => void;
}) {
  if (!edges || edges.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4">
        No collisions (fully commutative)
      </div>
    );
  }

  const nodeCount = gates.length;

  // Get topological levels for layout
  const levels = getTopologicalLevels(nodeCount, edges);

  // Map node to level and position
  const nodeToLevel = new Map<number, number>();
  const nodeToPosInLevel = new Map<number, number>();
  levels.forEach((level, levelIdx) => {
    level.forEach((nodeIdx, posIdx) => {
      nodeToLevel.set(nodeIdx, levelIdx);
      nodeToPosInLevel.set(nodeIdx, posIdx);
    });
  });

  // Calculate dimensions
  const nodeW = compact ? 28 : 45;
  const nodeH = compact ? 28 : 45;
  const levelGap = compact ? 50 : 80;
  const nodeGap = compact ? 35 : 55;
  const padding = compact ? 20 : 30;

  const maxLevelSize = Math.max(...levels.map((l) => l.length));
  const svgWidth = levels.length * levelGap + padding * 2;
  const svgHeight = maxLevelSize * nodeGap + padding * 2;

  // Node positions
  const nodePositions = new Map<number, { x: number; y: number }>();
  for (let i = 0; i < nodeCount; i++) {
    const level = nodeToLevel.get(i) || 0;
    const posInLevel = nodeToPosInLevel.get(i) || 0;
    const levelSize = levels[level]?.length || 1;

    const x = padding + level * levelGap + nodeW / 2;
    const yOffset = ((maxLevelSize - levelSize) * nodeGap) / 2;
    const y = padding + yOffset + posInLevel * nodeGap + nodeH / 2;

    nodePositions.set(i, { x, y });
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      className="bg-gray-900 rounded"
      style={{ minWidth: svgWidth, minHeight: svgHeight }}
    >
      {/* Edges with curved paths to avoid overlap */}
      {edges.map(([i, j], idx) => {
        const from = nodePositions.get(i)!;
        const to = nodePositions.get(j)!;

        // Calculate curve for non-adjacent levels
        const levelDiff = Math.abs(
          (nodeToLevel.get(i) || 0) - (nodeToLevel.get(j) || 0)
        );
        const curveOffset = levelDiff > 1 ? (idx % 2 === 0 ? -15 : 15) : 0;

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 + curveOffset;

        return (
          <path
            key={`edge-${idx}`}
            d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth={compact ? 1.5 : 2}
            opacity="0.5"
            markerEnd="url(#arrowhead)"
          />
        );
      })}

      {/* Arrowhead marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" opacity="0.5" />
        </marker>
      </defs>

      {/* Nodes */}
      {Array.from(nodePositions.entries()).map(([i, pos]) => {
        const level = nodeToLevel.get(i) || 0;
        const color = LEVEL_COLORS[level % LEVEL_COLORS.length];
        const nodeR = compact ? 14 : 20;

        return (
          <g
            key={`node-${i}`}
            onClick={() => onNodeClick?.(i)}
            className={onNodeClick ? 'cursor-pointer' : ''}
          >
            <rect
              x={pos.x - nodeR}
              y={pos.y - nodeR}
              width={nodeR * 2}
              height={nodeR * 2}
              rx={compact ? 4 : 6}
              fill={color}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <text
              x={pos.x}
              y={pos.y + (compact ? 4 : 5)}
              textAnchor="middle"
              fill="white"
              fontSize={compact ? 10 : 14}
              fontWeight="bold"
            >
              {i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Complexity Walk Chart =====
function ComplexityChart({
  walk,
  compact = false,
}: {
  walk?: number[];
  compact?: boolean;
}) {
  if (!walk || walk.length === 0) return null;

  const max = Math.max(...walk, 1);
  const width = compact ? 120 : 250;
  const height = compact ? 50 : 80;
  const padding = 10;

  const points = walk.map((v, i) => {
    const x = padding + (i / (walk.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - (v / max) * (height - 2 * padding);
    return { x, y, v };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="bg-gray-900 rounded">
      {/* Zero line */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#374151"
        strokeDasharray="4"
      />

      {/* Area fill */}
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="url(#complexityGradient)"
        opacity="0.3"
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="#22c55e"
        strokeWidth={compact ? 2 : 3}
      />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={compact ? 3 : 5} fill="#22c55e" />
          {!compact && (
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
            >
              {p.v}
            </text>
          )}
        </g>
      ))}

      <defs>
        <linearGradient
          id="complexityGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ===== Detail Modal =====
function CircuitDetailModal({
  circuit,
  onClose,
}: {
  circuit: ECA57Circuit;
  onClose: () => void;
}) {
  const [equivalents, setEquivalents] = useState<EquivalentsResponse | null>(
    null
  );
  const [loadingEquivs, setLoadingEquivs] = useState(false);
  const [selectedEquiv, setSelectedEquiv] = useState<number>(0);
  const [fullCircuit, setFullCircuit] = useState<ECA57Circuit | null>(null);

  useEffect(() => {
    loadEquivalents();
    loadFullCircuit();
  }, [circuit]);

  async function loadEquivalents() {
    setLoadingEquivs(true);
    try {
      const data = await getECA57Equivalents(
        circuit.width,
        circuit.gate_count,
        circuit.id,
        50
      );
      setEquivalents(data);
    } catch (err) {
      console.error('Failed to load equivalents:', err);
    } finally {
      setLoadingEquivs(false);
    }
  }

  async function loadFullCircuit() {
    try {
      // Import getECA57Circuit dynamically since we need to add it
      const { getECA57Circuit } = await import('@/lib/api');
      const data = await getECA57Circuit(
        circuit.width,
        circuit.gate_count,
        circuit.id
      );
      setFullCircuit(data);
    } catch (err) {
      console.error('Failed to load full circuit:', err);
    }
  }

  const currentGates =
    equivalents?.equivalents[selectedEquiv]?.gates || circuit.gates;
  const currentEdges =
    equivalents?.equivalents[selectedEquiv]?.skeleton_edges ||
    circuit.skeleton_edges;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold">
              Identity #{circuit.id} (w{circuit.width}g{circuit.gate_count})
            </h2>
            <p className="text-gray-400">
              {circuit.equivalence_class_size} equivalent forms
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Permutation / Cycle Notation Section */}
          <div className="mb-6 bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Permutation</h3>
            {fullCircuit?.cycle_notation ? (
              <div className="space-y-2">
                <div className="font-mono text-lg text-indigo-400">
                  {fullCircuit.cycle_notation === '()' ? (
                    <span className="text-green-400">Identity ()</span>
                  ) : (
                    fullCircuit.cycle_notation
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {fullCircuit.cycle_notation === '()'
                    ? 'This circuit computes the identity permutation'
                    : 'Cycle notation: each (a b c) means a→b→c→a'}
                </p>
                {fullCircuit.permutation && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                      Show full mapping ({fullCircuit.permutation.length}{' '}
                      states)
                    </summary>
                    <div className="mt-2 font-mono text-xs text-gray-500 overflow-x-auto">
                      [{fullCircuit.permutation.join(', ')}]
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Loading...</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Circuit Diagram */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                Circuit Diagram
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <CircuitDiagram gates={currentGates} width={circuit.width} />
              </div>

              {/* Gate List */}
              <div className="mt-4 space-y-2">
                {currentGates.map(([t, c1, c2], i) => (
                  <div
                    key={i}
                    className="bg-gray-700 rounded p-2 font-mono text-sm flex gap-2"
                  >
                    <span className="text-gray-400">G{i}:</span>
                    <span className="text-indigo-400">q{t}</span>
                    <span>^= (</span>
                    <span className="text-green-400">q{c1}</span>
                    <span>OR NOT</span>
                    <span className="text-red-400">q{c2}</span>
                    <span>)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Skeleton + Complexity */}
            <div>
              <h3 className="text-lg font-medium mb-3">Skeleton Graph</h3>
              <div className="bg-gray-900 rounded-lg p-4 flex justify-center">
                <SkeletonGraphView gates={currentGates} edges={currentEdges} />
              </div>
              <p className="text-sm text-gray-400 mt-2 text-center">
                {currentEdges?.length || 0} collision edges
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">Complexity Walk</h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <ComplexityChart walk={circuit.complexity_walk} />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Hamming distance from identity: [0 →{' '}
                {circuit.complexity_walk?.join(' → ')}]
              </p>
              <p className="text-sm text-gray-400">
                Peak: {Math.max(...(circuit.complexity_walk || [0]))}
              </p>
            </div>
          </div>

          {/* Equivalent Forms Section */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-3">
              Equivalent Forms
              {loadingEquivs && (
                <span className="text-gray-500 ml-2">(loading...)</span>
              )}
            </h3>

            {equivalents && (
              <div>
                <p className="text-gray-400 mb-3">
                  Showing {equivalents.returned} of{' '}
                  {equivalents.total_equivalents} equivalent circuits
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {equivalents.equivalents.map((eq, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEquiv(idx)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedEquiv === idx
                          ? 'bg-indigo-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      Form #{idx}
                    </button>
                  ))}
                </div>

                {/* Selected equivalent preview */}
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <CircuitDiagram
                    gates={
                      equivalents.equivalents[selectedEquiv]?.gates ||
                      circuit.gates
                    }
                    width={circuit.width}
                    compact
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Circuit Card =====
function CircuitCard({
  circuit,
  onClick,
}: {
  circuit: ECA57Circuit;
  onClick: () => void;
}) {
  const maxComplexity = circuit.complexity_walk
    ? Math.max(...circuit.complexity_walk)
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-indigo-500 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-white">Identity #{circuit.id}</h3>
          <p className="text-sm text-gray-400">
            {circuit.equivalence_class_size} equivalent forms
          </p>
        </div>
        <Eye size={18} className="text-indigo-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Skeleton Graph */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Skeleton</p>
          <SkeletonGraphView
            gates={circuit.gates}
            edges={circuit.skeleton_edges}
            compact
          />
        </div>

        {/* Complexity Walk */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Complexity</p>
          <ComplexityChart walk={circuit.complexity_walk} compact />
          <p className="text-xs text-gray-500 mt-1">Peak: {maxComplexity}</p>
        </div>
      </div>
    </div>
  );
}

// ===== Main Explorer =====
export default function ECA57Explorer() {
  const [stats, setStats] = useState<ECA57DatabaseStats | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ECA57ConfigStats | null>(
    null
  );
  const [circuits, setCircuits] = useState<ECA57Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [circuitsLoading, setCircuitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedCircuit, setSelectedCircuit] = useState<ECA57Circuit | null>(
    null
  );
  const limit = 12;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadCircuits();
    }
  }, [selectedConfig, offset]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getECA57Stats();
      setStats(data);

      if (data.configurations.length > 0) {
        setSelectedConfig(data.configurations[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadCircuits() {
    if (!selectedConfig) return;

    try {
      setCircuitsLoading(true);
      const data = await getECA57Circuits(
        selectedConfig.width,
        selectedConfig.gate_count,
        offset,
        limit
      );
      setCircuits(data);
    } catch (err) {
      console.error('Failed to load circuits:', err);
    } finally {
      setCircuitsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading ECA57 Identity Database...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <p className="text-gray-500 text-sm">
              Make sure the API server is running:
            </p>
            <code className="text-sm text-gray-400 mt-2 block">
              python start_api.py
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Modal */}
      {selectedCircuit && (
        <CircuitDetailModal
          circuit={selectedCircuit}
          onClose={() => setSelectedCircuit(null)}
        />
      )}

      <Navigation />

      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-medium text-gray-300 mb-2">Database Stats</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-700 rounded p-2">
                <p className="text-gray-400">Classes</p>
                <p className="text-lg font-medium">
                  {stats?.total_representatives}
                </p>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <p className="text-gray-400">Circuits</p>
                <p className="text-lg font-medium">
                  {stats?.total_circuits?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h2 className="font-medium text-gray-300 mb-3">Configurations</h2>
            <div className="space-y-2">
              {stats?.configurations.map((config) => (
                <button
                  key={`w${config.width}g${config.gate_count}`}
                  onClick={() => {
                    setSelectedConfig(config);
                    setOffset(0);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConfig?.width === config.width &&
                    selectedConfig?.gate_count === config.gate_count
                      ? 'bg-indigo-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      w{config.width}g{config.gate_count}
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {config.num_representatives} classes
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedConfig && (
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-medium">
                    w{selectedConfig.width}g{selectedConfig.gate_count}{' '}
                    Identities
                  </h2>
                  <p className="text-gray-400">
                    {selectedConfig.num_representatives} unique templates
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-gray-400">
                    {offset + 1}-
                    {Math.min(
                      offset + limit,
                      selectedConfig.num_representatives
                    )}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={
                      offset + limit >= selectedConfig.num_representatives
                    }
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {circuitsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {circuits.map((circuit) => (
                    <CircuitCard
                      key={circuit.id}
                      circuit={circuit}
                      onClick={() => setSelectedCircuit(circuit)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
