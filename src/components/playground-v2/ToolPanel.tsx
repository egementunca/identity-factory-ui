'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Shuffle,
  ArrowRightLeft,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  MousePointer2,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Dices,
} from 'lucide-react';

interface ToolPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Circuit controls
  width: number;
  onAddLine: () => void;
  onRemoveLine: () => void;
  canRemoveLine: boolean;
  // Actions
  onRandom: () => void;
  onReorder: () => void;
  onClear: () => void;
  // Placement mode
  placementMode: 'auto' | 'manual';
  onSetPlacementMode: (mode: 'auto' | 'manual') => void;
  pendingPlacement: { step: number; target?: number; ctrl1?: number } | null;
  onCancelPending: () => void;
  // Clipboard
  selectedCount: number;
  clipboardCount: number;
  onCopy: () => void;
  onCut: () => void;
  onPaste: (reduced: boolean) => void;
  onDelete: () => void;
  onSelectAll: () => void;
  // Group operations
  isIdentity?: boolean;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onReverse?: () => void;
  onRandomPermute?: () => void;
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  collapsed = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
                flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all
                ${
                  active
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                }
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export default function ToolPanel({
  isCollapsed,
  onToggleCollapse,
  width,
  onAddLine,
  onRemoveLine,
  canRemoveLine,
  onRandom,
  onReorder,
  onClear,
  placementMode,
  onSetPlacementMode,
  pendingPlacement,
  onCancelPending,
  selectedCount,
  clipboardCount,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onSelectAll,
  // Group operations
  isIdentity = false,
  onRotateLeft,
  onRotateRight,
  onReverse,
  onRandomPermute,
}: ToolPanelProps) {
  return (
    <div
      className="flex flex-col h-full border-r transition-all duration-150"
      style={{
        width: isCollapsed
          ? 'var(--sidebar-collapsed)'
          : 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-2 h-8 border-b border-[var(--border-subtle)]">
        {!isCollapsed && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Tools
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          title={isCollapsed ? 'Expand [' : 'Collapse ['}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Wires Section */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
              Wires: {width}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <ToolButton
              icon={Plus}
              label="Add Wire"
              onClick={onAddLine}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={Minus}
              label="Remove Wire"
              onClick={onRemoveLine}
              disabled={!canRemoveLine}
              collapsed={isCollapsed}
            />
          </div>
        </div>

        {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}

        {/* Generate Section */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
              Generate
            </div>
          )}
          <div className="space-y-1">
            <ToolButton
              icon={Shuffle}
              label="Random"
              onClick={onRandom}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={ArrowRightLeft}
              label="Reorder"
              onClick={onReorder}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={Trash2}
              label="Clear"
              onClick={onClear}
              collapsed={isCollapsed}
            />
          </div>
        </div>

        {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}

        {/* Placement Mode */}
        {!isCollapsed && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1 flex items-center justify-between">
              <span>Mode</span>
              <span className="text-[9px] opacity-60">[M]</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onSetPlacementMode('auto')}
                className={`flex-1 px-2 py-1 text-[10px] rounded transition-all ${
                  placementMode === 'auto'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => onSetPlacementMode('manual')}
                className={`flex-1 px-2 py-1 text-[10px] rounded transition-all ${
                  placementMode === 'manual'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
              >
                3-Click
              </button>
            </div>

            {/* Pending placement indicator */}
            {placementMode === 'manual' && (
              <div className="mt-2 p-2 rounded text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                {!pendingPlacement ? (
                  <span className="text-[var(--text-muted)]">1: Target ⊕</span>
                ) : pendingPlacement.ctrl1 === undefined ? (
                  <div className="space-y-0.5">
                    <div className="text-[var(--status-success)]">
                      ✓ t={pendingPlacement.target}
                    </div>
                    <div className="text-[var(--text-muted)]">2: +Ctrl ●</div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-[var(--status-success)]">
                      ✓ t={pendingPlacement.target}, c1={pendingPlacement.ctrl1}
                    </div>
                    <div className="text-[var(--text-muted)]">3: ¬Ctrl ○</div>
                  </div>
                )}
                {pendingPlacement && (
                  <button
                    onClick={onCancelPending}
                    className="mt-1 text-[var(--status-error)] hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}

        {/* Selection/Clipboard */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
              Selection {selectedCount > 0 && `(${selectedCount})`}
            </div>
          )}
          <div className="space-y-1">
            <ToolButton
              icon={MousePointer2}
              label="Select All"
              onClick={onSelectAll}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={Copy}
              label="Copy"
              onClick={onCopy}
              disabled={selectedCount === 0}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={Scissors}
              label="Cut"
              onClick={onCut}
              disabled={selectedCount === 0}
              collapsed={isCollapsed}
            />
            <ToolButton
              icon={ClipboardPaste}
              label="Paste"
              onClick={() => onPaste(false)}
              disabled={clipboardCount === 0}
              collapsed={isCollapsed}
            />
            {clipboardCount > 0 && !isCollapsed && (
              <button
                onClick={() => onPaste(true)}
                className="w-full px-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-left"
              >
                Paste Reduced (⇧V)
              </button>
            )}
          </div>
        </div>

        {/* Group Operations (only for identity circuits) */}
        {isIdentity && (
          <>
            {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}
            <div>
              {!isCollapsed && (
                <div className="text-[10px] uppercase tracking-wider text-[var(--status-identity)] mb-1.5 px-1">
                  ✓ Group Ops
                </div>
              )}
              <div className="space-y-1">
                <div className="flex gap-1">
                  <ToolButton
                    icon={RotateCcw}
                    label="Rotate ←"
                    onClick={onRotateLeft!}
                    collapsed={isCollapsed}
                  />
                  <ToolButton
                    icon={RotateCw}
                    label="Rotate →"
                    onClick={onRotateRight!}
                    collapsed={isCollapsed}
                  />
                </div>
                <ToolButton
                  icon={FlipHorizontal}
                  label="Reverse"
                  onClick={onReverse!}
                  collapsed={isCollapsed}
                />
                <ToolButton
                  icon={Dices}
                  label="Permute Wires"
                  onClick={onRandomPermute!}
                  collapsed={isCollapsed}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
