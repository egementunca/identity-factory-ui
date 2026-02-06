'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Cpu,
  Zap,
  Layers,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

// Types
interface SATStats {
  total_circuits: number;
  by_dimension: Record<string, number>;
  status: string;
}

interface ClusterStats {
  total_circuits: number;
  by_dimension: Record<string, number>;
  by_gate_set: Record<string, number>;
  max_width?: number;
  max_gates?: number;
  status: string;
}

interface ClusterCircuit {
  id: number;
  width: number;
  gate_count: number;
  gates: string;
  permutation: string;
  gate_set: string;
}

interface Circuit {
  perm_key?: string;
  id?: number;
  permutation: number[];
  perm_cycle: number[][];
  gates: any[];
  gate_count: number;
  diagram?: string;
  order_val?: number;
  metrics?: Record<string, number>;
  gate_counts?: number[]; // For Permutation DB
}

interface PermTableStats {
  name: string;
  entries: number;
  key_size: number;
  n_wires: number;
}

interface PermEntry {
  permutation: number[];
  gate_counts: number[];
  hex_key: string;
}

interface PermDatabaseStats {
  tables: PermTableStats[];
  total_entries: number;
  path: string;
  status: string;
}

interface PermEntriesResponse {
  entries: PermEntry[];
  limit: number;
  offset: number;
  has_more: boolean;
}

interface CircuitListResponse {
  circuits: Circuit[];
  total: number;
  offset: number;
  limit: number;
}

interface WireShufflerStats {
  total_permutations: number;
  total_circuits: number;
  by_width: Record<string, number>;
  by_gate_count: Record<string, number>;
  by_hamming: Record<string, number>;
  by_swap_distance: Record<string, number>;
  by_cycle_type: Record<string, number>;
  by_parity: Record<string, number>;
}

interface WirePermutationEntry {
  width: number;
  wire_perm: number[];
  wire_perm_hash: string;
  fixed_points: number;
  hamming: number;
  cycles: number;
  swap_distance: number;
  cycle_type: string;
  parity: string;
  is_identity: boolean;
  best_gate_count?: number | null;
}

interface WirePermutationList {
  total: number;
  offset: number;
  limit: number;
  entries: WirePermutationEntry[];
}

interface WireCircuitEntry {
  id: number;
  width: number;
  wire_perm_hash: string;
  wire_perm: number[];
  gate_count?: number | null;
  gates?: number[][] | null;
  found: boolean;
  is_best: boolean;
  full_perm?: number[] | null;
  metrics?: {
    wires_used: number;
    wire_coverage: number;
    max_wire_degree: number;
    avg_wire_degree: number;
    adjacent_collisions: number;
    adjacent_commutes: number;
    total_collisions: number;
    collision_density: number;
  } | null;
}

type WireFilterState = {
  min_wire_coverage: string;
  max_wire_coverage: string;
  min_collision_density: string;
  max_collision_density: string;
  min_adjacent_collisions: string;
  max_adjacent_collisions: string;
  min_total_collisions: string;
  max_total_collisions: string;
  min_max_wire_degree: string;
  max_max_wire_degree: string;
  min_avg_wire_degree: string;
  max_avg_wire_degree: string;
  min_wires_used: string;
  max_wires_used: string;
};

export default function DualDatabaseView() {
  const emptyWireFilters = (): WireFilterState => ({
    min_wire_coverage: '',
    max_wire_coverage: '',
    min_collision_density: '',
    max_collision_density: '',
    min_adjacent_collisions: '',
    max_adjacent_collisions: '',
    min_total_collisions: '',
    max_total_collisions: '',
    min_max_wire_degree: '',
    max_max_wire_degree: '',
    min_avg_wire_degree: '',
    max_avg_wire_degree: '',
    min_wires_used: '',
    max_wires_used: '',
  });

  // SAT Database state
  const [satStats, setSatStats] = useState<SATStats | null>(null);
  const [satLoading, setSatLoading] = useState(true);
  const [satCircuits, setSatCircuits] = useState<Circuit[]>([]);
  const [satExpanded, setSatExpanded] = useState(false);

  // Cluster Database state
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [clusterLoading, setClusterLoading] = useState(true);
  const [clusterCircuits, setClusterCircuits] = useState<ClusterCircuit[]>([]);
  const [clusterExpanded, setClusterExpanded] = useState(false);

  // Selected circuit for details
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);

  // Permutation Database state
  const [permStats, setPermStats] = useState<PermDatabaseStats | null>(null);
  const [permLoading, setPermLoading] = useState(true);
  const [permEntries, setPermEntries] = useState<PermEntry[]>([]);
  const [selectedPermTable, setSelectedPermTable] = useState<string | null>(null);
  const [permExpanded, setPermExpanded] = useState(false);

  // Wire Shuffler Database state
  const [wireStats, setWireStats] = useState<WireShufflerStats | null>(null);
  const [wireLoading, setWireLoading] = useState(true);
  const [wirePerms, setWirePerms] = useState<WirePermutationEntry[]>([]);
  const [wireCircuits, setWireCircuits] = useState<WireCircuitEntry[]>([]);
  const [wireExpanded, setWireExpanded] = useState(false);
  const [wireWidth, setWireWidth] = useState<number | null>(null);
  const [wireMode, setWireMode] = useState<'perms' | 'circuits'>('perms');
  const [wireFilters, setWireFilters] = useState<WireFilterState>(
    emptyWireFilters()
  );

  // Fetch Perm stats
  const fetchPermStats = async () => {
    setPermLoading(true);
    try {
      const res = await fetch(`${API_BASE}/perm-database/stats`);
      if (res.ok) {
        setPermStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch Perm stats:', e);
    } finally {
      setPermLoading(false);
    }
  };

  // Fetch Perm entries
  const fetchPermEntries = async (table: string, limit = 50, offset = 0) => {
    try {
      const res = await fetch(
        `${API_BASE}/perm-database/${table}/entries?limit=${limit}&offset=${offset}`
      );
      if (res.ok) {
        const data: PermEntriesResponse = await res.json();
        setPermEntries(data.entries);
      }
    } catch (e) {
      console.error('Failed to fetch Perm entries:', e);
    }
  };

  // Fetch Wire Shuffler stats
  const fetchWireStats = async () => {
    setWireLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wire-shuffler/stats`);
      if (res.ok) {
        const data: WireShufflerStats = await res.json();
        setWireStats(data);
        if (wireWidth === null && Object.keys(data.by_width).length > 0) {
          const first = Object.keys(data.by_width)
            .map((v) => parseInt(v, 10))
            .sort((a, b) => a - b)[0];
          setWireWidth(first);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Wire Shuffler stats:', e);
    } finally {
      setWireLoading(false);
    }
  };

  const fetchWirePerms = async (width: number, limit = 50, offset = 0) => {
    try {
      const res = await fetch(
        `${API_BASE}/wire-shuffler/permutations?width=${width}&limit=${limit}&offset=${offset}`
      );
      if (res.ok) {
        const data: WirePermutationList = await res.json();
        setWirePerms(data.entries);
      }
    } catch (e) {
      console.error('Failed to fetch Wire Shuffler permutations:', e);
    }
  };

  const updateWireFilter = (
    key: keyof WireFilterState,
    value: string
  ) => {
    setWireFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetWireFilters = () => {
    const cleared = emptyWireFilters();
    setWireFilters(cleared);
    return cleared;
  };

  const fetchWireCircuits = async (
    width: number,
    limit = 50,
    offset = 0,
    filtersOverride?: WireFilterState
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('width', String(width));
      params.set('is_best', 'true');
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const activeFilters = filtersOverride ?? wireFilters;
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== '' && !Number.isNaN(Number(value))) {
          params.set(key, value);
        }
      });

      const res = await fetch(
        `${API_BASE}/wire-shuffler/circuits?${params.toString()}`
      );
      if (res.ok) {
        const data: { entries: WireCircuitEntry[] } = await res.json();
        setWireCircuits(data.entries);
      }
    } catch (e) {
      console.error('Failed to fetch Wire Shuffler circuits:', e);
    }
  };

  const fetchWireCircuit = async (permHash: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/wire-shuffler/circuits?perm_hash=${permHash}&is_best=true&limit=1`
      );
      if (res.ok) {
        const data: { entries: WireCircuitEntry[] } = await res.json();
        const entry = data.entries?.[0];
        if (entry) {
          setSelectedCircuit({
            id: entry.id,
            permutation: entry.wire_perm,
            perm_cycle: cycleFromPerm(entry.wire_perm),
            gates: entry.gates || [],
            gate_count: entry.gate_count || 0,
            order_val: entry.metrics?.collision_density,
            metrics: entry.metrics || undefined,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch Wire Shuffler circuit:', e);
    }
  };


  // Fetch SAT stats
  const fetchSatStats = async () => {
    setSatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sat-database/stats`);
      if (res.ok) {
        setSatStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch SAT stats:', e);
    } finally {
      setSatLoading(false);
    }
  };

  // Fetch SAT circuits
  const fetchSatCircuits = async (limit = 20, width = 3) => {
    try {
      // Default to 3-wire circuits which have non-trivial permutations
      const res = await fetch(
        `${API_BASE}/sat-database/circuits?limit=${limit}&width=${width}`
      );
      if (res.ok) {
        const data: CircuitListResponse = await res.json();
        setSatCircuits(data.circuits);
      }
    } catch (e) {
      console.error('Failed to fetch SAT circuits:', e);
    }
  };

  // Fetch Cluster stats
  const fetchClusterStats = async () => {
    setClusterLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cluster-database/stats`);
      if (res.ok) {
        setClusterStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch Cluster stats:', e);
    } finally {
      setClusterLoading(false);
    }
  };

  // Fetch Cluster circuits
  const fetchClusterCircuits = async (limit = 20) => {
    try {
      const res = await fetch(
        `${API_BASE}/cluster-database/circuits?limit=${limit}`
      );
      if (res.ok) {
        const data = await res.json();
        setClusterCircuits(data.circuits || []);
      }
    } catch (e) {
      console.error('Failed to fetch Cluster circuits:', e);
    }
  };

  useEffect(() => {
    fetchSatStats();
    fetchClusterStats();
    fetchPermStats();
    fetchWireStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCycle = (cycle: number[][]) => {
    if (!cycle || cycle.length === 0) return 'id';
    return cycle.map((c) => `(${c.join(' ')})`).join('');
  };

  const cycleFromPerm = (perm: number[]) => {
    const n = perm.length;
    const visited = new Array(n).fill(false);
    const cycles: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      let j = i;
      const cycle: number[] = [];
      while (!visited[j]) {
        visited[j] = true;
        cycle.push(j);
        j = perm[j];
      }
      if (cycle.length > 1) cycles.push(cycle);
    }
    return cycles;
  };

  const topCycleTypes = wireStats
    ? Object.entries(wireStats.by_cycle_type || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
    : [];
  const parityEntries = wireStats
    ? Object.entries(wireStats.by_parity || {})
    : [];
  const topHamming = wireStats
    ? Object.entries(wireStats.by_hamming || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .slice(0, 4)
    : [];
  const topSwap = wireStats
    ? Object.entries(wireStats.by_swap_distance || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .slice(0, 4)
    : [];

  return (
    <div className="dual-database-view">
      <h2 className="section-title">Circuit Database Explorer</h2>
      <p className="section-desc">
        Explore circuits generated by SAT synthesis and Go brute-force
        enumeration
      </p>

      <div className="database-grid">
        {/* SAT Database Panel */}
        <div className="database-panel sat-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Cpu className="icon" />
              <h3>SAT Revsynth Database</h3>
              <span className={`status-badge ${satStats?.status || 'unknown'}`}>
                {satStats?.status === 'complete'
                  ? 'Complete'
                  : satStats?.status === 'generating'
                    ? 'Generating...'
                    : 'Not Found'}
              </span>
            </div>
            <button
              onClick={() => {
                fetchSatStats();
                if (satExpanded) fetchSatCircuits();
              }}
              className="refresh-btn"
            >
              <RefreshCw className="icon-sm" />
            </button>
          </div>

          {satLoading ? (
            <div className="loading-state">Loading...</div>
          ) : satStats ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">{satStats.total_circuits}</span>
                  <span className="stat-label">Total Circuits</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {Object.keys(satStats.by_dimension).length}
                  </span>
                  <span className="stat-label">Dimensions</span>
                </div>
              </div>

              <button
                className="expand-btn"
                onClick={() => {
                  setSatExpanded(!satExpanded);
                  if (!satExpanded && satCircuits.length === 0) {
                    fetchSatCircuits();
                  }
                }}
              >
                {satExpanded ? <ChevronDown /> : <ChevronRight />}
                {satExpanded ? 'Hide Circuits' : 'Browse Circuits'}
              </button>

              {satExpanded && (
                <div className="circuits-list">
                  {satCircuits.map((circuit, i) => (
                    <div
                      key={circuit.id || i}
                      className={`circuit-item ${selectedCircuit?.id === circuit.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCircuit(circuit)}
                    >
                      <div className="circuit-info">
                        <span className="circuit-dim">
                          {circuit.gates?.[0]?.[0] !== undefined
                            ? `${Math.max(...circuit.gates.flat()) + 1}w`
                            : '?w'}{' '}
                          × {circuit.gate_count}g
                        </span>
                        <span className="circuit-cycle">
                          {formatCycle(circuit.perm_cycle)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              No SAT database found. Run enumeration script.
            </div>
          )}
        </div>

        {/* Cluster Database Panel */}
        <div className="database-panel cluster-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers className="icon" />
              <h3>Cluster ECA57 Database</h3>
              <span
                className={`status-badge ${clusterStats?.status === 'ready' ? 'complete' : 'unknown'}`}
              >
                {clusterStats?.status === 'ready' ? 'Ready' : 'Not Found'}
              </span>
            </div>
            <button
              onClick={() => {
                fetchClusterStats();
                if (clusterExpanded) fetchClusterCircuits();
              }}
              className="refresh-btn"
            >
              <RefreshCw className="icon-sm" />
            </button>
          </div>

          {clusterLoading ? (
            <div className="loading-state">Loading...</div>
          ) : clusterStats && clusterStats.total_circuits > 0 ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">
                    {clusterStats.total_circuits.toLocaleString()}
                  </span>
                  <span className="stat-label">Total Circuits</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {Object.keys(clusterStats.by_dimension).length}
                  </span>
                  <span className="stat-label">Dimensions</span>
                </div>
              </div>

              <button
                className="expand-btn"
                onClick={() => {
                  setClusterExpanded(!clusterExpanded);
                  if (!clusterExpanded && clusterCircuits.length === 0) {
                    fetchClusterCircuits();
                  }
                }}
              >
                {clusterExpanded ? <ChevronDown /> : <ChevronRight />}
                {clusterExpanded ? 'Hide Circuits' : 'Browse Circuits'}
              </button>

              {clusterExpanded && (
                <div className="circuits-list">
                  {clusterCircuits.map((circuit) => (
                    <div key={circuit.id} className="circuit-item">
                      <div className="circuit-info">
                        <span className="circuit-dim">
                          {circuit.width}w × {circuit.gate_count}g
                        </span>
                        <span className="circuit-cycle">
                          {circuit.gate_set}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              No Cluster database found. Run import script.
            </div>
          )}
        </div>

        {/* Permutation Database Panel */}
        <div className="database-panel perm-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Database className="icon" />
              <h3>Permutation Tables (LMDB)</h3>
              <span className={`status-badge ${permStats?.status === 'active' ? 'complete' : 'unknown'}`}>
                {permStats?.status === 'active' ? 'Ready' : 'Not Found'}
              </span>
            </div>
            <button
              onClick={() => {
                fetchPermStats();
                if (selectedPermTable) fetchPermEntries(selectedPermTable);
              }}
              className="refresh-btn"
            >
              <RefreshCw className="icon-sm" />
            </button>
          </div>

          {permLoading ? (
            <div className="loading-state">Loading...</div>
          ) : permStats && permStats.total_entries > 0 ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">
                    {permStats.total_entries.toLocaleString()}
                  </span>
                  <span className="stat-label">Total Permutations</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {permStats.tables.length}
                  </span>
                  <span className="stat-label">Tables</span>
                </div>
              </div>

              <div className="db-file-list">
                {permStats.tables.map((table) => (
                  <div 
                    key={table.name} 
                    className={`db-file-header ${selectedPermTable === table.name ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedPermTable === table.name) {
                        setSelectedPermTable(null);
                        setPermEntries([]);
                      } else {
                        setSelectedPermTable(table.name);
                        fetchPermEntries(table.name);
                      }
                    }}
                  >
                    <span className="db-name">{table.name}</span>
                    <span className="db-meta">{table.n_wires} wires</span>
                    <span className="db-size">{table.entries.toLocaleString()} entries</span>
                  </div>
                ))}
              </div>

              {selectedPermTable && (
                <div className="circuits-list">
                   <h4 style={{color: '#aaa', fontSize: '0.8rem', margin: '10px 0 5px 0'}}>First 50 Entries of {selectedPermTable}</h4>
                   {permEntries.length === 0 && <div className="loading-state">Loading entries...</div>}
                   {permEntries.map((entry, i) => (
                     <div
                       key={i}
                       className="circuit-item"
                       onClick={() => setSelectedCircuit({
                         permutation: entry.permutation,
                         gate_counts: entry.gate_counts,
                         gates: [], // No gates stored, just counts
                         gate_count: 0,
                         perm_cycle: [], // Ideally calculate cycle here or backend
                         id: i
                       })}
                     >
                       <div className="circuit-info">
                         <span className="circuit-dim">
                           Permutation: {entry.permutation.slice(0, 5).join(',')}...
                         </span>
                         <span className="circuit-cycle">
                           Counts: {entry.gate_counts.join(', ')}
                         </span>
                       </div>
                     </div>
                   ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              No Permutation database found at {permStats?.path}.
            </div>
          )}
        </div>

        {/* Wire Shuffler Database Panel */}
        <div className="database-panel wire-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Zap className="icon" />
              <h3>Wire Shuffler DB</h3>
              <span
                className={`status-badge ${wireStats ? 'complete' : 'unknown'}`}
              >
                {wireStats ? 'Ready' : 'Not Found'}
              </span>
            </div>
            <button
              onClick={() => {
                fetchWireStats();
                if (wireExpanded && wireWidth !== null) {
                  if (wireMode === 'perms') {
                    fetchWirePerms(wireWidth);
                  } else {
                    fetchWireCircuits(wireWidth);
                  }
                }
              }}
              className="refresh-btn"
            >
              <RefreshCw className="icon-sm" />
            </button>
          </div>

          {wireLoading ? (
            <div className="loading-state">Loading...</div>
          ) : wireStats ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">
                    {wireStats.total_permutations.toLocaleString()}
                  </span>
                  <span className="stat-label">Permutations</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {wireStats.total_circuits.toLocaleString()}
                  </span>
                  <span className="stat-label">Circuits</span>
                </div>
              </div>

              <div className="mini-stats">
                <div className="mini-group">
                  <span className="mini-label">Parity</span>
                  <div className="mini-chips">
                    {parityEntries.map(([label, count]) => (
                      <span key={label} className="mini-chip">
                        {label} · {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mini-group">
                  <span className="mini-label">Top Cycle Types</span>
                  <div className="mini-chips">
                    {topCycleTypes.map(([label, count]) => (
                      <span key={label} className="mini-chip">
                        {label} · {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mini-group">
                  <span className="mini-label">Hamming</span>
                  <div className="mini-chips">
                    {topHamming.map(([label, count]) => (
                      <span key={label} className="mini-chip">
                        {label} · {count}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mini-group">
                  <span className="mini-label">Swap Dist</span>
                  <div className="mini-chips">
                    {topSwap.map(([label, count]) => (
                      <span key={label} className="mini-chip">
                        {label} · {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="filter-row">
                <label>Width</label>
                <select
                  value={wireWidth ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setWireWidth(v);
                    if (wireExpanded) {
                      if (wireMode === 'perms') {
                        fetchWirePerms(v);
                      } else {
                        fetchWireCircuits(v);
                      }
                    }
                  }}
                >
                  {Object.keys(wireStats.by_width)
                    .map((v) => parseInt(v, 10))
                    .sort((a, b) => a - b)
                    .map((v) => (
                      <option key={v} value={v}>
                        {v} wires
                      </option>
                    ))}
                </select>
              </div>

              <div className="filter-row">
                <label>View</label>
                <div className="segmented">
                  <button
                    className={`segmented-btn ${wireMode === 'perms' ? 'active' : ''}`}
                    onClick={() => {
                      if (wireMode !== 'perms') {
                        setWireMode('perms');
                        setWireCircuits([]);
                        if (wireExpanded && wireWidth !== null) {
                          fetchWirePerms(wireWidth);
                        }
                      }
                    }}
                  >
                    Permutations
                  </button>
                  <button
                    className={`segmented-btn ${wireMode === 'circuits' ? 'active' : ''}`}
                    onClick={() => {
                      if (wireMode !== 'circuits') {
                        setWireMode('circuits');
                        setWirePerms([]);
                        if (wireExpanded && wireWidth !== null) {
                          fetchWireCircuits(wireWidth);
                        }
                      }
                    }}
                  >
                    Circuits
                  </button>
                </div>
              </div>

              {wireMode === 'circuits' && (
                <>
                  <div className="filter-grid">
                    <div className="filter-item">
                      <label>Coverage</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="min"
                          value={wireFilters.min_wire_coverage}
                          onChange={(e) =>
                            updateWireFilter('min_wire_coverage', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="max"
                          value={wireFilters.max_wire_coverage}
                          onChange={(e) =>
                            updateWireFilter('max_wire_coverage', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Collision Density</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="min"
                          value={wireFilters.min_collision_density}
                          onChange={(e) =>
                            updateWireFilter('min_collision_density', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="max"
                          value={wireFilters.max_collision_density}
                          onChange={(e) =>
                            updateWireFilter('max_collision_density', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Adj Collisions</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="1"
                          placeholder="min"
                          value={wireFilters.min_adjacent_collisions}
                          onChange={(e) =>
                            updateWireFilter('min_adjacent_collisions', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="1"
                          placeholder="max"
                          value={wireFilters.max_adjacent_collisions}
                          onChange={(e) =>
                            updateWireFilter('max_adjacent_collisions', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Total Collisions</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="1"
                          placeholder="min"
                          value={wireFilters.min_total_collisions}
                          onChange={(e) =>
                            updateWireFilter('min_total_collisions', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="1"
                          placeholder="max"
                          value={wireFilters.max_total_collisions}
                          onChange={(e) =>
                            updateWireFilter('max_total_collisions', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Max Degree</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="1"
                          placeholder="min"
                          value={wireFilters.min_max_wire_degree}
                          onChange={(e) =>
                            updateWireFilter('min_max_wire_degree', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="1"
                          placeholder="max"
                          value={wireFilters.max_max_wire_degree}
                          onChange={(e) =>
                            updateWireFilter('max_max_wire_degree', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Avg Degree</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="min"
                          value={wireFilters.min_avg_wire_degree}
                          onChange={(e) =>
                            updateWireFilter('min_avg_wire_degree', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="max"
                          value={wireFilters.max_avg_wire_degree}
                          onChange={(e) =>
                            updateWireFilter('max_avg_wire_degree', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Wires Used</label>
                      <div className="range-input">
                        <input
                          type="number"
                          step="1"
                          placeholder="min"
                          value={wireFilters.min_wires_used}
                          onChange={(e) =>
                            updateWireFilter('min_wires_used', e.target.value)
                          }
                        />
                        <input
                          type="number"
                          step="1"
                          placeholder="max"
                          value={wireFilters.max_wires_used}
                          onChange={(e) =>
                            updateWireFilter('max_wires_used', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="filter-actions">
                    <button
                      className="action-btn"
                      onClick={() => {
                        if (wireWidth !== null) {
                          fetchWireCircuits(wireWidth);
                        }
                      }}
                    >
                      Apply Filters
                    </button>
                    <button
                      className="action-btn secondary"
                      onClick={() => {
                        const cleared = resetWireFilters();
                        if (wireWidth !== null && wireExpanded) {
                          fetchWireCircuits(wireWidth, 50, 0, cleared);
                        }
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </>
              )}

              <button
                className="expand-btn"
                onClick={() => {
                  setWireExpanded(!wireExpanded);
                  if (!wireExpanded && wireWidth !== null) {
                    if (wireMode === 'perms') {
                      fetchWirePerms(wireWidth);
                    } else {
                      fetchWireCircuits(wireWidth);
                    }
                  }
                }}
              >
                {wireExpanded ? <ChevronDown /> : <ChevronRight />}
                {wireExpanded
                  ? wireMode === 'perms'
                    ? 'Hide Permutations'
                    : 'Hide Circuits'
                  : wireMode === 'perms'
                    ? 'Browse Permutations'
                    : 'Browse Circuits'}
              </button>

              {wireExpanded && wireMode === 'perms' && (
                <div className="circuits-list">
                  {wirePerms.length === 0 && (
                    <div className="loading-state">Loading entries...</div>
                  )}
                  {wirePerms.map((entry, i) => (
                    <div
                      key={entry.wire_perm_hash || i}
                      className="circuit-item"
                      onClick={() => fetchWireCircuit(entry.wire_perm_hash)}
                    >
                      <div className="circuit-info">
                        <span className="circuit-dim">
                          w={entry.wire_perm.slice(0, 4).join(',')}
                          {entry.wire_perm.length > 4 ? '…' : ''}
                        </span>
                        <span className="circuit-cycle">
                          type {entry.cycle_type} · best {entry.best_gate_count ?? '-'}g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {wireExpanded && wireMode === 'circuits' && (
                <div className="circuits-list">
                  {wireCircuits.length === 0 && (
                    <div className="loading-state">No circuits found.</div>
                  )}
                  {wireCircuits.map((entry) => (
                    <div
                      key={entry.id}
                      className="circuit-item"
                      onClick={() =>
                        setSelectedCircuit({
                          id: entry.id,
                          permutation: entry.wire_perm,
                          perm_cycle: cycleFromPerm(entry.wire_perm),
                          gates: entry.gates || [],
                          gate_count: entry.gate_count || 0,
                          order_val: entry.metrics?.collision_density,
                          metrics: entry.metrics || undefined,
                        })
                      }
                    >
                      <div className="circuit-info">
                        <span className="circuit-dim">
                          {entry.width}w × {entry.gate_count ?? '-'}g
                        </span>
                        <span className="circuit-cycle">
                          dens {entry.metrics?.collision_density?.toFixed?.(2) ?? '-'} ·
                          cov {entry.metrics?.wire_coverage?.toFixed?.(2) ?? '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">No Wire Shuffler DB found.</div>
          )}
        </div>
      </div>

      {/* Circuit Details Panel */}
      {selectedCircuit && (
        <div className="circuit-details">
          <h3>Circuit Details</h3>
          <button
            className="close-btn"
            onClick={() => setSelectedCircuit(null)}
          >
            ×
          </button>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Permutation</label>
              <code>[{selectedCircuit.permutation.join(', ')}]</code>
            </div>
            <div className="detail-item">
              <label>Cycle Notation</label>
              <code>{formatCycle(selectedCircuit.perm_cycle)}</code>
            </div>
            <div className="detail-item">
              <label>Gate Count</label>
              <span>{selectedCircuit.gate_count}</span>
            </div>
            {selectedCircuit.order_val !== undefined && !selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Collision Density</label>
                <span>{selectedCircuit.order_val?.toFixed?.(3) ?? selectedCircuit.order_val}</span>
              </div>
            )}
            {selectedCircuit.gate_counts && (
              <div className="detail-item">
                 <label>Stored Gate Counts</label>
                 <code>{JSON.stringify(selectedCircuit.gate_counts)}</code>
              </div>
            )}
            {selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Coverage</label>
                <span>
                  {(selectedCircuit.metrics.wire_coverage * 100).toFixed(1)}% ·
                  {` wires ${selectedCircuit.metrics.wires_used}`}
                </span>
              </div>
            )}
            {selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Wire Degree</label>
                <span>
                  max {selectedCircuit.metrics.max_wire_degree} · avg {selectedCircuit.metrics.avg_wire_degree.toFixed(2)}
                </span>
              </div>
            )}
            {selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Adj Collisions</label>
                <span>
                  {selectedCircuit.metrics.adjacent_collisions} / {selectedCircuit.metrics.adjacent_collisions + selectedCircuit.metrics.adjacent_commutes}
                </span>
              </div>
            )}
            {selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Total Collisions</label>
                <span>{selectedCircuit.metrics.total_collisions}</span>
              </div>
            )}
            {selectedCircuit.metrics && (
              <div className="detail-item">
                <label>Collision Density</label>
                <span>{selectedCircuit.metrics.collision_density.toFixed(3)}</span>
              </div>
            )}
          </div>

          {selectedCircuit.diagram && (
            <div className="diagram-box">
              <label>Circuit Diagram</label>
              <pre>{selectedCircuit.diagram}</pre>
            </div>
          )}

          <div className="gates-list">
            <label>Gates ({selectedCircuit.gates?.length || 0})</label>
            <div className="gates-grid">
              {selectedCircuit.gates?.map((gate, i) => {
                // SAT format: [controls[], target] - e.g. [[1], 0] means CX with ctrl=1, target=0
                // Go format: {active, ctrl1, ctrl2}
                let gateStr = '';
                if (Array.isArray(gate) && gate.length === 2) {
                  const [controls, target] = gate;
                  if (Array.isArray(controls) && controls.length === 0) {
                    gateStr = `X(${target})`;
                  } else if (Array.isArray(controls) && controls.length === 1) {
                    gateStr = `CX(${controls[0]}→${target})`;
                  } else if (Array.isArray(controls) && controls.length >= 2) {
                    gateStr = `CCX(${controls.join(',')}→${target})`;
                  } else {
                    gateStr = `[${JSON.stringify(controls)},${target}]`;
                  }
                } else if (
                  typeof gate === 'object' &&
                  gate.active !== undefined
                ) {
                  gateStr = `CCX(${gate.ctrl1},${gate.ctrl2}→${gate.active})`;
                } else {
                  gateStr = String(gate);
                }
                return (
                  <div key={i} className="gate-chip">
                    {gateStr}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dual-database-view {
          padding: 20px 0;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #fff;
        }

        .section-desc {
          color: rgba(200, 200, 220, 0.6);
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .database-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .database-panel {
          background: linear-gradient(
            135deg,
            rgba(30, 30, 40, 0.9),
            rgba(20, 20, 30, 0.95)
          );
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(100, 100, 150, 0.2);
        }

        .sat-panel {
          border-color: rgba(255, 150, 100, 0.3);
        }
        .go-panel {
          border-color: rgba(100, 200, 255, 0.3);
        }
        .cluster-panel {
          border-color: rgba(150, 255, 150, 0.3);
        }
        .perm-panel {
          border-color: rgba(220, 100, 255, 0.3);
        }
        .wire-panel {
          border-color: rgba(255, 200, 120, 0.3);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-title h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #fff;
        }

        .icon {
          width: 20px;
          height: 20px;
        }
        .icon-sm {
          width: 16px;
          height: 16px;
        }

        .status-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.complete {
          background: rgba(100, 255, 150, 0.2);
          color: #8affb4;
        }
        .status-badge.generating {
          background: rgba(255, 200, 100, 0.2);
          color: #ffcc66;
        }
        .status-badge.not_found,
        .status-badge.unknown {
          background: rgba(150, 150, 150, 0.2);
          color: #aaa;
        }

        .refresh-btn {
          background: rgba(100, 100, 150, 0.2);
          border: none;
          border-radius: 8px;
          padding: 8px;
          color: rgba(200, 200, 220, 0.7);
          cursor: pointer;
        }

        .refresh-btn:hover {
          background: rgba(100, 100, 150, 0.4);
          color: #fff;
        }

        .stats-row {
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
        }

        .mini-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .mini-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.2);
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(100, 100, 150, 0.2);
        }

        .mini-label {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .mini-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .mini-chip {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.9);
          background: rgba(100, 150, 255, 0.15);
          border: 1px solid rgba(100, 150, 255, 0.25);
          padding: 2px 6px;
          border-radius: 999px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.2);
          padding: 12px 16px;
          border-radius: 8px;
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-label {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
        }

        .expand-btn,
        .db-file-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(100, 100, 150, 0.15);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 8px;
          padding: 10px 12px;
          color: rgba(200, 200, 220, 0.9);
          cursor: pointer;
          font-size: 0.9rem;
        }

        .expand-btn:hover,
        .db-file-header:hover {
          background: rgba(100, 100, 150, 0.25);
        }

        .db-file-header.selected {
          background: rgba(255, 255, 255, 0.06);
        }

        .filter-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-row label {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
        }

        .filter-row select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(100, 100, 150, 0.4);
          color: #fff;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .segmented {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .segmented-btn {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(100, 100, 150, 0.3);
          color: rgba(200, 200, 220, 0.7);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .segmented-btn.active {
          background: rgba(100, 150, 255, 0.25);
          border-color: rgba(100, 150, 255, 0.5);
          color: #cfe3ff;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.15);
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(100, 100, 150, 0.2);
        }

        .filter-item label {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
        }

        .range-input {
          display: flex;
          gap: 6px;
        }

        .range-input input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(100, 100, 150, 0.3);
          color: #fff;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .action-btn {
          background: rgba(100, 150, 255, 0.25);
          border: 1px solid rgba(100, 150, 255, 0.4);
          color: #cfe3ff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .action-btn.secondary {
          background: rgba(0, 0, 0, 0.25);
          border-color: rgba(100, 100, 150, 0.3);
          color: rgba(200, 200, 220, 0.7);
        }

        .db-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .db-name {
          font-weight: 600;
          flex: 1;
          text-align: left;
        }
        .db-meta {
          color: rgba(200, 200, 220, 0.6);
          font-size: 0.8rem;
        }
        .db-size {
          color: rgba(200, 200, 220, 0.5);
          font-size: 0.75rem;
        }

        .circuits-list {
          margin-top: 12px;
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .circuit-item {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .circuit-item:hover {
          background: rgba(100, 150, 255, 0.15);
        }
        .circuit-item.selected {
          background: rgba(100, 150, 255, 0.3);
          border: 1px solid rgba(100, 150, 255, 0.5);
        }

        .circuit-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .circuit-dim {
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          font-size: 0.85rem;
        }

        .circuit-cycle {
          font-family: 'SF Mono', monospace;
          color: rgba(150, 200, 255, 0.8);
          font-size: 0.8rem;
        }

        .loading-state,
        .empty-state {
          text-align: center;
          padding: 20px;
          color: rgba(200, 200, 220, 0.5);
        }

        .circuit-details {
          background: linear-gradient(
            135deg,
            rgba(40, 40, 60, 0.95),
            rgba(30, 30, 50, 0.98)
          );
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(100, 150, 255, 0.3);
          position: relative;
        }

        .circuit-details h3 {
          margin: 0 0 20px 0;
          font-size: 1.1rem;
          color: #fff;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 100, 100, 0.2);
          border: none;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          color: #ff8a8a;
          cursor: pointer;
          font-size: 1.2rem;
        }

        .close-btn:hover {
          background: rgba(255, 100, 100, 0.4);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item label {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
        }

        .detail-item code,
        .detail-item span {
          font-family: 'SF Mono', monospace;
          color: #fff;
          font-size: 0.9rem;
        }

        .diagram-box {
          margin-bottom: 20px;
        }

        .diagram-box label {
          display: block;
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .diagram-box pre {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: 8px;
          font-family: 'SF Mono', monospace;
          font-size: 0.85rem;
          overflow-x: auto;
          color: rgba(200, 200, 220, 0.9);
        }

        .gates-list label {
          display: block;
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .gates-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .gate-chip {
          background: rgba(100, 150, 255, 0.2);
          padding: 4px 10px;
          border-radius: 4px;
          font-family: 'SF Mono', monospace;
          font-size: 0.8rem;
          color: rgba(150, 200, 255, 0.9);
        }

        @media (max-width: 900px) {
          .database-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
