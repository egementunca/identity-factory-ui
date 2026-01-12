'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import './tokens.css';
import TabBar, { CircuitTabData } from './TabBar';
import ToolPanel from './ToolPanel';
import RightPanel from './RightPanel';
import StatusBar from './StatusBar';
import CircuitCanvasV2 from './CircuitCanvasV2';
import { PlaygroundCircuit, PlaygroundGate } from '@/types/api';

const INITIAL_WIDTH = 4;
const INITIAL_LENGTH = 12;
const MIN_WIDTH = 3;

interface CircuitState {
  circuit: PlaygroundCircuit;
  selectedGateIds: Set<string>;
}

function createEmptyCircuit(): PlaygroundCircuit {
  return {
    width: INITIAL_WIDTH,
    length: INITIAL_LENGTH,
    gates: [],
  };
}

// Gate collision detection (ECA57: collide if one's target is in other's controls)
function gatesCollide(g1: PlaygroundGate, g2: PlaygroundGate): boolean {
  return g2.controls.includes(g1.target) || g1.controls.includes(g2.target);
}

// Topological ordering
function getTopologicalOrder(gates: PlaygroundGate[]): PlaygroundGate[] {
  const n = gates.length;
  if (n === 0) return [];

  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (gatesCollide(gates[i], gates[j])) {
        edges.push([i, j]);
      }
    }
  }

  const inDegree = new Array(n).fill(0);
  const adjList: number[][] = Array.from({ length: n }, () => []);
  for (const [src, dst] of edges) {
    adjList[src].push(dst);
    inDegree[dst]++;
  }

  const result: number[] = [];
  const queue: number[] = [];

  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  while (queue.length > 0) {
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

  return result.map((oldIdx, newStep) => ({
    ...gates[oldIdx],
    step: newStep,
  }));
}

export default function PlaygroundPro() {
  // Multi-tab state
  const [tabs, setTabs] = useState<CircuitTabData[]>([
    { id: 'tab-1', name: 'Circuit 1', isModified: false },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [circuitStates, setCircuitStates] = useState<Map<string, CircuitState>>(
    new Map([
      ['tab-1', { circuit: createEmptyCircuit(), selectedGateIds: new Set() }],
    ])
  );

  // Current tab's state
  const currentState = circuitStates.get(activeTabId) || {
    circuit: createEmptyCircuit(),
    selectedGateIds: new Set(),
  };
  const circuit = currentState.circuit;
  const selectedGateIds = currentState.selectedGateIds;

  // UI state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [highlightedGateId, setHighlightedGateId] = useState<string | null>(
    null
  );
  const [highlightedEdgeGates, setHighlightedEdgeGates] = useState<
    [string, string] | null
  >(null);
  const [placementMode, setPlacementMode] = useState<'auto' | 'manual'>('auto');
  const [pendingPlacement, setPendingPlacement] = useState<{
    step: number;
    target?: number;
    ctrl1?: number;
  } | null>(null);
  const [clipboard, setClipboard] = useState<{
    gates: PlaygroundGate[];
    reducedGates: PlaygroundGate[];
    reducedWidth: number;
  } | null>(null);
  const [zoom] = useState(0.85);

  // Helper to update current circuit
  const setCircuit = useCallback(
    (updater: (prev: PlaygroundCircuit) => PlaygroundCircuit) => {
      setCircuitStates((prev) => {
        const current = prev.get(activeTabId);
        if (!current) return prev;
        const newMap = new Map(prev);
        newMap.set(activeTabId, {
          ...current,
          circuit: updater(current.circuit),
        });
        return newMap;
      });
      // Mark tab as modified
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isModified: true } : t))
      );
    },
    [activeTabId]
  );

  const setSelectedGateIds = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setCircuitStates((prev) => {
        const current = prev.get(activeTabId);
        if (!current) return prev;
        const newMap = new Map(prev);
        newMap.set(activeTabId, {
          ...current,
          selectedGateIds: updater(current.selectedGateIds),
        });
        return newMap;
      });
    },
    [activeTabId]
  );

  // Compute permutation and cycle notation
  const { permutation, isIdentity, cycleNotation } = useMemo(() => {
    const width = circuit.width;
    const numStates = 1 << width;
    let perm = Array.from({ length: numStates }, (_, i) => i);

    const sortedGates = [...circuit.gates].sort((a, b) => a.step - b.step);

    for (const gate of sortedGates) {
      const newPerm = [...perm];
      for (let state = 0; state < numStates; state++) {
        let newState = perm[state];
        if (gate.type === 'ECA57') {
          const ctrl1Set = !!(newState & (1 << gate.controls[0]));
          const ctrl2Set = !!(newState & (1 << gate.controls[1]));
          if (ctrl1Set || !ctrl2Set) {
            newState ^= 1 << gate.target;
          }
        }
        newPerm[state] = newState;
      }
      perm = newPerm;
    }

    // Cycle notation
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
      if (cycle.length > 1) cycles.push(cycle);
    }
    const cycleStr =
      cycles.length === 0
        ? '()'
        : cycles.map((c) => `(${c.join(' ')})`).join('');

    return {
      permutation: perm,
      isIdentity: perm.every((val, idx) => val === idx),
      cycleNotation: cycleStr,
    };
  }, [circuit]);

  // Tab management
  const handleTabNew = useCallback(() => {
    const newId = `tab-${Date.now()}`;
    const newName = `Circuit ${tabs.length + 1}`;
    setTabs((prev) => [
      ...prev,
      { id: newId, name: newName, isModified: false },
    ]);
    setCircuitStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(newId, {
        circuit: createEmptyCircuit(),
        selectedGateIds: new Set(),
      });
      return newMap;
    });
    setActiveTabId(newId);
  }, [tabs.length]);

  const handleTabClose = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) return;
      const idx = tabs.findIndex((t) => t.id === tabId);
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      setCircuitStates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(tabId);
        return newMap;
      });
      if (activeTabId === tabId) {
        const newIdx = Math.max(0, idx - 1);
        setActiveTabId(
          tabs.filter((t) => t.id !== tabId)[newIdx]?.id || tabs[0].id
        );
      }
    },
    [tabs, activeTabId]
  );

  const handleTabRename = useCallback((tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, name: newName } : t))
    );
  }, []);

  // Gate placement
  const findBestPlacement = useCallback(
    (targetQubit: number) => {
      const available = Array.from({ length: circuit.width }, (_, i) => i)
        .filter((q) => q !== targetQubit)
        .sort((a, b) => Math.abs(a - targetQubit) - Math.abs(b - targetQubit));
      return { target: targetQubit, controls: available.slice(0, 2) };
    },
    [circuit.width]
  );

  const handleGateDrop = useCallback(
    (
      gateType: 'X' | 'CX' | 'CCX' | 'ECA57',
      step: number,
      targetQubit: number
    ) => {
      if (placementMode === 'manual' && gateType === 'ECA57') {
        // 3-click mode
        if (!pendingPlacement) {
          setPendingPlacement({ step, target: targetQubit });
        } else if (pendingPlacement.ctrl1 === undefined) {
          if (targetQubit !== pendingPlacement.target) {
            setPendingPlacement({ ...pendingPlacement, ctrl1: targetQubit });
          }
        } else {
          if (
            targetQubit !== pendingPlacement.target &&
            targetQubit !== pendingPlacement.ctrl1
          ) {
            const newGate: PlaygroundGate = {
              id: `gate-${Date.now()}-${Math.random()}`,
              type: 'ECA57',
              step: pendingPlacement.step,
              target: pendingPlacement.target!,
              controls: [pendingPlacement.ctrl1, targetQubit],
            };
            setCircuit((prev) => {
              // Check if step is occupied, push others right
              const existingGate = prev.gates.find(
                (g) => g.step === pendingPlacement.step
              );
              let gates = prev.gates;
              if (existingGate) {
                gates = gates.map((g) =>
                  g.step >= pendingPlacement.step
                    ? { ...g, step: g.step + 1 }
                    : g
                );
              }
              return {
                ...prev,
                gates: [...gates, newGate],
                length: Math.max(prev.length, pendingPlacement.step + 3),
              };
            });
            setPendingPlacement(null);
          }
        }
        return;
      }

      // Auto mode - find next available step or push gates
      const placement = findBestPlacement(targetQubit);
      const newGate: PlaygroundGate = {
        id: `gate-${Date.now()}-${Math.random()}`,
        type: gateType,
        step,
        target: placement.target,
        controls: placement.controls,
      };
      setCircuit((prev) => {
        // Check if step is occupied
        const existingGate = prev.gates.find((g) => g.step === step);
        let gates = prev.gates;
        if (existingGate) {
          // Push all gates at this step and after to the right
          gates = gates.map((g) =>
            g.step >= step ? { ...g, step: g.step + 1 } : g
          );
        }
        return {
          ...prev,
          gates: [...gates, newGate],
          length: Math.max(prev.length, step + 3),
        };
      });
    },
    [placementMode, pendingPlacement, findBestPlacement, setCircuit]
  );

  // Gate operations
  const handleGateMove = useCallback(
    (gateId: string, newStep: number, newTarget?: number) => {
      setCircuit((prev) => {
        const gate = prev.gates.find((g) => g.id === gateId);
        if (!gate) return prev;

        // Prevent target from landing on its own controls
        const finalTarget = newTarget ?? gate.target;
        if (gate.controls.includes(finalTarget)) {
          return prev; // Reject move - target can't be on its own control
        }

        // Check if destination step is occupied by another gate
        const hasOtherGateAtStep = prev.gates.some(
          (g) => g.id !== gateId && g.step === newStep
        );

        // If occupied, shift all gates at newStep and beyond to the right
        let updatedGates = prev.gates;
        if (hasOtherGateAtStep) {
          updatedGates = prev.gates.map((g) => {
            if (g.id === gateId) return g; // Don't shift the gate being moved
            if (g.step >= newStep) {
              return { ...g, step: g.step + 1 };
            }
            return g;
          });
        }

        // Now update the moved gate
        updatedGates = updatedGates.map((g) =>
          g.id === gateId ? { ...g, step: newStep, target: finalTarget } : g
        );

        const maxStep = Math.max(...updatedGates.map((g) => g.step));

        return {
          ...prev,
          gates: updatedGates,
          length: Math.max(prev.length, maxStep + 3),
        };
      });
    },
    [setCircuit]
  );

  const handleGateRemove = useCallback(
    (gateId: string) => {
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.filter((g) => g.id !== gateId),
      }));
    },
    [setCircuit]
  );

  const handleControlEdit = useCallback(
    (gateId: string, newControls: number[]) => {
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.map((g) =>
          g.id === gateId ? { ...g, controls: newControls } : g
        ),
      }));
    },
    [setCircuit]
  );

  // Multi-gate move - shift all selected gates by deltaStep
  // Also shift non-selected gates that would collide
  const handleMultiGateMove = useCallback(
    (gateIds: string[], deltaStep: number) => {
      if (deltaStep === 0) return;

      setCircuit((prev) => {
        const selectedGates = new Set(gateIds);
        let updatedGates = [...prev.gates];

        // Calculate new steps for selected gates
        const newSelectedSteps = new Set<number>();
        updatedGates.forEach((g) => {
          if (selectedGates.has(g.id)) {
            newSelectedSteps.add(Math.max(0, g.step + deltaStep));
          }
        });

        // Find the min new step from the selection
        const minNewStep = Math.min(...newSelectedSteps);

        // Shift non-selected gates that would collide
        updatedGates = updatedGates.map((g) => {
          if (selectedGates.has(g.id)) {
            // Move the selected gate
            return { ...g, step: Math.max(0, g.step + deltaStep) };
          } else if (newSelectedSteps.has(g.step)) {
            // Non-selected gate at a collision step - shift right
            // Find a safe step by going right until no collision
            let shiftAmount = Math.abs(deltaStep);
            return { ...g, step: g.step + shiftAmount };
          }
          return g;
        });

        const maxStep = Math.max(...updatedGates.map((g) => g.step));

        return {
          ...prev,
          gates: updatedGates,
          length: Math.max(prev.length, maxStep + 3),
        };
      });
    },
    [setCircuit]
  );

  // Tool actions
  const handleAddLine = useCallback(() => {
    setCircuit((prev) => ({ ...prev, width: prev.width + 1 }));
  }, [setCircuit]);

  const handleRemoveLine = useCallback(() => {
    setCircuit((prev) =>
      prev.width > MIN_WIDTH ? { ...prev, width: prev.width - 1 } : prev
    );
  }, [setCircuit]);

  const handleRandom = useCallback(() => {
    const numGates = 4 + Math.floor(Math.random() * 6);
    const randomGates: PlaygroundGate[] = [];
    for (let i = 0; i < numGates; i++) {
      const target = Math.floor(Math.random() * circuit.width);
      const available = Array.from(
        { length: circuit.width },
        (_, j) => j
      ).filter((j) => j !== target);
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      randomGates.push({
        id: `random-${Date.now()}-${i}`,
        type: 'ECA57',
        step: i,
        target,
        controls: shuffled.slice(0, 2),
      });
    }
    setCircuit((prev) => ({
      ...prev,
      gates: randomGates,
      length: Math.max(prev.length, numGates + 2),
    }));
  }, [circuit.width, setCircuit]);

  const handleReorder = useCallback(() => {
    setCircuit((prev) => {
      const reordered = getTopologicalOrder(prev.gates);
      return {
        ...prev,
        gates: reordered,
        length: Math.max(prev.length, reordered.length + 2),
      };
    });
  }, [setCircuit]);

  const handleClear = useCallback(() => {
    setCircuit((prev) => ({ ...prev, gates: [] }));
    setSelectedGateIds(() => new Set());
  }, [setCircuit, setSelectedGateIds]);

  // === GROUP OPERATIONS (for identity circuits) ===

  // Rotate: shift all gate steps circularly by n
  const handleRotate = useCallback(
    (n: number) => {
      if (circuit.gates.length === 0) return;
      const len = circuit.gates.length;
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.map((g) => ({
          ...g,
          step: (((g.step + n) % len) + len) % len, // Handle negative rotation
        })),
      }));
    },
    [circuit.gates.length, setCircuit]
  );

  // Reverse: reverse gate order
  const handleReverse = useCallback(() => {
    if (circuit.gates.length === 0) return;
    const maxStep = Math.max(...circuit.gates.map((g) => g.step));
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.map((g) => ({
        ...g,
        step: maxStep - g.step,
      })),
    }));
  }, [circuit.gates, setCircuit]);

  // Permute wires: relabel all wire indices according to a permutation
  const handlePermuteWires = useCallback(
    (permutation: number[]) => {
      // permutation[oldWire] = newWire
      if (permutation.length !== circuit.width) return;
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.map((g) => ({
          ...g,
          target: permutation[g.target],
          controls: g.controls.map((c) => permutation[c]),
        })),
      }));
    },
    [circuit.width, setCircuit]
  );

  // Random wire permutation
  const handleRandomPermute = useCallback(() => {
    const perm = Array.from({ length: circuit.width }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    handlePermuteWires(perm);
  }, [circuit.width, handlePermuteWires]);

  // Selection & clipboard
  const computeReducedGates = useCallback((gates: PlaygroundGate[]) => {
    if (gates.length === 0) return { gates: [], width: 0 };
    const usedWires = new Set<number>();
    gates.forEach((g) => {
      usedWires.add(g.target);
      g.controls.forEach((c) => usedWires.add(c));
    });
    const sortedWires = Array.from(usedWires).sort((a, b) => a - b);
    const wireMap = new Map<number, number>();
    sortedWires.forEach((wire, idx) => wireMap.set(wire, idx));
    const reducedGates = gates.map((g) => ({
      ...g,
      target: wireMap.get(g.target)!,
      controls: g.controls.map((c) => wireMap.get(c)!),
    }));
    return { gates: reducedGates, width: sortedWires.length };
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedGateIds(() => new Set(circuit.gates.map((g) => g.id)));
  }, [circuit.gates, setSelectedGateIds]);

  const handleCopy = useCallback(() => {
    if (selectedGateIds.size === 0) return;
    const selectedGates = circuit.gates.filter((g) =>
      selectedGateIds.has(g.id)
    );
    const { gates: reducedGates, width: reducedWidth } =
      computeReducedGates(selectedGates);
    setClipboard({ gates: selectedGates, reducedGates, reducedWidth });
  }, [selectedGateIds, circuit.gates, computeReducedGates]);

  const handleCut = useCallback(() => {
    handleCopy();
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => !selectedGateIds.has(g.id)),
    }));
    setSelectedGateIds(() => new Set());
  }, [handleCopy, selectedGateIds, setCircuit, setSelectedGateIds]);

  const handlePaste = useCallback(
    (useReduced: boolean) => {
      if (!clipboard) return;
      const gatesToPaste = useReduced
        ? clipboard.reducedGates
        : clipboard.gates;
      const nextStep = Math.max(0, ...circuit.gates.map((g) => g.step)) + 1;
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
      setSelectedGateIds(() => new Set(newGates.map((g) => g.id)));
    },
    [clipboard, circuit.gates, setCircuit, setSelectedGateIds]
  );

  const handleDelete = useCallback(() => {
    if (selectedGateIds.size === 0) return;
    setCircuit((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => !selectedGateIds.has(g.id)),
    }));
    setSelectedGateIds(() => new Set());
  }, [selectedGateIds, setCircuit, setSelectedGateIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        if (pendingPlacement) setPendingPlacement(null);
        else setSelectedGateIds(() => new Set());
      }
      if (e.key === 'm' || e.key === 'M') {
        setPlacementMode((prev) => (prev === 'auto' ? 'manual' : 'auto'));
        setPendingPlacement(null);
      }
      if (e.key === '[') setLeftPanelCollapsed((prev) => !prev);
      if (e.key === ']') setRightPanelCollapsed((prev) => !prev);

      if (isMod && e.key === 't') {
        e.preventDefault();
        handleTabNew();
      }
      if (isMod && e.key === 'w') {
        e.preventDefault();
        handleTabClose(activeTabId);
      }
      if (isMod && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      if (isMod && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      if (isMod && e.key === 'x') {
        e.preventDefault();
        handleCut();
      }
      if (isMod && e.key === 'v') {
        e.preventDefault();
        handlePaste(e.shiftKey);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGateIds.size > 0) {
          e.preventDefault();
          handleDelete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pendingPlacement,
    selectedGateIds,
    activeTabId,
    handleTabNew,
    handleTabClose,
    handleSelectAll,
    handleCopy,
    handleCut,
    handlePaste,
    handleDelete,
    setSelectedGateIds,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex flex-col h-screen w-full overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleTabClose}
          onTabNew={handleTabNew}
          onTabRename={handleTabRename}
        />

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Tool Panel */}
          <ToolPanel
            isCollapsed={leftPanelCollapsed}
            onToggleCollapse={() => setLeftPanelCollapsed((prev) => !prev)}
            width={circuit.width}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            canRemoveLine={circuit.width > MIN_WIDTH}
            onRandom={handleRandom}
            onReorder={handleReorder}
            onClear={handleClear}
            placementMode={placementMode}
            onSetPlacementMode={setPlacementMode}
            pendingPlacement={pendingPlacement}
            onCancelPending={() => setPendingPlacement(null)}
            selectedCount={selectedGateIds.size}
            clipboardCount={clipboard?.gates.length || 0}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            onDelete={handleDelete}
            onSelectAll={handleSelectAll}
            // Group operations
            isIdentity={isIdentity}
            onRotateLeft={() => handleRotate(-1)}
            onRotateRight={() => handleRotate(1)}
            onReverse={handleReverse}
            onRandomPermute={handleRandomPermute}
          />

          {/* Canvas */}
          <div
            className="flex-1 overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <CircuitCanvasV2
              circuit={circuit}
              onGateDrop={handleGateDrop}
              onGateMove={handleGateMove}
              onGateRemove={handleGateRemove}
              onControlEdit={handleControlEdit}
              selectedTool="ECA57"
              zoom={zoom}
              pendingPlacement={pendingPlacement}
              selectedGateIds={selectedGateIds}
              onSelectionChange={(ids) => setSelectedGateIds(() => ids)}
              onMultiGateMove={handleMultiGateMove}
              highlightedEdgeGates={highlightedEdgeGates}
            />
          </div>

          {/* Right Panel */}
          <RightPanel
            isCollapsed={rightPanelCollapsed}
            onToggleCollapse={() => setRightPanelCollapsed((prev) => !prev)}
            circuit={circuit}
            highlightedGateId={highlightedGateId}
            onNodeClick={(gateId) => {
              setHighlightedGateId(gateId);
              setHighlightedEdgeGates(null); // Clear edge highlight
            }}
            highlightedEdgeGates={highlightedEdgeGates}
            onEdgeClick={(gate1Id, gate2Id) => {
              setHighlightedEdgeGates([gate1Id, gate2Id]);
              setHighlightedGateId(null); // Clear node highlight
            }}
            cycleNotation={cycleNotation}
            isIdentity={isIdentity}
            permutation={permutation}
          />
        </div>

        {/* Status Bar */}
        <StatusBar
          width={circuit.width}
          gateCount={circuit.gates.length}
          isIdentity={isIdentity}
          selectedCount={selectedGateIds.size}
          clipboardCount={clipboard?.gates.length || 0}
          cycleNotation={cycleNotation}
        />
      </div>
    </DndProvider>
  );
}
