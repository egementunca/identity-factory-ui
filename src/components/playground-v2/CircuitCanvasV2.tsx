'use client';

import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { PlaygroundCircuit, PlaygroundGate, DragItem } from '@/types/api';

// Drag item types
type MultiGateDragItem = {
  type: 'MULTI_GATE';
  anchorGateId: string;
  gateIds: string[];
  anchorStep: number;
  anchorTarget: number;
};

interface CircuitCanvasV2Props {
  circuit: PlaygroundCircuit;
  onGateDrop: (
    gateType: 'X' | 'CX' | 'CCX' | 'ECA57',
    step: number,
    targetQubit: number
  ) => void;
  onGateMove: (gateId: string, newStep: number, newTarget?: number) => void;
  onGateRemove: (gateId: string) => void;
  onControlEdit: (gateId: string, newControls: number[]) => void;
  selectedTool: 'X' | 'CX' | 'CCX' | 'ECA57' | null;
  interactionMode: 'select' | 'add';
  zoom: number;
  // New: 3-click mode preview
  pendingPlacement?: { step: number; target?: number; ctrl1?: number } | null;
  // New: Selection
  selectedGateIds?: Set<string>;
  onSelectionChange?: (gateIds: Set<string>) => void;
  // New: Multi-gate move
  onMultiGateMove?: (gateIds: string[], deltaStep: number) => void;
  // Edge highlighting (from skeleton graph)
  highlightedEdgeGates?: [string, string] | null;
}

const CELL_WIDTH = 80;
const CELL_HEIGHT = 60;
const LABEL_WIDTH = 60;
const STEP_LABEL_HEIGHT = 30;

// Draggable control dot
function ControlDot({
  gate,
  controlIndex,
  ctrl,
  isInverted,
  relativePos,
  onControlDrag,
}: {
  gate: PlaygroundGate;
  controlIndex: number;
  ctrl: number;
  isInverted: boolean;
  relativePos: number;
  onControlDrag: (
    gateId: string,
    controlIndex: number,
    newQubit: number
  ) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'control',
      item: {
        type: 'CONTROL',
        gateId: gate.id,
        controlIndex,
        originalQubit: ctrl,
      },
      collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    }),
    [gate, controlIndex, ctrl]
  );

  return (
    <div
      ref={drag}
      className={`absolute left-1/2 w-4 h-4 rounded-full transform -translate-x-1/2 border-2 cursor-move transition-opacity ${
        isInverted
          ? 'bg-transparent border-[var(--text-primary)]'
          : 'bg-[var(--text-primary)] border-[var(--text-primary)]'
      } ${isDragging ? 'opacity-30' : ''}`}
      style={{ top: `calc(50% + ${relativePos}px - 8px)` }}
      title={`Drag to move ${isInverted ? '¬ctrl' : '+ctrl'}`}
    />
  );
}

// Gate cell component with draggable gate and control dots
function GateCell({
  gate,
  cellHeight,
  isSelected,
  isEdgeHighlighted,
  selectedGateIds,
  onRemove,
  onSelect,
  onControlDrag,
}: {
  gate: PlaygroundGate;
  cellHeight: number;
  isSelected: boolean;
  isEdgeHighlighted: boolean;
  selectedGateIds: Set<string>;
  onRemove: () => void;
  onSelect: (shiftKey: boolean) => void;
  onControlDrag: (
    gateId: string,
    controlIndex: number,
    newQubit: number
  ) => void;
}) {
  // Include selection info in drag item for multi-gate move
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: 'gate',
      item: (): DragItem & { selectedIds?: string[]; anchorStep?: number } => ({
        type: 'EXISTING_GATE',
        gateId: gate.id,
        gateType: gate.type,
        // Include selected gate IDs if this gate is selected and there are multiple
        selectedIds:
          isSelected && selectedGateIds.size > 1
            ? Array.from(selectedGateIds)
            : undefined,
        anchorStep: gate.step,
      }),
      collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    }),
    [gate, isSelected, selectedGateIds]
  );

  // Calculate control wire heights
  const minQubit = Math.min(gate.target, ...gate.controls);
  const maxQubit = Math.max(gate.target, ...gate.controls);
  const wireHeight = (maxQubit - minQubit) * cellHeight;
  const wireTop = (minQubit - gate.target) * cellHeight;

  return (
    <div
      data-gate="true"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-all ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Vertical control wire */}
      {gate.controls.length > 0 && (
        <div
          className="absolute left-1/2 w-0.5 bg-[var(--text-muted)] pointer-events-none"
          style={{
            top: `calc(50% + ${wireTop}px)`,
            height: `${wireHeight}px`,
            transform: 'translateX(-50%)',
          }}
        />
      )}

      {/* Draggable control dots */}
      {gate.controls.map((ctrl, idx) => {
        const relativePos = (ctrl - gate.target) * cellHeight;
        const isInverted = gate.type === 'ECA57' && idx === 1;
        return (
          <ControlDot
            key={idx}
            gate={gate}
            controlIndex={idx}
            ctrl={ctrl}
            isInverted={isInverted}
            relativePos={relativePos}
            onControlDrag={onControlDrag}
          />
        );
      })}

      {/* Target gate box - drag handle */}
      <div
        ref={drag}
        className={`
                    relative w-10 h-10 rounded border-2 flex items-center justify-center font-bold text-lg cursor-move
                    ${
                      isEdgeHighlighted
                        ? 'border-yellow-400 bg-yellow-400/30 text-yellow-300 ring-2 ring-yellow-400/50'
                        : isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                          : 'border-[var(--gate-eca57)] bg-[var(--gate-eca57-bg)] text-[var(--gate-eca57)]'
                    }
                `}
      >
        ⊕{/* Edge highlight indicator */}
        {isEdgeHighlighted && (
          <div className="absolute -top-2 -left-2 text-yellow-400 text-sm">
            ⚡
          </div>
        )}
        {/* Multi-select indicator */}
        {isSelected && selectedGateIds.size > 1 && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-[var(--accent-primary)] rounded-full text-white text-[8px] flex items-center justify-center">
            {selectedGateIds.size}
          </div>
        )}
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-4 h-4 bg-[var(--status-error)] rounded-full text-white text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function DropCell({
  step,
  qubit,
  gate,
  cellHeight,
  selectedTool,
  interactionMode,
  onDrop,
  onControlDrop,
  onClick,
  pendingPlacement,
  isSelected,
  isEdgeHighlighted,
  selectedGateIds,
  onGateRemove,
  onGateSelect,
  onControlDrag,
}: {
  step: number;
  qubit: number;
  gate: PlaygroundGate | null;
  cellHeight: number;
  selectedTool: 'X' | 'CX' | 'CCX' | 'ECA57' | null;
  interactionMode: 'select' | 'add';
  onDrop: (
    item: DragItem & { selectedIds?: string[]; anchorStep?: number },
    step: number,
    qubit: number
  ) => void;
  onControlDrop: (
    gateId: string,
    controlIndex: number,
    newQubit: number
  ) => void;
  onClick: () => void;
  pendingPlacement?: { step: number; target?: number; ctrl1?: number } | null;
  isSelected: boolean;
  isEdgeHighlighted: boolean;
  selectedGateIds: Set<string>;
  onGateRemove: (gateId: string) => void;
  onGateSelect: (gateId: string, shiftKey: boolean) => void;
  onControlDrag: (
    gateId: string,
    controlIndex: number,
    newQubit: number
  ) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: ['gate', 'control'],
      drop: (item: any) => {
        if (item.type === 'CONTROL') {
          onControlDrop(item.gateId, item.controlIndex, qubit);
        } else {
          onDrop(item, step, qubit);
        }
      },
      canDrop: (item: any) => {
        // Controls can drop anywhere (will validate in handler)
        if (item.type === 'CONTROL') return true;
        // Gates can drop anywhere (will shift or reject in handler)
        return true;
      },
      collect: (monitor: any) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [step, qubit, gate, onDrop, onControlDrop]
  );

  // Determine preview for 3-click mode
  const isPendingTarget =
    pendingPlacement?.step === step && pendingPlacement?.target === qubit;
  const isPendingCtrl1 =
    pendingPlacement?.step === step && pendingPlacement?.ctrl1 === qubit;
  const isPendingStep = pendingPlacement?.step === step;
  const canBeCtrl =
    isPendingStep &&
    pendingPlacement?.target !== undefined &&
    pendingPlacement?.target !== qubit &&
    pendingPlacement?.ctrl1 !== qubit;

  return (
    <div
      ref={drop}
      onClick={onClick}
      className="relative border-r border-b transition-colors"
      style={{
        width: CELL_WIDTH,
        height: cellHeight,
        borderColor: 'var(--border-subtle)',
        background:
          isOver && canDrop
            ? 'var(--accent-muted)'
            : isPendingTarget || isPendingCtrl1
              ? 'var(--accent-muted)'
              : canBeCtrl
                ? 'var(--bg-elevated)'
                : 'transparent',
      }}
    >
      {/* Quantum wire line */}
      <div
        className="absolute inset-0 flex items-center pointer-events-none"
        style={{ paddingLeft: '0', paddingRight: '0' }}
      >
        <div className="w-full h-px bg-[var(--border-default)]" />
      </div>

      {/* Pending placement preview */}
      {isPendingTarget && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded border-2 border-dashed border-[var(--accent-primary)] flex items-center justify-center text-[var(--accent-primary)] text-sm">
            ⊕
          </div>
        </div>
      )}
      {isPendingCtrl1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)]" />
        </div>
      )}
      {canBeCtrl && !gate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full border-2 border-dashed border-[var(--text-muted)] opacity-50" />
        </div>
      )}

      {/* Actual gate */}
      {gate && gate.target === qubit && (
        <GateCell
          gate={gate}
          cellHeight={cellHeight}
          isSelected={isSelected}
          isEdgeHighlighted={isEdgeHighlighted}
          selectedGateIds={selectedGateIds}
          onRemove={() => onGateRemove(gate.id)}
          onSelect={(shiftKey) => onGateSelect(gate.id, shiftKey)}
          onControlDrag={onControlDrag}
        />
      )}

      {/* Hover hint for empty cell */}
      {!gate && selectedTool && interactionMode === 'add' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-50 pointer-events-none">
          <div className="w-6 h-6 rounded border border-[var(--text-muted)] text-[var(--text-muted)] flex items-center justify-center text-xs">
            +
          </div>
        </div>
      )}
    </div>
  );
}

export default function CircuitCanvasV2({
  circuit,
  onGateDrop,
  onGateMove,
  onGateRemove,
  onControlEdit,
  selectedTool,
  interactionMode,
  zoom,
  pendingPlacement,
  selectedGateIds = new Set(),
  onSelectionChange,
  onMultiGateMove,
  highlightedEdgeGates,
}: CircuitCanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

  const cellHeight = CELL_HEIGHT;

  // Build gate grid
  const gateGrid = useMemo(() => {
    const grid: (PlaygroundGate | null)[][] = Array(circuit.width)
      .fill(null)
      .map(() => Array(circuit.length).fill(null));
    circuit.gates.forEach((gate) => {
      if (gate.step < circuit.length && gate.target < circuit.width) {
        grid[gate.target][gate.step] = gate;
      }
    });
    return grid;
  }, [circuit]);

  const handleDrop = useCallback(
    (
      item: DragItem & { selectedIds?: string[]; anchorStep?: number },
      step: number,
      qubit: number
    ) => {
      if (item.type === 'NEW_GATE' && item.gateType) {
        onGateDrop(item.gateType, step, qubit);
      } else if (item.type === 'EXISTING_GATE' && item.gateId) {
        // Check if this is a multi-gate move
        if (
          item.selectedIds &&
          item.selectedIds.length > 1 &&
          item.anchorStep !== undefined &&
          onMultiGateMove
        ) {
          const deltaStep = step - item.anchorStep;
          onMultiGateMove(item.selectedIds, deltaStep);
        } else {
          onGateMove(item.gateId, step, qubit);
        }
      }
    },
    [onGateDrop, onGateMove, onMultiGateMove]
  );

  const handleCellClick = useCallback(
    (step: number, qubit: number) => {
      // In select mode, clicking empty cell might clear selection (handled by container click possibly, but let's ensure we don't drop).
      if (interactionMode === 'select') return;

      if (!selectedTool) return;
      const gate = gateGrid[qubit]?.[step];
      if (!gate) {
        onGateDrop(selectedTool, step, qubit);
      }
    },
    [selectedTool, gateGrid, onGateDrop]
  );

  const handleGateSelect = useCallback(
    (gateId: string, shiftKey: boolean) => {
      if (!onSelectionChange) return;
      const newSet = new Set(shiftKey ? selectedGateIds : []);
      if (newSet.has(gateId)) {
        newSet.delete(gateId);
      } else {
        newSet.add(gateId);
      }
      onSelectionChange(newSet);
    },
    [selectedGateIds, onSelectionChange]
  );

  // Handle control dot drag to new qubit
  const handleControlDrag = useCallback(
    (gateId: string, controlIndex: number, newQubit: number) => {
      const gate = circuit.gates.find((g) => g.id === gateId);
      if (!gate) return;

      // Don't allow dropping on target or same control
      if (newQubit === gate.target) return;
      const otherControlIndex = controlIndex === 0 ? 1 : 0;
      if (gate.controls[otherControlIndex] === newQubit) return;

      const newControls = [...gate.controls];
      newControls[controlIndex] = newQubit;
      onControlEdit(gateId, newControls);
    },
    [circuit.gates, onControlEdit]
  );

  // Marquee selection handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    
    // Add scroll offset to coordinates
    const x = e.clientX - rect.left + scrollLeft;
    const y = e.clientY - rect.top + scrollTop;
    
    // Only start marquee if not clicking on a gate
    if ((e.target as HTMLElement).closest('[data-gate]')) return;
    setMarquee({ startX: x, startY: y, endX: x, endY: y });
    setIsMarqueeSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMarqueeSelecting || !marquee || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    
    setMarquee((prev) =>
      prev
        ? { 
            ...prev, 
            endX: e.clientX - rect.left + scrollLeft, 
            endY: e.clientY - rect.top + scrollTop 
          }
        : null
    );
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMarqueeSelecting || !marquee || !onSelectionChange) {
      setMarquee(null);
      setIsMarqueeSelecting(false);
      return;
    }

    // Calculate drag distance
    const dist = Math.sqrt(
      Math.pow(marquee.endX - marquee.startX, 2) +
      Math.pow(marquee.endY - marquee.startY, 2)
    );

    // If drag is very small, treat as click -> Deselect All
    if (dist < 5) {
      onSelectionChange(new Set());
      setMarquee(null);
      setIsMarqueeSelecting(false);
      return;
    }

    // Calculate selection box in cell coordinates
    const minX = Math.min(marquee.startX, marquee.endX);
    const maxX = Math.max(marquee.startX, marquee.endX);

    // Account for labels offset
    const gridOffsetX = LABEL_WIDTH;

    const startStep = Math.floor((minX - gridOffsetX) / (CELL_WIDTH * zoom));
    const endStep = Math.floor((maxX - gridOffsetX) / (CELL_WIDTH * zoom));

    // Select ALL gates within the step range (for contiguous subcircuit selection)
    // This includes gates whose target or controls touch the selection
    const selected = new Set<string>();
    circuit.gates.forEach((gate) => {
      if (gate.step >= startStep && gate.step <= endStep) {
        selected.add(gate.id);
      }
    });

    onSelectionChange(selected);
    setMarquee(null);
    setIsMarqueeSelecting(false);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto relative select-none"
      style={{ background: 'var(--bg-tertiary)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={(e) => handleMouseUp(e as any)}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          minWidth: LABEL_WIDTH + circuit.length * CELL_WIDTH,
          minHeight: STEP_LABEL_HEIGHT + circuit.width * cellHeight,
        }}
      >
        {/* Step labels row */}
        <div className="flex" style={{ marginLeft: LABEL_WIDTH }}>
          {Array.from({ length: circuit.length }, (_, step) => (
            <div
              key={step}
              className="flex items-center justify-center text-[10px] font-mono text-[var(--text-muted)] border-b"
              style={{
                width: CELL_WIDTH,
                height: STEP_LABEL_HEIGHT,
                borderColor: 'var(--border-subtle)',
              }}
            >
              t{step}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: circuit.width }, (_, qubit) => (
          <div key={qubit} className="flex">
            {/* Wire label */}
            <div
              className="flex items-center justify-center text-xs font-mono text-[var(--text-secondary)] border-r border-b flex-shrink-0"
              style={{
                width: LABEL_WIDTH,
                height: cellHeight,
                borderColor: 'var(--border-subtle)',
              }}
            >
              q{qubit}
            </div>

            {/* Cells */}
            {Array.from({ length: circuit.length }, (_, step) => {
              const gate = gateGrid[qubit][step];
              const isGateTarget = gate?.target === qubit;
              const isEdge =
                gate &&
                highlightedEdgeGates &&
                (gate.id === highlightedEdgeGates[0] ||
                  gate.id === highlightedEdgeGates[1]);
              return (
                <DropCell
                  key={step}
                  step={step}
                  qubit={qubit}
                  gate={isGateTarget ? gate : null}
                  cellHeight={cellHeight}
                  selectedTool={selectedTool}
                  interactionMode={interactionMode}
                  onDrop={handleDrop}
                  onControlDrop={handleControlDrag}
                  onClick={() => handleCellClick(step, qubit)}
                  pendingPlacement={pendingPlacement}
                  isSelected={gate ? selectedGateIds.has(gate.id) : false}
                  isEdgeHighlighted={!!isEdge}
                  selectedGateIds={selectedGateIds}
                  onGateRemove={onGateRemove}
                  onGateSelect={handleGateSelect}
                  onControlDrag={handleControlDrag}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Marquee selection box - thinner, lower opacity */}
      {marquee && isMarqueeSelecting && (
        <div
          className="absolute border border-dashed border-[var(--accent-primary)] pointer-events-none"
          style={{
            left: Math.min(marquee.startX, marquee.endX),
            top: Math.min(marquee.startY, marquee.endY),
            width: Math.abs(marquee.endX - marquee.startX),
            height: Math.abs(marquee.endY - marquee.startY),
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
          }}
        />
      )}
    </div>
  );
}
