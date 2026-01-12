'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GateToolbox from './GateToolbox';
import CircuitCanvas from './CircuitCanvas';
import SkeletonGraph from './SkeletonGraph';
import { PlaygroundCircuit, PlaygroundGate, LiveMetrics } from '@/types/api';
import { Plus, Minus, ArrowRightLeft } from 'lucide-react';

// Check if two gates collide (can't swap)
// Gates collide iff one's target is in the other's controls
// Note: Same targets DO commute for ECA57 gates!
function gatesCollide(g1: PlaygroundGate, g2: PlaygroundGate): boolean {
  return g2.controls.includes(g1.target) || g1.controls.includes(g2.target);
}

// Get topological levels from collision edges
function getTopologicalOrder(gates: PlaygroundGate[]): PlaygroundGate[] {
  const n = gates.length;
  if (n === 0) return [];

  // Build collision edges
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (gatesCollide(gates[i], gates[j])) {
        edges.push([i, j]);
      }
    }
  }

  // Calculate in-degrees
  const inDegree = new Array(n).fill(0);
  const adjList: number[][] = Array.from({ length: n }, () => []);
  for (const [src, dst] of edges) {
    adjList[src].push(dst);
    inDegree[dst]++;
  }

  // Kahn's algorithm for topological sort
  const result: number[] = [];
  const queue: number[] = [];

  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  while (queue.length > 0) {
    // Sort by target (highest first) within same level
    queue.sort((a, b) => gates[b].target - gates[a].target);
    const node = queue.shift()!;
    result.push(node);

    for (const neighbor of adjList[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Return reordered gates with new steps
  return result.map((oldIdx, newStep) => ({
    ...gates[oldIdx],
    step: newStep,
  }));
}

const INITIAL_WIDTH = 4;
const INITIAL_LENGTH = 12;
const MIN_WIDTH = 3;

export default function ECA57Playground() {
  const [circuit, setCircuit] = useState<PlaygroundCircuit>({
    width: INITIAL_WIDTH,
    length: INITIAL_LENGTH,
    gates: [],
  });

  const [selectedTool, setSelectedTool] = useState<
    'X' | 'CX' | 'CCX' | 'ECA57' | null
  >('ECA57');
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const [highlightedGateId, setHighlightedGateId] = useState<string | null>(
    null
  );

  // 3-click placement mode: "auto" = current behavior, "manual" = 3-click
  const [placementMode, setPlacementMode] = useState<'auto' | 'manual'>('auto');

  // Pending 3-click placement: { step, target, ctrl1?, ctrl2? }
  const [pendingPlacement, setPendingPlacement] = useState<{
    step: number;
    target?: number;
    ctrl1?: number;
  } | null>(null);

  // Gate selection for cut/copy/paste
  const [selectedGateIds, setSelectedGateIds] = useState<Set<string>>(
    new Set()
  );

  // Clipboard: stores copied gates with both exact and reduced versions
  const [clipboard, setClipboard] = useState<{
    gates: PlaygroundGate[];
    reducedGates: PlaygroundGate[];
    sourceWidth: number;
    reducedWidth: number;
  } | null>(null);

  // Calculate live permutation and cycle notation
  const { permutation, isIdentity, cycleNotation } = useMemo(() => {
    const width = circuit.width;
    const numStates = 1 << width;
    let perm = Array.from({ length: numStates }, (_, i) => i);

    const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

    for (const gate of sortedGates) {
      const newPerm = [...perm];
      for (let state = 0; state < numStates; state++) {
        let newState = perm[state];

        switch (gate.type) {
          case 'X':
            newState ^= 1 << gate.target;
            break;
          case 'CX':
            if (newState & (1 << gate.controls[0])) {
              newState ^= 1 << gate.target;
            }
            break;
          case 'CCX':
            if (gate.controls.every((c) => newState & (1 << c))) {
              newState ^= 1 << gate.target;
            }
            break;
          case 'ECA57':
            const ctrl1Set = !!(newState & (1 << gate.controls[0]));
            const ctrl2Set = !!(newState & (1 << gate.controls[1]));
            if (ctrl1Set || !ctrl2Set) {
              newState ^= 1 << gate.target;
            }
            break;
        }
        newPerm[state] = newState;
      }
      perm = newPerm;
    }

    // Compute cycle notation
    const visited = new Array(numStates).fill(false);
    const cycles: number[][] = [];

    for (let start = 0; start < numStates; start++) {
      if (visited[start]) continue;

      const cycle: number[] = [];
      let curr = start;

      while (!visited[curr]) {
        visited[curr] = true;
        cycle.push(curr);
        curr = perm[curr];
      }

      // Only include non-trivial cycles (length > 1)
      if (cycle.length > 1) {
        cycles.push(cycle);
      }
    }

    // Format cycle notation string
    let cycleStr = '';
    if (cycles.length === 0) {
      cycleStr = '()'; // Identity
    } else {
      for (const cycle of cycles) {
        cycleStr += '(' + cycle.join(' ') + ')';
      }
    }

    return {
      permutation: perm,
      isIdentity: perm.every((val, idx) => val === idx),
      cycleNotation: cycleStr,
    };
  }, [circuit]);

  // Gate placement - find next available step
  const findNextAvailableStep = useCallback(
    (gates: PlaygroundGate[], preferredStep: number): number => {
      const occupiedSteps = new Set(gates.map((g) => g.step));
      let step = preferredStep;
      while (occupiedSteps.has(step)) {
        step++;
      }
      return step;
    },
    []
  );

  const findBestPlacement = useCallback(
    (gateType: 'X' | 'CX' | 'CCX' | 'ECA57', targetQubit: number) => {
      switch (gateType) {
        case 'X':
          return { target: targetQubit, controls: [] };
        case 'CX':
          const cxControl = targetQubit > 0 ? targetQubit - 1 : targetQubit + 1;
          return {
            target: targetQubit,
            controls: [Math.min(cxControl, circuit.width - 1)],
          };
        case 'CCX':
        case 'ECA57':
          const available = Array.from({ length: circuit.width }, (_, i) => i)
            .filter((q) => q !== targetQubit)
            .sort(
              (a, b) => Math.abs(a - targetQubit) - Math.abs(b - targetQubit)
            );
          return { target: targetQubit, controls: available.slice(0, 2) };
        default:
          return { target: targetQubit, controls: [] };
      }
    },
    [circuit.width]
  );

  const handleGateDrop = useCallback(
    (
      gateType: 'X' | 'CX' | 'CCX' | 'ECA57',
      step: number,
      targetQubit: number
    ) => {
      const placement = findBestPlacement(gateType, targetQubit);

      const newGate: PlaygroundGate = {
        id: `gate-${Date.now()}-${Math.random()}`,
        type: gateType,
        step: step,
        target: placement.target,
        controls: placement.controls,
      };

      setCircuit((prev) => {
        // Check if step is occupied
        const existingGate = prev.gates.find((g) => g.step === step);

        let updatedGates;
        if (existingGate) {
          // Push all gates at this step and after to the right
          updatedGates = prev.gates.map((g) =>
            g.step >= step ? { ...g, step: g.step + 1 } : g
          );
          updatedGates.push(newGate);
        } else {
          updatedGates = [...prev.gates, newGate];
        }

        const maxStep = Math.max(...updatedGates.map((g) => g.step));

        return {
          ...prev,
          gates: updatedGates,
          length: Math.max(prev.length, maxStep + 2),
        };
      });
    },
    [findBestPlacement]
  );

  // Manual 3-click placement mode handler
  const handleManualPlacement = useCallback(
    (step: number, qubit: number) => {
      if (placementMode !== 'manual' || selectedTool !== 'ECA57') {
        // Fall back to auto mode
        if (selectedTool) {
          handleGateDrop(selectedTool, step, qubit);
        }
        return;
      }

      if (!pendingPlacement) {
        // First click: set target
        setPendingPlacement({ step, target: qubit });
      } else if (
        pendingPlacement.target !== undefined &&
        pendingPlacement.ctrl1 === undefined
      ) {
        // Second click: set +ctrl (must be different from target)
        if (qubit === pendingPlacement.target) {
          // Can't use same wire, ignore
          return;
        }
        setPendingPlacement({ ...pendingPlacement, ctrl1: qubit });
      } else if (
        pendingPlacement.target !== undefined &&
        pendingPlacement.ctrl1 !== undefined
      ) {
        // Third click: set ¬ctrl and create gate
        if (
          qubit === pendingPlacement.target ||
          qubit === pendingPlacement.ctrl1
        ) {
          // Can't use same wire, ignore
          return;
        }

        // Create the gate
        const newGate: PlaygroundGate = {
          id: `gate-${Date.now()}-${Math.random()}`,
          type: 'ECA57',
          step: pendingPlacement.step,
          target: pendingPlacement.target,
          controls: [pendingPlacement.ctrl1, qubit],
        };

        setCircuit((prev) => {
          const existingGate = prev.gates.find(
            (g) => g.step === pendingPlacement.step
          );
          let updatedGates;
          if (existingGate) {
            updatedGates = prev.gates.map((g) =>
              g.step >= pendingPlacement.step ? { ...g, step: g.step + 1 } : g
            );
            updatedGates.push(newGate);
          } else {
            updatedGates = [...prev.gates, newGate];
          }
          const maxStep = Math.max(...updatedGates.map((g) => g.step));
          return {
            ...prev,
            gates: updatedGates,
            length: Math.max(prev.length, maxStep + 2),
          };
        });

        // Reset pending placement
        setPendingPlacement(null);
      }
    },
    [placementMode, selectedTool, pendingPlacement, handleGateDrop]
  );

  // Compute reduced-wire version of selected gates
  const computeReducedGates = useCallback(
    (gates: PlaygroundGate[]): { gates: PlaygroundGate[]; width: number } => {
      if (gates.length === 0) return { gates: [], width: 0 };

      // Find all unique wires used
      const usedWires = new Set<number>();
      gates.forEach((g) => {
        usedWires.add(g.target);
        g.controls.forEach((c) => usedWires.add(c));
      });

      // Create mapping from original wire to reduced wire
      const sortedWires = Array.from(usedWires).sort((a, b) => a - b);
      const wireMap = new Map<number, number>();
      sortedWires.forEach((wire, idx) => wireMap.set(wire, idx));

      // Remap gates
      const reducedGates = gates.map((g) => ({
        ...g,
        target: wireMap.get(g.target)!,
        controls: g.controls.map((c) => wireMap.get(c)!),
      }));

      return { gates: reducedGates, width: sortedWires.length };
    },
    []
  );

  // Selection handlers
  const handleGateSelect = useCallback((gateId: string, shiftKey: boolean) => {
    setSelectedGateIds((prev) => {
      const newSet = new Set(prev);
      if (shiftKey) {
        // Toggle selection
        if (newSet.has(gateId)) {
          newSet.delete(gateId);
        } else {
          newSet.add(gateId);
        }
      } else {
        // Single select
        newSet.clear();
        newSet.add(gateId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedGateIds(new Set(circuit.gates.map((g) => g.id)));
  }, [circuit.gates]);

  const handleClearSelection = useCallback(() => {
    setSelectedGateIds(new Set());
  }, []);

  // Clipboard operations
  const handleCopy = useCallback(() => {
    if (selectedGateIds.size === 0) return;

    const selectedGates = circuit.gates.filter((g) =>
      selectedGateIds.has(g.id)
    );
    const { gates: reducedGates, width: reducedWidth } =
      computeReducedGates(selectedGates);

    setClipboard({
      gates: selectedGates,
      reducedGates,
      sourceWidth: circuit.width,
      reducedWidth,
    });
  }, [selectedGateIds, circuit.gates, circuit.width, computeReducedGates]);

  const handleCut = useCallback(() => {
    handleCopy();
    // Remove selected gates
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => !selectedGateIds.has(g.id)),
    }));
    setSelectedGateIds(new Set());
  }, [handleCopy, selectedGateIds]);

  const handlePaste = useCallback(
    (useReduced: boolean = false) => {
      if (!clipboard) return;

      const gatesToPaste = useReduced
        ? clipboard.reducedGates
        : clipboard.gates;
      const nextStep = Math.max(0, ...circuit.gates.map((g) => g.step)) + 1;

      // Renumber steps and generate new IDs
      const minStep = Math.min(...gatesToPaste.map((g) => g.step));
      const newGates = gatesToPaste.map((g, i) => ({
        ...g,
        id: `pasted-${Date.now()}-${i}`,
        step: g.step - minStep + nextStep,
      }));

      setCircuit((prev) => ({
        ...prev,
        gates: [...prev.gates, ...newGates],
        length: Math.max(prev.length, nextStep + gatesToPaste.length + 2),
      }));

      // Select pasted gates
      setSelectedGateIds(new Set(newGates.map((g) => g.id)));
    },
    [clipboard, circuit.gates]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedGateIds.size === 0) return;
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => !selectedGateIds.has(g.id)),
    }));
    setSelectedGateIds(new Set());
  }, [selectedGateIds]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: cancel pending placement or clear selection
      if (e.key === 'Escape') {
        if (pendingPlacement) {
          setPendingPlacement(null);
        } else {
          handleClearSelection();
        }
      }
      // M: Toggle mode
      if (e.key === 'm' || e.key === 'M') {
        setPlacementMode((prev) => (prev === 'auto' ? 'manual' : 'auto'));
        setPendingPlacement(null);
      }

      // Check for meta/ctrl (for clipboard shortcuts)
      const isMod = e.metaKey || e.ctrlKey;

      // A: Select all
      if (isMod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectAll();
      }
      // C: Copy
      if (isMod && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopy();
      }
      // X: Cut
      if (isMod && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleCut();
      }
      // V: Paste (Shift+V for reduced version)
      if (isMod && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePaste(e.shiftKey);
      }
      // Delete/Backspace: Delete selected
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedGateIds.size > 0
      ) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pendingPlacement,
    handleClearSelection,
    handleSelectAll,
    handleCopy,
    handleCut,
    handlePaste,
    handleDeleteSelected,
    selectedGateIds,
  ]);

  const handleGateMove = useCallback(
    (gateId: string, newStep: number, newTarget?: number) => {
      setCircuit((prev) => {
        // Find the gate being moved
        const gateToMove = prev.gates.find((g) => g.id === gateId);
        if (!gateToMove) return prev;

        // If target is changing, we need to update controls too
        const actualTarget = newTarget ?? gateToMove.target;
        let newControls = [...gateToMove.controls];

        // If target changed to a qubit that's a control, swap them
        if (newTarget !== undefined && newTarget !== gateToMove.target) {
          newControls = gateToMove.controls.filter((c) => c !== newTarget);
          // If we removed a control, add the old target as a control
          if (newControls.length < gateToMove.controls.length) {
            newControls.push(gateToMove.target);
          }
        }

        // Check if new step is occupied by another gate
        const existingGate = prev.gates.find(
          (g) => g.id !== gateId && g.step === newStep
        );

        let updatedGates;
        if (existingGate) {
          // Push all gates at this step and after to the right (except the one being moved)
          updatedGates = prev.gates.map((g) => {
            if (g.id === gateId) {
              return {
                ...g,
                step: newStep,
                target: actualTarget,
                controls: newControls,
              };
            } else if (g.step >= newStep) {
              return { ...g, step: g.step + 1 };
            }
            return g;
          });
        } else {
          updatedGates = prev.gates.map((g) =>
            g.id === gateId
              ? {
                  ...g,
                  step: newStep,
                  target: actualTarget,
                  controls: newControls,
                }
              : g
          );
        }

        const maxStep = Math.max(...updatedGates.map((g) => g.step));

        return {
          ...prev,
          gates: updatedGates,
          length: Math.max(prev.length, maxStep + 2),
        };
      });
    },
    []
  );

  const handleGateRemove = useCallback((gateId: string) => {
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => g.id !== gateId),
    }));
  }, []);

  const handleControlEdit = useCallback(
    (gateId: string, newControls: number[]) => {
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.map((g) =>
          g.id === gateId ? { ...g, controls: newControls } : g
        ),
      }));
    },
    []
  );

  const handleClear = useCallback(() => {
    setCircuit((prev) => ({ ...prev, gates: [] }));
  }, []);

  // Reorder gates by topological levels (push-left ordering)
  const handleReorder = useCallback(() => {
    setCircuit((prev) => {
      const reordered = getTopologicalOrder(prev.gates);
      return {
        ...prev,
        gates: reordered,
        length: Math.max(prev.length, reordered.length + 2),
      };
    });
  }, []);

  // Add/remove wire - no max limit
  const handleAddLine = useCallback(() => {
    setCircuit((prev) => ({ ...prev, width: prev.width + 1 }));
  }, []);

  const handleDeleteLine = useCallback(() => {
    if (circuit.width <= MIN_WIDTH) return;
    const lineToDelete = circuit.width - 1;
    setCircuit((prev) => {
      // Remove gates that use the deleted line
      const filteredGates = prev.gates.filter(
        (g) => g.target !== lineToDelete && !g.controls.includes(lineToDelete)
      );
      return {
        ...prev,
        width: prev.width - 1,
        gates: filteredGates,
      };
    });
  }, [circuit.width]);

  // Random ECA57 circuit - one gate per step
  // mode: 'random' = random targets, 'allLines' = every line is a target once
  const handleRandomGenerate = useCallback(
    async (mode: 'random' | 'allLines' = 'random') => {
      setIsGenerating(true);
      try {
        let randomGates: PlaygroundGate[] = [];

        if (mode === 'allLines') {
          // Create one gate per line, each line is a target exactly once
          const targets = Array.from({ length: circuit.width }, (_, i) => i);
          // Shuffle targets
          for (let i = targets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [targets[i], targets[j]] = [targets[j], targets[i]];
          }

          for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const available = Array.from(
              { length: circuit.width },
              (_, j) => j
            ).filter((j) => j !== target);
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const controls = shuffled.slice(0, 2);

            randomGates.push({
              id: `random-${Date.now()}-${i}`,
              type: 'ECA57',
              step: i,
              target,
              controls,
            });
          }
        } else {
          // Random mode: random number of gates with random targets
          const numGates = 4 + Math.floor(Math.random() * 6);
          for (let i = 0; i < numGates; i++) {
            const target = Math.floor(Math.random() * circuit.width);
            const available = Array.from(
              { length: circuit.width },
              (_, j) => j
            ).filter((j) => j !== target);
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const controls = shuffled.slice(0, 2);

            randomGates.push({
              id: `random-${Date.now()}-${i}`,
              type: 'ECA57',
              step: i,
              target,
              controls,
            });
          }
        }

        setCircuit((prev) => ({
          ...prev,
          gates: randomGates,
          length: Math.max(prev.length, randomGates.length + 2),
        }));
      } finally {
        setIsGenerating(false);
      }
    },
    [circuit.width]
  );

  // Skeleton graph interactions
  const handleNodeClick = useCallback(
    (gateId: string) => {
      const gate = circuit.gates.find((g) => g.id === gateId);
      if (gate) {
        setHighlightedGateId(gate.id);
        setTimeout(() => setHighlightedGateId(null), 2000);
      }
    },
    [circuit.gates]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full w-full flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Left: Gate Toolbox - narrower */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-800/60 overflow-y-auto p-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="text-green-400">⚡</span>
            ECA57 Gates
          </h2>

          {/* Width controls */}
          <div className="bg-slate-700/40 p-3 rounded-lg mb-4">
            <div className="text-sm text-slate-300 mb-2">
              Circuit Width: {circuit.width}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddLine}
                className="flex-1 px-3 py-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Line
              </button>
              <button
                onClick={handleDeleteLine}
                disabled={circuit.width <= MIN_WIDTH}
                className="flex-1 px-3 py-2 bg-red-600/80 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <Minus className="w-4 h-4" /> Line
              </button>
            </div>
          </div>

          {/* Random generation buttons */}
          <div className="bg-slate-700/40 p-3 rounded-lg mb-4">
            <div className="text-sm text-slate-300 mb-2">Random Circuit</div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRandomGenerate('random')}
                disabled={isGenerating}
                className="flex-1 px-3 py-2 bg-purple-600/80 hover:bg-purple-500 disabled:bg-slate-600 text-white rounded-lg text-sm"
              >
                {isGenerating ? '...' : 'Random'}
              </button>
              <button
                onClick={() => handleRandomGenerate('allLines')}
                disabled={isGenerating}
                className="flex-1 px-3 py-2 bg-green-600/80 hover:bg-green-500 disabled:bg-slate-600 text-white rounded-lg text-sm"
                title="One gate per line, all lines targeted"
              >
                All Lines
              </button>
            </div>
          </div>

          {/* Placement Mode Toggle */}
          <div className="bg-slate-700/40 p-3 rounded-lg mb-4">
            <div className="text-sm text-slate-300 mb-2 flex items-center justify-between">
              <span>Placement Mode</span>
              <span className="text-xs text-slate-500">[M]</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setPlacementMode('auto');
                  setPendingPlacement(null);
                }}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  placementMode === 'auto'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => {
                  setPlacementMode('manual');
                  setPendingPlacement(null);
                }}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  placementMode === 'manual'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600'
                }`}
              >
                3-Click
              </button>
            </div>

            {/* Pending Placement Indicator */}
            {placementMode === 'manual' && (
              <div className="mt-2 p-2 bg-slate-800/60 rounded text-xs">
                {!pendingPlacement ? (
                  <div className="text-slate-400">
                    Click 1: <span className="text-cyan-400">Target ⊕</span>
                  </div>
                ) : pendingPlacement.target !== undefined &&
                  pendingPlacement.ctrl1 === undefined ? (
                  <div className="space-y-1">
                    <div className="text-green-400">
                      ✓ Target: q{pendingPlacement.target}
                    </div>
                    <div className="text-slate-400">
                      Click 2: <span className="text-green-400">+Ctrl ●</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-green-400">
                      ✓ Target: q{pendingPlacement.target}
                    </div>
                    <div className="text-green-400">
                      ✓ +Ctrl: q{pendingPlacement.ctrl1}
                    </div>
                    <div className="text-slate-400">
                      Click 3: <span className="text-red-400">¬Ctrl ○</span>
                    </div>
                  </div>
                )}
                {pendingPlacement && (
                  <button
                    onClick={() => setPendingPlacement(null)}
                    className="mt-1 text-red-400 hover:text-red-300 text-xs"
                  >
                    [Esc] Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleClear}
            className="w-full mt-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg"
          >
            🗑️ Clear Circuit
          </button>
        </div>

        {/* Center: Circuit Canvas - equal flex */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-slate-800/50 border-b border-slate-700/50 p-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">ECA57 Circuit</h1>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 text-sm">
                  Gates: {circuit.gates.length}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isIdentity
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {isIdentity ? '✨ Identity' : 'Non-Identity'}
                </span>
                <button
                  onClick={handleReorder}
                  disabled={circuit.gates.length < 2}
                  className="px-3 py-1 bg-cyan-600/80 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-1"
                  title="Reorder gates by topological levels (push-left)"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Reorder
                </button>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <span>Zoom:</span>
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    −
                  </button>
                  <span className="w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CircuitCanvas
              circuit={circuit}
              onGateDrop={
                placementMode === 'manual'
                  ? (gateType, step, qubit) =>
                      handleManualPlacement(step, qubit)
                  : handleGateDrop
              }
              onGateMove={handleGateMove}
              onGateRemove={handleGateRemove}
              onControlEdit={handleControlEdit}
              selectedTool={selectedTool}
              zoom={zoom}
            />
          </div>
        </div>

        {/* Right: Skeleton Graph - equal width to circuit */}
        <div className="flex-1 border-l border-slate-700/50 bg-slate-800/60 flex flex-col min-w-0">
          <div className="p-3 border-b border-slate-700/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">🔗</span>
              Skeleton Graph
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Edges = colliding gates (can&apos;t swap)
            </p>
          </div>
          <div className="flex-1 p-2 min-h-0">
            <SkeletonGraph
              circuit={circuit}
              highlightedGateId={highlightedGateId}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Permutation Display */}
          <div className="p-3 border-t border-slate-700/50 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <span>📐</span> Permutation
            </h3>

            {/* Cycle Notation - Primary Display */}
            <div
              className={`mb-3 p-2 rounded-lg font-mono text-sm ${
                isIdentity
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-slate-700/50 border border-slate-600/30'
              }`}
            >
              <div className="text-xs text-slate-400 mb-1">Cycle Notation</div>
              <div
                className={`break-all ${
                  isIdentity ? 'text-green-300' : 'text-cyan-300'
                }`}
              >
                {cycleNotation}
              </div>
            </div>

            {/* Truth Table Preview - Secondary */}
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-300 mb-1">
                Truth Table ({permutation.length} entries)
              </summary>
              <div className="grid grid-cols-2 gap-1 font-mono mt-2">
                <div className="text-slate-500 font-bold">In</div>
                <div className="text-slate-500 font-bold">Out</div>
                {permutation.slice(0, 16).map((out, idx) => (
                  <React.Fragment key={idx}>
                    <div className="text-blue-300">
                      {idx.toString(2).padStart(circuit.width, '0')}
                    </div>
                    <div
                      className={
                        idx === out ? 'text-green-300' : 'text-orange-300'
                      }
                    >
                      {out.toString(2).padStart(circuit.width, '0')}
                    </div>
                  </React.Fragment>
                ))}
                {permutation.length > 16 && (
                  <div className="col-span-2 text-slate-500 text-center">
                    ... {permutation.length - 16} more entries
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
