'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PlaygroundCircuit, PlaygroundGate } from '@/types/api';
import { gatesCollide } from '@/lib/circuitUtils';

interface SkeletonGraphProps {
  circuit: PlaygroundCircuit;
  highlightedGateId?: string | null;
  highlightedEdgeGates?: [string, string] | null;
  onNodeClick?: (gateId: string) => void;
  onEdgeClick?: (gate1Id: string, gate2Id: string) => void;
  forceShow?: boolean;
  selectedGateIds?: Set<string>;
}

// Get topological levels from skeleton edges
function getTopologicalLevels(
  gates: PlaygroundGate[],
  edges: [number, number][]
): number[][] {
  const n = gates.length;
  const inDegree = new Array(n).fill(0);
  const adjList: number[][] = Array.from({ length: n }, () => []);

  for (const [src, dst] of edges) {
    adjList[src].push(dst);
    inDegree[dst]++;
  }

  const levels: number[][] = [];
  const remaining = new Set(Array.from({ length: n }, (_, i) => i));

  while (remaining.size > 0) {
    const level: number[] = [];
    for (const node of remaining) {
      if (inDegree[node] === 0) {
        level.push(node);
      }
    }

    if (level.length === 0) {
      // Cycle detected (should not happen in skeleton graph of valid circuit, but safety fallback)
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

    levels.push(level);
  }

  return levels;
}

// Colors for topological levels
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

export default function SkeletonGraph({
  circuit,
  highlightedGateId,
  highlightedEdgeGates,
  onNodeClick,
  onEdgeClick,
  forceShow,
  selectedGateIds,
}: SkeletonGraphProps) {
  useEffect(() => {
    console.log('[SkeletonGraph] Component loaded using UPDATED collision logic (Target-Control only)');
  }, []);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  // Build skeleton edges and levels
  const { skeletonEdges, levels, nodeToLevel } = useMemo(() => {
    const gates = circuit.gates;
    const sortedGates = [...gates].sort((a, b) => a.step - b.step);
    
    // 1. Compute full collision set (Dependency Graph)
    // collisionMap[i] contains all j > i such that i and j collide
    const collisions = new Map<number, Set<number>>();
    
    for (let i = 0; i < sortedGates.length; i++) {
        collisions.set(i, new Set());
        for (let j = i + 1; j < sortedGates.length; j++) {
            if (gatesCollide(sortedGates[i], sortedGates[j])) {
                collisions.get(i)!.add(j);
            }
        }
    }

    // 2. Filter edges to form Skeleton Graph
    // Edge i->j exists iff i and j collide AND NO k (i < k < j) collides with BOTH i and j
    const edges: [number, number][] = [];

    for (let i = 0; i < sortedGates.length; i++) {
        const i_collisions = collisions.get(i)!;
        for (const j of i_collisions) {
            let isRedundant = false;
            // Check for intermediate k
            for (let k = i + 1; k < j; k++) {
                // Check if k collides with i (i.e. if k is in i's collision list)
                // AND k collides with j (i.e. if j is in k's collision list)
                // Note: collision list only stores forward collisions, but collision is symmetric.
                // i < k, so check if k is in collisions[i]
                // k < j, so check if j is in collisions[k]
                if (i_collisions.has(k) && collisions.get(k)!.has(j)) {
                    isRedundant = true;
                    break;
                }
            }
            
            if (!isRedundant) {
                edges.push([i, j]);
            }
        }
    }

    const levels = getTopologicalLevels(sortedGates, edges);

    // Map node index to level
    const nodeToLevel = new Map<number, number>();
    levels.forEach((level, levelIdx) => {
      level.forEach((nodeIdx) => {
        nodeToLevel.set(nodeIdx, levelIdx);
      });
    });

    return { skeletonEdges: edges, levels, nodeToLevel, sortedGates };
  }, [circuit.gates]);

  // Create React Flow nodes
  const nodes: Node[] = useMemo(() => {
    const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

    return sortedGates.map((gate, idx) => {
      const level = nodeToLevel.get(idx) || 0;
      const levelNodes = levels[level] || [];
      const posInLevel = levelNodes.indexOf(idx);

      const x = level * 120 + 50;
      const y = posInLevel * 80 + 50;

      const color = LEVEL_COLORS[level % LEVEL_COLORS.length];
      const isHighlighted = gate.id === highlightedGateId;
      const isEdgeHighlighted =
        highlightedEdgeGates &&
        (gate.id === highlightedEdgeGates[0] ||
          gate.id === highlightedEdgeGates[1]);
      const isHovered = hoveredNode === gate.id;

      return {
        id: gate.id,
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div className="font-bold text-sm">{idx}</div>
              <div className="text-xs opacity-80">{gate.type}</div>
              <div className="text-xs opacity-60">t{gate.target}</div>
            </div>
          ),
        },
        style: {
          backgroundColor: color,
           border: isEdgeHighlighted
             ? '3px solid #facc15' // yellow for edge highlight
             : isHighlighted
               ? '3px solid white'
               : selectedGateIds?.has(gate.id)
                 ? '2px solid #60a5fa' // blue for selection
                 : isHovered
                   ? '2px solid white'
                   : '1px solid rgba(255,255,255,0.3)',
          borderRadius: '8px',
          padding: '8px',
          color: 'white',
          width: 60,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isEdgeHighlighted
             ? '0 0 20px #facc15'
             : isHighlighted
               ? '0 0 15px ' + color
               : selectedGateIds?.has(gate.id)
                 ? '0 0 10px rgba(96, 165, 250, 0.5)'
                 : '0 2px 5px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  }, [
    circuit.gates,
    nodeToLevel,
    levels,
    highlightedGateId,
    highlightedEdgeGates,
    hoveredNode,
    selectedGateIds,
  ]);

  // Create React Flow edges
  const edges: Edge[] = useMemo(() => {
    const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

    return skeletonEdges.map(([src, dst], idx) => {
      const srcGate = sortedGates[src];
      const dstGate = sortedGates[dst];
      const edgeId = `${srcGate.id}-${dstGate.id}`;
      const isHovered = hoveredEdge === edgeId;

      return {
        id: edgeId,
        source: srcGate.id,
        target: dstGate.id,
        type: 'smoothstep',
        animated: isHovered,
        style: {
          stroke: isHovered ? '#ffffff' : '#64748b',
          strokeWidth: isHovered ? 3 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isHovered ? '#ffffff' : '#64748b',
        },
      };
    });
  }, [skeletonEdges, circuit.gates, hoveredEdge]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick && edge.source && edge.target) {
        onEdgeClick(edge.source, edge.target);
      }
    },
    [onEdgeClick]
  );

  if (circuit.gates.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🔗</div>
          <div>Add gates to see skeleton graph</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-900/50 rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdge(null)}
        fitView
        panOnDrag
        zoomOnScroll
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        {/* Legend */}
        <div className="absolute top-4 left-4 bg-slate-800/80 p-3 rounded-lg border border-slate-600/50 text-xs">
          <div className="font-bold text-white mb-2">Skeleton Graph</div>
          <div className="text-slate-300 mb-1">
            Nodes = Gates (by step order)
          </div>
          <div className="text-slate-300 mb-2">
            Edges = Collisions (can&apos;t swap)
          </div>
          <div className="text-slate-300">
            <span className="font-medium">Levels:</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {levels.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded"
                style={{ backgroundColor: LEVEL_COLORS[idx] }}
                title={`Level ${idx}`}
              />
            ))}
            {levels.length > 5 && (
              <span className="text-slate-400">+{levels.length - 5}</span>
            )}
          </div>
        </div>
      </ReactFlow>
    </div>
  );
}
