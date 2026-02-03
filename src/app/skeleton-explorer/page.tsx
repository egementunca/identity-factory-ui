'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import {
  getSkeletonStats,
  getSkeletonCircuits,
  getSkeletonCircuitDetail,
  getSkeletonTaxonomies,
  SkeletonCircuit,
  SkeletonCircuitDetail,
  SkeletonExplorerStats,
  TaxonomyStats,
} from '@/lib/api';
import { Database, ChevronRight, X, Zap, Eye, Play, CheckCircle, AlertCircle } from 'lucide-react';

// ===== Circuit Diagram Component =====
function CircuitDiagram({
  gates,
  width,
  collisionEdges,
  compact = false,
  highlightCollisions = true,
}: {
  gates: number[][];
  width: number;
  collisionEdges?: number[][];
  compact?: boolean;
  highlightCollisions?: boolean;
}) {
  const cellW = compact ? 50 : 70;
  const cellH = compact ? 35 : 45;
  const wireY = (w: number) => 20 + w * cellH;
  const gateX = (g: number) => 50 + g * cellW;

  const svgWidth = 50 + gates.length * cellW + 30;
  const svgHeight = 20 + width * cellH;

  // Create a set of collision edges for quick lookup
  const collisionSet = new Set(
    (collisionEdges || []).map(([i, j]) => `${i}-${j}`)
  );

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

      {/* Collision lines between adjacent gates */}
      {highlightCollisions && collisionEdges && collisionEdges.map(([i, j], idx) => {
        if (j !== i + 1) return null; // Only show for adjacent gates
        const x1 = gateX(i);
        const x2 = gateX(j);
        const midX = (x1 + x2) / 2;
        return (
          <line
            key={`collision-${idx}`}
            x1={x1 + 12}
            y1={wireY(0) - 15}
            x2={x2 - 12}
            y2={wireY(0) - 15}
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}

      {/* Gates */}
      {gates.map(([target, ctrl1, ctrl2], gIdx) => {
        const x = gateX(gIdx);
        const targetY = wireY(target);
        const ctrl1Y = wireY(ctrl1);
        const ctrl2Y = wireY(ctrl2);

        // Vertical line connecting all
        const minY = Math.min(targetY, ctrl1Y, ctrl2Y);
        const maxY = Math.max(targetY, ctrl1Y, ctrl2Y);

        // Check if this gate collides with the next
        const collidesNext = collisionSet.has(`${gIdx}-${gIdx + 1}`);
        const collidesPrev = collisionSet.has(`${gIdx - 1}-${gIdx}`);
        const gateColor = (collidesNext || collidesPrev) && highlightCollisions
          ? '#f97316' // orange for colliding gates
          : '#6366f1'; // default indigo

        return (
          <g key={`gate-${gIdx}`}>
            {/* Vertical connector */}
            <line
              x1={x}
              y1={minY}
              x2={x}
              y2={maxY}
              stroke={gateColor}
              strokeWidth="2"
            />

            {/* Target (XOR box) */}
            <rect
              x={x - 12}
              y={targetY - 12}
              width={24}
              height={24}
              fill="#1f2937"
              stroke={gateColor}
              strokeWidth="2"
              rx="4"
            />
            <text
              x={x}
              y={targetY + 5}
              textAnchor="middle"
              fill={gateColor}
              fontSize="14"
              fontWeight="bold"
            >
              ⊕
            </text>

            {/* Ctrl1 (filled dot) */}
            <circle cx={x} cy={ctrl1Y} r={5} fill="#22c55e" stroke="#22c55e" />

            {/* Ctrl2 (empty dot) */}
            <circle
              cx={x}
              cy={ctrl2Y}
              r={5}
              fill="#1f2937"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {/* Gate index */}
            <text
              x={x}
              y={minY - 8}
              textAnchor="middle"
              fill="#6b7280"
              fontSize="10"
            >
              {gIdx}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ===== Collision Chain Graph =====
function CollisionChainGraph({
  gates,
  collisionEdges,
  compact = false,
}: {
  gates: number[][];
  collisionEdges?: number[][];
  compact?: boolean;
}) {
  if (!collisionEdges || collisionEdges.length === 0) {
    return (
      <div className="text-gray-500 text-sm p-4">
        No collisions (fully commutative)
      </div>
    );
  }

  const nodeCount = gates.length;
  const nodeR = compact ? 14 : 20;
  const nodeGap = compact ? 40 : 60;
  const padding = 20;

  const svgWidth = nodeCount * nodeGap + padding * 2;
  const svgHeight = compact ? 60 : 80;

  // For skeleton chains, gates are typically in a linear sequence
  const nodePositions = Array.from({ length: nodeCount }, (_, i) => ({
    x: padding + i * nodeGap + nodeR,
    y: svgHeight / 2,
  }));

  return (
    <svg width={svgWidth} height={svgHeight} className="bg-gray-900 rounded">
      {/* Edges */}
      {collisionEdges.map(([i, j], idx) => {
        const from = nodePositions[i];
        const to = nodePositions[j];
        return (
          <line
            key={`edge-${idx}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#ef4444"
            strokeWidth={compact ? 2 : 3}
            opacity="0.7"
          />
        );
      })}

      {/* Nodes */}
      {nodePositions.map((pos, i) => (
        <g key={`node-${i}`}>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={nodeR}
            fill="#6366f1"
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
      ))}
    </svg>
  );
}

// ===== Detail Modal =====
function CircuitDetailModal({
  circuit,
  onClose,
  onLoadToPlayground,
}: {
  circuit: SkeletonCircuitDetail;
  onClose: () => void;
  onLoadToPlayground: (gateString: string, width: number) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold">
              Skeleton Identity (n{circuit.width}, {circuit.gate_count} gates)
            </h2>
            <p className="text-gray-400">{circuit.taxonomy}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onLoadToPlayground(circuit.gate_string, circuit.width)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
            >
              <Play size={16} />
              Load to Playground
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Status badges */}
          <div className="flex gap-3 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              circuit.is_identity ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {circuit.is_identity ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {circuit.is_identity ? 'Identity Circuit' : 'Not Identity'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              circuit.is_fully_noncommuting ? 'bg-orange-900/50 text-orange-400' : 'bg-gray-700 text-gray-400'
            }`}>
              <Zap size={16} />
              {circuit.is_fully_noncommuting ? 'Fully Noncommuting' : 'Has Commuting Pairs'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Circuit Diagram */}
            <div>
              <h3 className="text-lg font-medium mb-3">Circuit Diagram</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <CircuitDiagram
                  gates={circuit.gates}
                  width={circuit.width}
                  collisionEdges={circuit.collision_edges}
                  highlightCollisions={true}
                />
              </div>

              {/* Gate List */}
              <div className="mt-4 space-y-2">
                {circuit.gates.map(([t, c1, c2], i) => (
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

            {/* Collision Chain */}
            <div>
              <h3 className="text-lg font-medium mb-3">Collision Chain</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <CollisionChainGraph
                  gates={circuit.gates}
                  collisionEdges={circuit.collision_edges}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {circuit.collision_edges?.length || 0} collision edges
                {circuit.is_fully_noncommuting && circuit.gates.length > 1 && (
                  <span className="text-orange-400 ml-2">
                    (all {circuit.gates.length - 1} adjacent pairs collide)
                  </span>
                )}
              </p>

              {/* Taxonomy explanation */}
              <div className="mt-6 bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium mb-2">Taxonomy: {circuit.taxonomy}</h4>
                <p className="text-sm text-gray-400">
                  The taxonomy describes how the first two gates collide:
                </p>
                <ul className="text-sm text-gray-400 mt-2 space-y-1">
                  <li><span className="text-yellow-400">OnActive</span>: Collision on active (target) wire</li>
                  <li><span className="text-green-400">OnCtrl1</span>: Collision on control 1 wire</li>
                  <li><span className="text-red-400">OnCtrl2</span>: Collision on control 2 wire</li>
                  <li><span className="text-cyan-400">OnNew</span>: Collision on a new wire</li>
                </ul>
              </div>

              {/* Gate string for copy */}
              <div className="mt-4 bg-gray-900 rounded-lg p-4">
                <h4 className="font-medium mb-2">Gate String</h4>
                <code className="text-sm text-gray-400 break-all">
                  {circuit.gate_string}
                </code>
              </div>
            </div>
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
  circuit: SkeletonCircuit;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500 transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-medium text-white">{circuit.gate_count} gates</h3>
          <p className="text-sm text-gray-400 font-mono truncate max-w-[200px]">
            {circuit.taxonomy}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {circuit.is_fully_noncommuting && (
            <Zap size={16} className="text-orange-400" />
          )}
          <Eye size={16} className="text-indigo-400" />
        </div>
      </div>

      {/* Mini circuit preview */}
      <div className="bg-gray-900 rounded p-2 overflow-hidden">
        <div className="text-xs font-mono text-gray-500 truncate">
          {circuit.gates.slice(0, 4).map(([t, c1, c2]) => `(${t},${c1},${c2})`).join(' → ')}
          {circuit.gates.length > 4 && ' ...'}
        </div>
      </div>
    </div>
  );
}

// ===== Main Explorer =====
export default function SkeletonExplorer() {
  const [stats, setStats] = useState<SkeletonExplorerStats | null>(null);
  const [selectedWidth, setSelectedWidth] = useState<number | null>(null);
  const [taxonomies, setTaxonomies] = useState<TaxonomyStats[]>([]);
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string | null>(null);
  const [circuits, setCircuits] = useState<SkeletonCircuit[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<SkeletonCircuitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [circuitsLoading, setCircuitsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [circuitListError, setCircuitListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedWidth !== null) {
      loadTaxonomies();
    }
  }, [selectedWidth]);

  useEffect(() => {
    if (selectedWidth !== null) {
      loadCircuits();
    }
  }, [selectedWidth, selectedTaxonomy, offset]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSkeletonStats();
      setStats(data);

      if (data.widths.length > 0) {
        // Select first available width
        setSelectedWidth(data.widths[0].width);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadTaxonomies() {
    if (selectedWidth === null) return;
    try {
      setTaxonomyError(null);
      const data = await getSkeletonTaxonomies(selectedWidth);
      setTaxonomies(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load taxonomies';
      console.error('Failed to load taxonomies:', err);
      setTaxonomyError(message);
      setTaxonomies([]);
    }
  }

  async function loadCircuits() {
    if (selectedWidth === null) return;
    try {
      setCircuitsLoading(true);
      setCircuitListError(null);
      const data = await getSkeletonCircuits(
        selectedWidth,
        selectedTaxonomy || undefined,
        offset,
        limit
      );
      setCircuits(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load circuits';
      console.error('Failed to load circuits:', err);
      setCircuitListError(message);
      setCircuits([]);
    } finally {
      setCircuitsLoading(false);
    }
  }

  async function handleCircuitClick(circuit: SkeletonCircuit) {
    try {
      setDetailLoading(true);
      setDetailError(null);

      // Parse the circuit ID to extract taxonomy_key and index
      // ID format: "skeleton:{width}:{taxonomy_key}:{index}"
      // taxonomy_key is clean format like "OnCtrl1,OnActive,OnActive" (no parentheses)
      // We must use taxonomy_key from ID, not circuit.taxonomy which has parentheses
      const parts = circuit.id.split(':');
      if (parts.length < 4) {
        throw new Error(`Invalid circuit ID format: ${circuit.id}`);
      }

      const width = circuit.width;
      const taxonomyKey = parts[2]; // Clean format without parentheses
      const index = parseInt(parts[3], 10);

      // Validate parsed index
      if (isNaN(index) || index < 0) {
        throw new Error(`Invalid index in circuit ID: ${circuit.id}`);
      }

      const detail = await getSkeletonCircuitDetail(width, taxonomyKey, index);
      setSelectedCircuit(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load circuit detail';
      console.error('Failed to load circuit detail:', err);
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  }

  function handleLoadToPlayground(gateString: string, width: number) {
    // Navigate to Playground Pro with the gate string and width
    window.location.href = `/playground-v2?gates=${encodeURIComponent(gateString)}&width=${width}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading Skeleton Identity Database...</p>
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
              Make sure the API server is running and local_mixing/db exists
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentWidthStats = stats?.widths.find(w => w.width === selectedWidth);
  const totalCircuitsForWidth = selectedTaxonomy
    ? taxonomies.find(t => (t.taxonomy_key ?? t.taxonomy) === selectedTaxonomy)?.circuit_count || 0
    : currentWidthStats?.circuit_count || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Loading overlay for circuit detail */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mb-3" />
            <p className="text-gray-300">Loading circuit details...</p>
          </div>
        </div>
      )}

      {/* Error toast for circuit detail loading */}
      {detailError && !detailLoading && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <div className="bg-red-900 border border-red-500 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-300">Failed to load circuit</p>
                <p className="text-sm text-red-400 mt-1">{detailError}</p>
              </div>
              <button
                onClick={() => setDetailError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCircuit && !detailLoading && (
        <CircuitDetailModal
          circuit={selectedCircuit}
          onClose={() => setSelectedCircuit(null)}
          onLoadToPlayground={handleLoadToPlayground}
        />
      )}

      <Navigation />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Zap className="text-orange-400" />
            Skeleton Identity Explorer
          </h1>
          <p className="text-gray-400 mt-1">
            Browse fully noncommuting identity circuits for local_mixing pair replacement
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Circuits</p>
            <p className="text-2xl font-bold">{stats?.total_circuits.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Widths</p>
            <p className="text-2xl font-bold">{stats?.widths.length}</p>
            <p className="text-xs text-gray-500">
              n{stats?.widths.map(w => w.width).join(', n')}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Taxonomies</p>
            <p className="text-2xl font-bold">{stats?.total_taxonomies}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Gate Range</p>
            <p className="text-2xl font-bold">6-14</p>
            <p className="text-xs text-gray-500">gates per circuit</p>
          </div>
        </div>

        {/* Width Tabs */}
        <div className="flex gap-2 mb-6">
          {stats?.widths.map((w) => (
            <button
              key={w.width}
              onClick={() => {
                setSelectedWidth(w.width);
                setSelectedTaxonomy(null);
                setOffset(0);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedWidth === w.width
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ids_n{w.width}
              <span className="ml-2 text-sm opacity-70">
                ({w.circuit_count.toLocaleString()})
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Taxonomy Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium mb-3 flex items-center justify-between">
                Taxonomies
                {selectedTaxonomy && (
                  <button
                    onClick={() => {
                      setSelectedTaxonomy(null);
                      setOffset(0);
                    }}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </h3>
              {taxonomyError && (
                <div className="mb-3 p-3 bg-red-900/30 border border-red-500 rounded-lg text-sm text-red-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Failed to load taxonomies</span>
                  </div>
                  <p className="text-xs mt-1 text-red-300">{taxonomyError}</p>
                </div>
              )}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {taxonomies.map((tax) => {
                  // Use taxonomy_key if available, otherwise fall back to taxonomy string
                  const taxKey = tax.taxonomy_key ?? tax.taxonomy;
                  const isSelected = selectedTaxonomy === taxKey;

                  return (
                  <button
                    key={taxKey}
                    onClick={() => {
                      setSelectedTaxonomy(taxKey);
                      setOffset(0);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-orange-600/30 border border-orange-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-mono text-sm truncate">{tax.taxonomy}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {tax.circuit_count} circuits
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Sizes: {Object.entries(tax.gate_sizes)
                        .map(([size, count]) => `${size}g(${count})`)
                        .join(', ')}
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Width Info */}
            {currentWidthStats && (
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <h3 className="font-medium mb-2">ids_n{currentWidthStats.width}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Circuits</span>
                    <span>{currentWidthStats.circuit_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxonomies</span>
                    <span>{currentWidthStats.taxonomies.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">All Fully NC</span>
                    <span className={currentWidthStats.all_fully_noncommuting ? 'text-green-400' : 'text-yellow-400'}>
                      {currentWidthStats.all_fully_noncommuting ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Circuit Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-medium">
                  {selectedTaxonomy ? `Circuits for ${selectedTaxonomy}` : `All Circuits (n${selectedWidth})`}
                </h2>
                <p className="text-sm text-gray-400">
                  {totalCircuitsForWidth.toLocaleString()} circuits
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
                  {offset + 1}-{Math.min(offset + limit, totalCircuitsForWidth)}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= totalCircuitsForWidth}
                  className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {circuitsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {circuits.map((circuit) => (
                  <CircuitCard
                    key={circuit.id}
                    circuit={circuit}
                    onClick={() => handleCircuitClick(circuit)}
                  />
                ))}
              </div>
            )}

            {circuitListError && !circuitsLoading && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle size={18} />
                  <span className="font-medium">Failed to load circuits</span>
                </div>
                <p className="text-sm mt-2 text-red-300">{circuitListError}</p>
                <button
                  onClick={() => loadCircuits()}
                  className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {!circuitsLoading && !circuitListError && circuits.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No circuits found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
