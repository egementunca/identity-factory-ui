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
import { PlaygroundCircuit, PlaygroundGate, DatabaseSearchResult, DatabaseSearchResponse, DatabaseSource } from '@/types/api';
import { API_HOST } from '@/lib/api';

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
  // Load circuit callback
  onLoadCircuit?: (circuitStr: string, width: number) => void;
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
  onLoadCircuit,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('skeleton');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DatabaseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocalSkeleton, setShowLocalSkeleton] = useState(true);
  const [selectedSources, setSelectedSources] = useState<DatabaseSource[]>(['skeleton', 'eca57-lmdb', 'sqlite']);
  const [loadingCircuitId, setLoadingCircuitId] = useState<string | null>(null);

  const API_BASE = API_HOST;

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(320);
  const isResizing = useRef(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      // Parse "4w 8g" format (empty query = show all)
      // Also supports "swap_flip" or "swap" to search swap-flip gadgets
      const widthMatch = searchQuery.match(/(\d+)w/i);
      const gatesMatch = searchQuery.match(/(\d+)g/i);
      const isSwapFlip = /swap[_-]?flip|swap/i.test(searchQuery);

      if (widthMatch) params.set('width', widthMatch[1]);
      if (gatesMatch) params.set('gate_count', gatesMatch[1]);
      params.set('limit', '30');

      if (isSwapFlip) {
        // Swap-flip gadgets are not identity circuits
        params.set('circuit_source', 'swap_flip');
        params.set('is_identity_only', 'false');
        params.append('sources', 'sqlite'); // swap-flip only in SQLite
      } else {
        selectedSources.forEach(s => params.append('sources', s));
      }

      const res = await fetch(`${API_BASE}/api/v1/search/circuits?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DatabaseSearchResponse = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadToCanvas = (result: DatabaseSearchResult) => {
    if (!onLoadCircuit) return;
    setLoadingCircuitId(result.id);
    try {
      onLoadCircuit(result.gateString, result.width);
    } finally {
      setLoadingCircuitId(null);
    }
  };

  const handleSearchThisCircuit = async () => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        width: circuit.width.toString(),
        gate_count: circuit.gates.length.toString(),
        limit: '20',
      });
      selectedSources.forEach(s => params.append('sources', s));

      const res = await fetch(`${API_BASE}/api/v1/search/circuits?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DatabaseSearchResponse = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSwapFlip = async () => {
    setIsSearching(true);
    setSearchQuery('swap_flip');
    try {
      const params = new URLSearchParams({
        circuit_source: 'swap_flip',
        is_identity_only: 'false',
        limit: '100',
      });
      params.append('sources', 'sqlite');

      const res = await fetch(`${API_BASE}/api/v1/search/circuits?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DatabaseSearchResponse = await res.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSource = (source: DatabaseSource) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
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
                placeholder="e.g. 3w 6g, swap_flip, or click Go"
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
              <button
                onClick={handleSearchThisCircuit}
                disabled={isSearching}
                className="flex-1 px-2 py-1 text-[10px] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded hover:border-[var(--border-default)] disabled:opacity-50"
              >
                This Circuit
              </button>
              <button
                onClick={handleSearchSwapFlip}
                disabled={isSearching}
                className="flex-1 px-2 py-1 text-[10px] text-[var(--accent-secondary)] border border-[var(--accent-secondary)] rounded hover:bg-[var(--accent-secondary)] hover:text-white disabled:opacity-50"
              >
                Swap-Flip (203)
              </button>
            </div>

            {/* Source filters */}
            <div className="flex flex-wrap gap-1 mt-2">
              {(['skeleton', 'eca57-lmdb', 'sqlite'] as DatabaseSource[]).map((source) => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                    selectedSources.includes(source)
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)]'
                  }`}
                >
                  {source === 'eca57-lmdb' ? 'ECA57' : source === 'skeleton' ? 'Skeleton' : 'SQLite'}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="space-y-1 mt-2">
	              {searchResults.length === 0 ? (
	                <div className="text-[10px] text-[var(--text-muted)] text-center py-4">
                  Click &quot;Go&quot; to search. Try &quot;3w 6g&quot; or click &quot;Swap-Flip&quot;.
                </div>
	              ) : (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  >
                    <div className="text-xs flex-1">
                      <div className="text-[var(--text-primary)]">
                        {result.width}w × {result.gateCount}g
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`px-1 rounded ${
                          result.source === 'skeleton' ? 'bg-purple-900/30 text-purple-300' :
                          result.source === 'eca57-lmdb' ? 'bg-blue-900/30 text-blue-300' :
                          'bg-green-900/30 text-green-300'
                        }`}>
                          {result.source === 'eca57-lmdb' ? 'ECA57' : result.source === 'skeleton' ? 'Skeleton' : 'SQLite'}
                        </span>
                        {result.isIdentity && (
                          <span className="text-[var(--status-identity)]">Identity</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadToCanvas(result)}
                      disabled={loadingCircuitId === result.id || !onLoadCircuit}
                      className="px-2 py-1 text-[10px] bg-[var(--accent-primary)] text-white rounded hover:opacity-80 disabled:opacity-50 transition-opacity"
                    >
                      {loadingCircuitId === result.id ? '...' : 'Load'}
                    </button>
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
