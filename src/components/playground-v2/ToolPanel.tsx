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
  Zap,
  FolderOpen,
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
  // Identity loading
  onLoadLatest?: () => void;
  onBrowseIdentities?: () => void;
  isLoadingIdentity?: boolean;
  // Placement mode
  placementMode: 'auto' | 'manual';
  onSetPlacementMode: (mode: 'auto' | 'manual') => void;
  interactionMode: 'select' | 'add';
  onSetInteractionMode: (mode: 'select' | 'add') => void;
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
  // Skeleton
  onGenerateSkeleton?: (gates: number, chain?: number) => void;
  skeletonGeneratonStatus?: 'idle' | 'generating' | 'success' | 'error';
  skeletonGenerationError?: string;
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
  onLoadLatest,
  onBrowseIdentities,
  isLoadingIdentity = false,
  placementMode,
  onSetPlacementMode,
  interactionMode,
  onSetInteractionMode,
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
  onGenerateSkeleton,
  skeletonGeneratonStatus = 'idle',
  skeletonGenerationError,
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

        {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}

        {/* Generate Section */}
        <div>
          {!isCollapsed && (
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
              Generate
            </div>
          )}
          <div className="space-y-1">
             {/* Skeleton Generator */}
             {onGenerateSkeleton && !isCollapsed && (
               <div className="p-3 mb-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] space-y-3 shadow-sm">
                 <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-[var(--text-secondary)]">Skeleton Chain</div>
                    {skeletonGeneratonStatus === 'success' && <div className="text-[9px] text-green-400">Success</div>}
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="skel-gates" className="text-[10px] text-[var(--text-muted)]">Target Gates</label>
                        <input
                            type="number"
                            className="w-full px-2 py-1.5 text-[11px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                            defaultValue={10}
                            min={2}
                            max={200}
                            id="skel-gates"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                         <label htmlFor="skel-chain" className="text-[10px] text-[var(--text-muted)]">Chain Length <span className="text-[var(--text-faint)]">(Optional)</span></label>
                        <input
                            type="number"
                            className="w-full px-2 py-1.5 text-[11px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                            placeholder="Full chain"
                            min={2}
                            id="skel-chain"
                        />
                    </div>
                 </div>

                 {skeletonGeneratonStatus === 'error' && skeletonGenerationError && (
                    <div className="text-[10px] text-red-400 leading-tight">
                        {skeletonGenerationError}
                    </div>
                 )}

                 <button 
                    className={`w-full py-1.5 text-[10px] font-medium rounded transition-all duration-200
                        ${skeletonGeneratonStatus === 'generating' 
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-wait' 
                            : 'bg-[var(--accent-primary)] text-white hover:opacity-90 hover:shadow-md'
                        }
                    `}
                    disabled={skeletonGeneratonStatus === 'generating'}
                    onClick={() => {
                        const gatesStr = (document.getElementById('skel-gates') as HTMLInputElement).value;
                        const chainStr = (document.getElementById('skel-chain') as HTMLInputElement).value;
                        const gates = parseInt(gatesStr) || 10;
                        const chain = chainStr ? parseInt(chainStr) : undefined;
                        onGenerateSkeleton(gates, chain);
                    }}
                 >
                    {skeletonGeneratonStatus === 'generating' ? 'Generating...' : 'Generate Circuit'}
                 </button>
               </div>
             )}

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

        {/* Load Identity Section */}
        {onLoadLatest && (
          <div>
            {!isCollapsed && (
              <div className="text-[10px] uppercase tracking-wider text-[var(--status-identity)] mb-1.5 px-1">
                Load Identity
              </div>
            )}
            <div className="space-y-1">
              <ToolButton
                icon={Zap}
                label={isLoadingIdentity ? 'Loading...' : 'Latest'}
                onClick={onLoadLatest}
                disabled={isLoadingIdentity}
                collapsed={isCollapsed}
              />
              {onBrowseIdentities && (
                <ToolButton
                  icon={FolderOpen}
                  label="Browse"
                  onClick={onBrowseIdentities}
                  collapsed={isCollapsed}
                />
              )}
            </div>
          </div>
        )}

        {!isCollapsed && <div className="h-px bg-[var(--border-subtle)]" />}

        {/* Interaction Mode */}
        {!isCollapsed && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1">
              Mode
            </div>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => onSetInteractionMode('select')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded transition-all ${
                  interactionMode === 'select'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
                title="Selection Mode"
              >
                <MousePointer2 className="w-3 h-3" /> Select
              </button>
              <button
                onClick={() => onSetInteractionMode('add')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded transition-all ${
                  interactionMode === 'add'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
                title="Gate Addition Mode"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>
        )}

        {/* Placement Mode (only when Adding) */}
        {!isCollapsed && interactionMode === 'add' && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 px-1 flex items-center justify-between">
              <span>Placement</span>
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
