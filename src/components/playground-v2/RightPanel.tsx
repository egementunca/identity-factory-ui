'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Network,
  Search,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import SkeletonGraph from '../SkeletonGraph';
import { PlaygroundCircuit, PlaygroundGate } from '@/types/api';

type PanelTab = 'skeleton' | 'database' | 'analysis';

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

interface RightPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  circuit: PlaygroundCircuit;
  highlightedGateId: string | null;
  onNodeClick: (gateId: string) => void;
  // Edge highlighting
  highlightedEdgeGates?: [string, string] | null;
  onEdgeClick?: (gate1Id: string, gate2Id: string) => void;
  // Analysis data
  cycleNotation: string;
  isIdentity: boolean;
  permutation: number[];
  selectedGateIds?: Set<string>;
  // Performance flags
  isTooManyGates?: boolean;
  isTooManyWires?: boolean;
}

export default function RightPanel({
  isCollapsed,
  onToggleCollapse,
  circuit,
  highlightedGateId,
  onNodeClick,
  highlightedEdgeGates,
  onEdgeClick,
  cycleNotation,
  isIdentity,
  permutation,
  selectedGateIds,
  isTooManyGates = false,
  isTooManyWires = false,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('skeleton');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocalSkeleton, setShowLocalSkeleton] = useState(true);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(320);
  const isResizing = useRef(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // TODO: Implement actual API call to ECA57 database
      // For now, just simulate
      await new Promise((r) => setTimeout(r, 500));
      setSearchResults([
        { id: '1', gates: 4, width: 3, isIdentity: true },
        { id: '2', gates: 6, width: 4, isIdentity: false },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const tabs: { id: PanelTab; icon: React.ElementType; label: string }[] = [
    { id: 'skeleton', icon: Network, label: 'Skeleton' },
    { id: 'database', icon: Search, label: 'Database' },
    { id: 'analysis', icon: BarChart3, label: 'Analysis' },
  ];

  if (isCollapsed) {
    return (
      <div
        className="flex flex-col items-center py-2 border-l"
        style={{
          width: 'var(--sidebar-collapsed)',
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          title="Expand ]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="mt-2 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onToggleCollapse();
              }}
              className={`p-1.5 rounded ${
                activeTab === tab.id
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-muted)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full border-l relative"
      style={{
        width: `${panelWidth}px`,
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[var(--accent-primary)] transition-colors z-10"
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Tab header */}
      <div className="flex items-center justify-between px-1 h-8 border-b border-[var(--border-subtle)]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-muted)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          title="Collapse ]"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'skeleton' && (
          <div className="h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
              <div className="text-xs font-medium text-[var(--text-secondary)]">
                {selectedGateIds && selectedGateIds.size > 0
                  ? `Selected (${selectedGateIds.size})`
                  : 'Full Circuit'}
              </div>
              {selectedGateIds && selectedGateIds.size > 0 && (
                <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                  <span className="text-[var(--text-muted)]">Focus Selected</span>
                  <input
                    type="checkbox"
                    checked={showLocalSkeleton}
                    onChange={(e) => setShowLocalSkeleton(e.target.checked)}
                    className="accent-[var(--accent-primary)]"
                  />
                </label>
              )}
            </div>
            
            {isTooManyGates && (!selectedGateIds || selectedGateIds.size === 0 || selectedGateIds.size > 200) && !showLocalSkeleton ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Network className="w-12 h-12 text-[var(--text-muted)] mb-3 opacity-40" />
                <div className="text-sm text-[var(--text-secondary)] mb-1">Skeleton Disabled</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {circuit.gates.length} gates exceeds limit (200).
                  <br />Select fewer gates to view graph.
                </div>
              </div>
            ) : (
              <SkeletonGraph
                circuit={
                  showLocalSkeleton && selectedGateIds && selectedGateIds.size > 0
                    ? {
                        ...circuit,
                        gates: circuit.gates.filter((g) =>
                          selectedGateIds.has(g.id)
                        ),
                      }
                    : circuit
                }
                highlightedGateId={highlightedGateId}
                highlightedEdgeGates={highlightedEdgeGates}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                forceShow={!!(selectedGateIds && selectedGateIds.size > 0 && selectedGateIds.size <= 200)}
                selectedGateIds={selectedGateIds}
              />
            )}
          </div>
        )}

        {activeTab === 'database' && (
          <div className="p-2 space-y-2 overflow-y-auto h-full">
            {/* Search input */}
            <div className="flex gap-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search ECA57 circuits..."
                className="flex-1 px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded outline-none focus:border-[var(--accent-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-2 py-1 text-xs bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary)] hover:text-white transition-colors disabled:opacity-50"
              >
                {isSearching ? '...' : 'Go'}
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-1">
              <button className="flex-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:border-[var(--border-default)]">
                This Circuit
              </button>
              <button className="flex-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:border-[var(--border-default)]">
                Selection
              </button>
            </div>

            {/* Results */}
            <div className="space-y-1 mt-2">
              {searchResults.length === 0 ? (
                <div className="text-[10px] text-[var(--text-muted)] text-center py-4">
                  No results. Try searching for circuits.
                </div>
              ) : (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] cursor-pointer"
                  >
                    <div className="text-xs">
                      <div className="text-[var(--text-primary)]">
                        #{result.id} • {result.width}w × {result.gates}g
                      </div>
                      <div
                        className={`text-[10px] ${result.isIdentity ? 'text-[var(--status-identity)]' : 'text-[var(--text-muted)]'}`}
                      >
                        {result.isIdentity ? 'Identity' : 'Non-identity'}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="p-3 space-y-3 overflow-y-auto h-full">
            {/* Identity Status */}
            <div
              className={`p-2 rounded border ${
                isIdentity
                  ? 'bg-[var(--status-identity)]/10 border-[var(--status-identity)]/30'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-subtle)]'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Status
              </div>
              <div
                className={`text-sm font-medium ${isIdentity ? 'text-[var(--status-identity)]' : 'text-[var(--text-primary)]'}`}
              >
                {isIdentity ? '✓ Identity Circuit' : 'Non-Identity'}
              </div>
            </div>

            {/* Cycle Notation */}
            <div className="p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Cycle Notation
              </div>
              <div
                className="text-xs font-mono text-[var(--text-primary)] break-all"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {cycleNotation || '()'}
              </div>
            </div>

            {/* Permutation preview */}
            <details className="group">
              <summary className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                Truth Table ({permutation.length} entries)
              </summary>
              <div className="mt-2 p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
                  <div className="text-[var(--text-muted)]">In</div>
                  <div className="text-[var(--text-muted)]">Out</div>
                  {permutation.slice(0, 16).map((out, idx) => (
                    <React.Fragment key={idx}>
                      <div className="text-[var(--text-secondary)]">
                        {idx.toString(2).padStart(circuit.width, '0')}
                      </div>
                      <div
                        className={
                          idx === out
                            ? 'text-[var(--status-identity)]'
                            : 'text-[var(--text-primary)]'
                        }
                      >
                        {out.toString(2).padStart(circuit.width, '0')}
                      </div>
                    </React.Fragment>
                  ))}
                  {permutation.length > 16 && (
                    <div className="col-span-2 text-[var(--text-muted)] text-center">
                      ... {permutation.length - 16} more
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
