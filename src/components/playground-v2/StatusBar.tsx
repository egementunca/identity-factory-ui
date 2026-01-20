'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StatusBarProps {
  width: number;
  gateCount: number;
  isIdentity: boolean;
  selectedCount: number;
  clipboardCount: number;
  cycleNotation: string;
  // Performance flags
  isTooManyWires?: boolean;
  isTooManyGates?: boolean;
}

export default function StatusBar({
  width,
  gateCount,
  isIdentity,
  selectedCount,
  clipboardCount,
  cycleNotation,
  isTooManyWires = false,
  isTooManyGates = false,
}: StatusBarProps) {
  const hasPerformanceWarning = isTooManyWires || isTooManyGates;
  
  return (
    <div
      className="flex items-center justify-between px-3 h-7 text-xs border-t select-none"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4 text-[var(--text-muted)]">
        <span>
          {width}w × {gateCount}g
        </span>
        <span className="text-[var(--border-default)]">│</span>
        <span className={isIdentity ? 'text-[var(--status-identity)]' : ''}>
          {isIdentity ? '✓ Identity' : 'Non-identity'}
        </span>
        {selectedCount > 0 && (
          <>
            <span className="text-[var(--border-default)]">│</span>
            <span className="text-[var(--accent-primary)]">
              {selectedCount} selected
            </span>
          </>
        )}
        {clipboardCount > 0 && (
          <>
            <span className="text-[var(--border-default)]">│</span>
            <span>📋 {clipboardCount}g</span>
          </>
        )}
        {hasPerformanceWarning && (
          <>
            <span className="text-[var(--border-default)]">│</span>
            <span 
              className="flex items-center gap-1 text-amber-400"
              title={`Performance mode: ${isTooManyWires ? 'Permutation skipped (>16w)' : ''} ${isTooManyGates ? 'Skeleton disabled (>200g)' : ''}`}
            >
              <AlertTriangle className="w-3 h-3" />
              Perf
            </span>
          </>
        )}
      </div>

      {/* Right section - cycle notation */}
      <div className="flex items-center gap-2 text-[var(--text-secondary)] truncate max-w-[40%]">
        <span className="text-[var(--text-muted)]">σ:</span>
        <span className="truncate" title={cycleNotation}>
          {cycleNotation.length > 40
            ? cycleNotation.slice(0, 40) + '…'
            : cycleNotation}
        </span>
      </div>
    </div>
  );
}

