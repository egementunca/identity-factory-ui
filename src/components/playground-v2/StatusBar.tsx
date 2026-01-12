'use client';

import React from 'react';

interface StatusBarProps {
  width: number;
  gateCount: number;
  isIdentity: boolean;
  selectedCount: number;
  clipboardCount: number;
  cycleNotation: string;
}

export default function StatusBar({
  width,
  gateCount,
  isIdentity,
  selectedCount,
  clipboardCount,
  cycleNotation,
}: StatusBarProps) {
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
