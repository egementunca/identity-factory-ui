'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { RefreshCw, Shuffle, Activity, Hash, Layers, Zap, Play, Loader2 } from 'lucide-react';
import {
  API_BASE,
  generateWaksmanCircuit,
  getWaksmanStats,
  getWaksmanCircuits,
  generateWaksmanBatch,
  WaksmanCircuit,
  WaksmanStatsResponse,
} from '@/lib/api';

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

interface WireShufflerMetricsSummary {
  count: number;
  metrics: Record<string, { min: number; avg: number; max: number }>;
}

interface WireShufflerSummary {
  width: number;
  total_permutations: number;
  total_circuits: number;
  gate_count_rows: { gate_count: number; circuit_count: number }[];
  permutation_rows: {
    wire_perm_hash: string;
    wire_perm: number[];
    cycle_type: string;
    hamming: number;
    swap_distance: number;
    total_circuits: number;
    found_circuits: number;
    min_gate_count?: number | null;
    max_gate_count?: number | null;
    gate_counts: Record<string, number>;
  }[];
  cycle_rows: {
    cycle_type: string;
    perm_count: number;
    circuit_count: number;
    min_gate_count?: number | null;
    max_gate_count?: number | null;
    gate_counts: Record<string, number>;
  }[];
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

interface WireCircuitEntry {
  id: number;
  width: number;
  wire_perm_hash: string;
  wire_perm: number[];
  gate_count?: number | null;
  gates?: number[][] | null;
  found: boolean;
  is_best: boolean;
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

const emptyFilters = (): WireFilterState => ({
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

function StatBar({
  label,
  count,
  max,
  onClick,
}: {
  label: string;
  count: number;
  max: number;
  onClick?: () => void;
}) {
  const pct = max > 0 ? Math.max(6, (count / max) * 100) : 0;
  return (
    <div
      className={`flex items-center gap-3 text-xs ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <span className="w-12 text-slate-300">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className="h-2 rounded-full bg-indigo-400/80"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-slate-400">{count}</span>
    </div>
  );
}

function MetricRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value?: { min: number; avg: number; max: number };
  suffix?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-xs text-slate-300">
      <span className="uppercase tracking-wide text-slate-400">{label}</span>
      <span>
        min {value.min.toFixed(2)}
        {suffix} · avg {value.avg.toFixed(2)}
        {suffix} · max {value.max.toFixed(2)}
        {suffix}
      </span>
    </div>
  );
}

export default function WireShufflerPage() {
  const [stats, setStats] = useState<WireShufflerStats | null>(null);
  const [metrics, setMetrics] = useState<WireShufflerMetricsSummary | null>(null);
  const [summary, setSummary] = useState<WireShufflerSummary | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [mode, setMode] = useState<'perms' | 'circuits'>('perms');
  const [perms, setPerms] = useState<WirePermutationEntry[]>([]);
  const [circuits, setCircuits] = useState<WireCircuitEntry[]>([]);
  const [filters, setFilters] = useState<WireFilterState>(emptyFilters());
  const [selected, setSelected] = useState<WireCircuitEntry | null>(null);
  const [selectedPermHash, setSelectedPermHash] = useState<string | null>(null);
  const [selectedCircuitId, setSelectedCircuitId] = useState<number | null>(null);
  const [selectedPerm, setSelectedPerm] = useState<number[] | null>(null);
  const [cycleFilter, setCycleFilter] = useState<string | null>(null);
  const [gateCountFilter, setGateCountFilter] = useState<number | null>(null);
  const [summaryTab, setSummaryTab] = useState<'perms' | 'cycles' | 'gates'>(
    'perms'
  );

  // Waksman generator state
  const [waksmanWidth, setWaksmanWidth] = useState<number>(8);
  const [waksmanPermType, setWaksmanPermType] = useState<'random' | 'reverse' | 'shift' | 'identity' | 'custom'>('random');
  const [waksmanCustomPerm, setWaksmanCustomPerm] = useState<string>('');
  const [waksmanShiftAmount, setWaksmanShiftAmount] = useState<number>(1);
  const [waksmanGenerating, setWaksmanGenerating] = useState(false);
  const [waksmanResult, setWaksmanResult] = useState<WaksmanCircuit | null>(null);
  const [waksmanError, setWaksmanError] = useState<string | null>(null);
  const [waksmanStats, setWaksmanStats] = useState<WaksmanStatsResponse | null>(null);
  const [waksmanCircuits, setWaksmanCircuits] = useState<WaksmanCircuit[]>([]);
  const [waksmanBatchCount, setWaksmanBatchCount] = useState<number>(10);
  const [waksmanBatchGenerating, setWaksmanBatchGenerating] = useState(false);
  const [waksmanObfuscate, setWaksmanObfuscate] = useState<boolean>(false);
  const [waksmanMinIdentityGates, setWaksmanMinIdentityGates] = useState<number>(36);

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE}/wire-shuffler/stats`);
    if (res.ok) {
      const data: WireShufflerStats = await res.json();
      setStats(data);
      if (width === null && Object.keys(data.by_width).length > 0) {
        const first = Object.keys(data.by_width)
          .map((v) => parseInt(v, 10))
          .sort((a, b) => a - b)[0];
        setWidth(first);
      }
    }
  };

  const fetchMetrics = async (w?: number | null) => {
    const params = new URLSearchParams();
    if (w !== null && w !== undefined) params.set('width', String(w));
    params.set('best_only', 'true');
    const res = await fetch(
      `${API_BASE}/wire-shuffler/metrics-summary?${params.toString()}`
    );
    if (res.ok) {
      setMetrics(await res.json());
    }
  };

  const fetchSummary = async (w: number) => {
    const res = await fetch(
      `${API_BASE}/wire-shuffler/summary?width=${w}`
    );
    if (res.ok) {
      setSummary(await res.json());
    }
  };

  const fetchPerms = async (w: number, cycleType?: string | null) => {
    const params = new URLSearchParams();
    params.set('width', String(w));
    params.set('limit', '200');
    params.set('offset', '0');
    if (cycleType) {
      params.set('cycle_type', cycleType);
    }
    const res = await fetch(
      `${API_BASE}/wire-shuffler/permutations?${params.toString()}`
    );
    if (res.ok) {
      const data: { entries: WirePermutationEntry[] } = await res.json();
      setPerms(data.entries);
    }
  };

  const fetchCircuits = async (
    w: number,
    filterOverride?: WireFilterState,
    gateCountOverride?: number | null
  ) => {
    const params = new URLSearchParams();
    params.set('width', String(w));
    params.set('is_best', 'true');
    params.set('found', 'true');
    params.set('limit', '100');
    params.set('offset', '0');
    const gc = gateCountOverride ?? gateCountFilter;
    if (gc !== null && gc !== undefined) {
      params.set('gate_count', String(gc));
    }
    const active = filterOverride ?? filters;
    Object.entries(active).forEach(([key, value]) => {
      if (value !== '' && !Number.isNaN(Number(value))) {
        params.set(key, value);
      }
    });
    const res = await fetch(
      `${API_BASE}/wire-shuffler/circuits?${params.toString()}`
    );
    if (res.ok) {
      const data: { entries: WireCircuitEntry[] } = await res.json();
      setCircuits(data.entries.map(withMetrics));
    }
  };

  const fetchCircuitByPerm = async (permHash: string) => {
    const res = await fetch(
      `${API_BASE}/wire-shuffler/circuits?perm_hash=${permHash}&is_best=true&found=true&limit=1`
    );
    if (res.ok) {
      const data: { entries: WireCircuitEntry[] } = await res.json();
      if (data.entries?.[0]) {
        const entry = withMetrics(data.entries[0]);
        setSelected(entry);
        setSelectedPermHash(permHash);
        setSelectedCircuitId(entry.id);
        setSelectedPerm(entry.wire_perm);
      } else {
        setSelected(null);
        setSelectedCircuitId(null);
      }
    }
  };

  // Waksman functions
  const fetchWaksmanStats = async () => {
    try {
      const data = await getWaksmanStats();
      setWaksmanStats(data);
    } catch (e) {
      console.error('Failed to fetch Waksman stats:', e);
    }
  };

  const fetchWaksmanCircuits = async (w?: number) => {
    try {
      const data = await getWaksmanCircuits(w, 20);
      setWaksmanCircuits(data);
    } catch (e) {
      console.error('Failed to fetch Waksman circuits:', e);
    }
  };

  const handleGenerateWaksman = async () => {
    setWaksmanGenerating(true);
    setWaksmanError(null);
    setWaksmanResult(null);

    try {
      let perm: number[] | undefined;
      let permType: 'specific' | 'random' | 'reverse' | 'shift' | 'identity' = waksmanPermType === 'custom' ? 'specific' : waksmanPermType;

      if (waksmanPermType === 'custom') {
        const parsed = waksmanCustomPerm.split(',').map(s => parseInt(s.trim(), 10));
        if (parsed.length !== waksmanWidth || parsed.some(isNaN)) {
          throw new Error(`Invalid permutation. Expected ${waksmanWidth} comma-separated integers.`);
        }
        if ([...parsed].sort((a, b) => a - b).join(',') !== [...Array(waksmanWidth).keys()].join(',')) {
          throw new Error('Invalid permutation. Must be a permutation of 0 to width-1.');
        }
        perm = parsed;
      }

      const result = await generateWaksmanCircuit({
        width: waksmanWidth,
        permutation: perm,
        permutation_type: permType,
        shift_amount: waksmanPermType === 'shift' ? waksmanShiftAmount : undefined,
        store_in_db: true,
        obfuscate: waksmanObfuscate,
        min_identity_gates: waksmanObfuscate ? waksmanMinIdentityGates : undefined,
      });

      setWaksmanResult(result);
      fetchWaksmanStats();
      fetchWaksmanCircuits(waksmanWidth);
    } catch (e: unknown) {
      setWaksmanError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setWaksmanGenerating(false);
    }
  };

  const handleGenerateWaksmanBatch = async () => {
    setWaksmanBatchGenerating(true);
    setWaksmanError(null);

    try {
      const result = await generateWaksmanBatch({
        width: waksmanWidth,
        count: waksmanBatchCount,
        store_in_db: true,
      });
      setWaksmanError(null);
      alert(`Generated ${result.circuits_generated} Waksman circuits!`);
      fetchWaksmanStats();
      fetchWaksmanCircuits(waksmanWidth);
    } catch (e: unknown) {
      setWaksmanError(e instanceof Error ? e.message : 'Batch generation failed');
    } finally {
      setWaksmanBatchGenerating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchWaksmanStats();
  }, []);

  useEffect(() => {
    if (width !== null) {
      setSelected(null);
      setSelectedPermHash(null);
      setSelectedCircuitId(null);
      setSelectedPerm(null);
      fetchMetrics(width);
      fetchSummary(width);
      if (mode === 'perms') {
        fetchPerms(width, cycleFilter);
      } else {
        fetchCircuits(width);
      }
    }
  }, [width, mode, cycleFilter]);

  const updateFilter = (key: keyof WireFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const cleared = emptyFilters();
    setFilters(cleared);
    return cleared;
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

  const formatCycle = (cycles: number[][]) =>
    cycles.length === 0 ? 'id' : cycles.map((c) => `(${c.join(' ')})`).join('');

  const formatGateCounts = (counts: Record<string, number>) => {
    const entries = Object.entries(counts).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
    if (entries.length === 0) return '—';
    return entries.map(([g, c]) => `${g}g:${c}`).join(' · ');
  };

  const filteredPerms = cycleFilter
    ? perms.filter((p) => p.cycle_type === cycleFilter)
    : perms;

  const drawAscii = (width: number, gates?: number[][] | null) => {
    if (!gates || gates.length === 0) {
      return Array.from({ length: width }, (_, i) => `q${i}: -`).join('\n');
    }
    // Determine actual circuit width from gate indices (may include aux wire)
    const maxWire = gates.reduce((max, gate) => Math.max(max, ...gate), 0);
    const actualWidth = Math.max(width, maxWire + 1);
    const cols = gates.length * 2 + 1;
    const grid: string[][] = Array.from({ length: actualWidth }, () =>
      Array.from({ length: cols }, () => '-')
    );
    gates.forEach((gate, idx) => {
      const col = idx * 2 + 1;
      if (gate.length === 2) {
        // 2-wire swap gate [wire_a, wire_b]
        const [a, b] = gate;
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let w = lo; w <= hi; w++) {
          grid[w][col] = '|';
        }
        grid[a][col] = 'X';
        grid[b][col] = 'X';
      } else {
        // Toffoli/ECA57 gate [target, c1, c2]
        const [target, c1, c2] = gate;
        const lo = Math.min(target, c1, c2);
        const hi = Math.max(target, c1, c2);
        for (let w = lo; w <= hi; w++) {
          grid[w][col] = '|';
        }
        grid[target][col] = 'X';
        grid[c1][col] = '●';
        grid[c2][col] = '○';
      }
    });
    return grid.map((row, i) => `q${i}: ${row.join('')}`).join('\n');
  };

  const calcMetrics = (width: number, gates?: number[][] | null) => {
    if (!gates || gates.length === 0) {
      return {
        wires_used: 0,
        wire_coverage: 0,
        max_wire_degree: 0,
        avg_wire_degree: 0,
        adjacent_collisions: 0,
        adjacent_commutes: 0,
        total_collisions: 0,
        collision_density: 0,
      };
    }
    // Determine actual circuit width from gate indices (may include aux wire)
    const maxWire = gates.reduce((max, gate) => Math.max(max, ...gate), 0);
    const actualWidth = Math.max(width, maxWire + 1);
    const degrees = new Array(actualWidth).fill(0);
    gates.forEach((gate) => {
      gate.forEach((w) => {
        if (w !== undefined && w < actualWidth) degrees[w] += 1;
      });
    });
    const wires_used = degrees.filter((d) => d > 0).length;
    const wire_coverage = actualWidth > 0 ? wires_used / actualWidth : 0;
    const max_wire_degree = Math.max(...degrees);
    const avg_wire_degree =
      actualWidth > 0 ? degrees.reduce((a, b) => a + b, 0) / actualWidth : 0;

    const gatesCollide = (g1: number[], g2: number[]) => {
      // Check if any wire in g1 appears in g2
      return g1.some((w) => g2.includes(w));
    };

    let adjacent_collisions = 0;
    for (let i = 0; i < gates.length - 1; i++) {
      if (gatesCollide(gates[i], gates[i + 1])) adjacent_collisions += 1;
    }
    const adjacent_commutes = gates.length - 1 - adjacent_collisions;

    let total_collisions = 0;
    for (let i = 0; i < gates.length; i++) {
      for (let j = i + 1; j < gates.length; j++) {
        if (gatesCollide(gates[i], gates[j])) total_collisions += 1;
      }
    }
    const total_pairs = (gates.length * (gates.length - 1)) / 2;
    const collision_density = total_pairs > 0 ? total_collisions / total_pairs : 0;

    return {
      wires_used,
      wire_coverage,
      max_wire_degree,
      avg_wire_degree,
      adjacent_collisions,
      adjacent_commutes,
      total_collisions,
      collision_density,
    };
  };

  const withMetrics = (entry: WireCircuitEntry) => {
    if (entry.metrics || !entry.gates) return entry;
    return {
      ...entry,
      metrics: calcMetrics(entry.wire_perm.length, entry.gates),
    };
  };

  const widthEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_width || {}).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
  }, [stats]);

  const cycleEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_cycle_type || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [stats]);

  const hammingEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_hamming || {}).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
  }, [stats]);

  const swapEntries = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.by_swap_distance || {}).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
  }, [stats]);

  const maxWidthCount = Math.max(
    ...widthEntries.map(([, c]) => c),
    1
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Navigation />
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Wire Shuffler Explorer</h1>
            <p className="text-sm text-slate-400">
              Explore wire permutations and ECA57 circuits with grouping stats
              and metric filters.
            </p>
          </div>
          <button
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700/50"
            onClick={() => {
              fetchStats();
              if (width !== null) fetchMetrics(width);
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        <section className="grid md:grid-cols-4 gap-4">
          <div className="glass-panel-dark p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shuffle size={14} /> permutations
            </div>
            <div className="text-2xl font-semibold">
              {stats?.total_permutations ?? 0}
            </div>
          </div>
          <div className="glass-panel-dark p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Layers size={14} /> circuits
            </div>
            <div className="text-2xl font-semibold">
              {stats?.total_circuits ?? 0}
            </div>
          </div>
          <div className="glass-panel-dark p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Hash size={14} /> widths
            </div>
            <div className="text-2xl font-semibold">
              {stats ? Object.keys(stats.by_width || {}).length : 0}
            </div>
          </div>
          <div className="glass-panel-dark p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Activity size={14} /> cycle types
            </div>
            <div className="text-2xl font-semibold">
              {stats ? Object.keys(stats.by_cycle_type || {}).length : 0}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <div className="glass-panel-dark p-4 space-y-3">
            <div className="text-sm font-semibold">By Width</div>
            {widthEntries.map(([label, count]) => (
              <StatBar
                key={label}
                label={`${label}w`}
                count={count}
                max={maxWidthCount}
                onClick={() => setWidth(Number(label))}
              />
            ))}
          </div>
          <div className="glass-panel-dark p-4 space-y-3">
            <div className="text-sm font-semibold">Cycle Types (Top)</div>
            {cycleEntries.map(([label, count]) => (
              <StatBar key={label} label={label} count={count} max={cycleEntries[0]?.[1] || 1} />
            ))}
          </div>
          <div className="glass-panel-dark p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold mb-2">Parity</div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(stats?.by_parity || {}).map(([label, count]) => (
                  <span
                    key={label}
                    className="px-2 py-1 text-xs rounded-full bg-slate-800/80 border border-slate-700/60"
                  >
                    {label} · {count}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Hamming</div>
              {hammingEntries.map(([label, count]) => (
                <StatBar
                  key={label}
                  label={label}
                  count={count}
                  max={hammingEntries[0]?.[1] || 1}
                />
              ))}
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Swap Distance</div>
              {swapEntries.map(([label, count]) => (
                <StatBar
                  key={label}
                  label={label}
                  count={count}
                  max={swapEntries[0]?.[1] || 1}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel-dark p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              Metrics Summary {width !== null ? `(width ${width})` : ''}
            </div>
            <div className="text-xs text-slate-400">
              {metrics?.count ?? 0} circuits (best only)
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <MetricRow
              label="coverage"
              value={metrics?.metrics?.wire_coverage}
            />
            <MetricRow
              label="collision density"
              value={metrics?.metrics?.collision_density}
            />
            <MetricRow
              label="adjacent collisions"
              value={metrics?.metrics?.adjacent_collisions}
            />
            <MetricRow
              label="total collisions"
              value={metrics?.metrics?.total_collisions}
            />
            <MetricRow
              label="max wire degree"
              value={metrics?.metrics?.max_wire_degree}
            />
            <MetricRow
              label="avg wire degree"
              value={metrics?.metrics?.avg_wire_degree}
            />
            <MetricRow label="wires used" value={metrics?.metrics?.wires_used} />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="glass-panel-dark p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Explorer</div>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1 rounded-md text-xs border ${
                    mode === 'perms'
                      ? 'bg-indigo-500/30 border-indigo-400/60'
                      : 'bg-slate-800/70 border-slate-700/60'
                  }`}
                  onClick={() => setMode('perms')}
                >
                  Permutations
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-xs border ${
                    mode === 'circuits'
                      ? 'bg-indigo-500/30 border-indigo-400/60'
                      : 'bg-slate-800/70 border-slate-700/60'
                  }`}
                  onClick={() => setMode('circuits')}
                >
                  Circuits
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">Width</span>
              <select
                className="bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1"
                value={width ?? ''}
                onChange={(e) => setWidth(parseInt(e.target.value, 10))}
              >
                {Object.keys(stats?.by_width || {})
                  .map((v) => parseInt(v, 10))
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <option key={v} value={v}>
                      {v} wires
                    </option>
                  ))}
              </select>
            </div>

            {mode === 'circuits' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(
                  [
                    ['Coverage', 'min_wire_coverage', 'max_wire_coverage', 0.01],
                    [
                      'Collision Density',
                      'min_collision_density',
                      'max_collision_density',
                      0.01,
                    ],
                    [
                      'Adj Collisions',
                      'min_adjacent_collisions',
                      'max_adjacent_collisions',
                      1,
                    ],
                    [
                      'Total Collisions',
                      'min_total_collisions',
                      'max_total_collisions',
                      1,
                    ],
                    ['Max Degree', 'min_max_wire_degree', 'max_max_wire_degree', 1],
                    ['Avg Degree', 'min_avg_wire_degree', 'max_avg_wire_degree', 0.1],
                    ['Wires Used', 'min_wires_used', 'max_wires_used', 1],
                  ] as const
                ).map(([label, minKey, maxKey, step]) => (
                  <div key={label} className="space-y-1">
                    <div className="text-slate-400">{label}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step={step}
                        placeholder="min"
                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1"
                        value={filters[minKey]}
                        onChange={(e) => updateFilter(minKey, e.target.value)}
                      />
                      <input
                        type="number"
                        step={step}
                        placeholder="max"
                        className="w-full bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1"
                        value={filters[maxKey]}
                        onChange={(e) => updateFilter(maxKey, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 col-span-2">
                  <button
                    className="px-3 py-1 text-xs rounded-md bg-indigo-500/30 border border-indigo-400/60"
                    onClick={() => width !== null && fetchCircuits(width)}
                  >
                    Apply Filters
                  </button>
                  <button
                    className="px-3 py-1 text-xs rounded-md bg-slate-800/70 border border-slate-700/60"
                    onClick={() => {
                      const cleared = resetFilters();
                      if (width !== null) fetchCircuits(width, cleared);
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {mode === 'perms' && cycleFilter && (
              <div className="text-xs text-slate-400">
                Filtering by cycle type <span className="text-slate-200">{cycleFilter}</span>{' '}
                <button
                  className="ml-2 text-indigo-300 hover:text-indigo-200"
                  onClick={() => setCycleFilter(null)}
                >
                  clear
                </button>
              </div>
            )}
            {mode === 'circuits' && gateCountFilter !== null && (
              <div className="text-xs text-slate-400">
                Gate count filter <span className="text-slate-200">{gateCountFilter}g</span>{' '}
                <button
                  className="ml-2 text-indigo-300 hover:text-indigo-200"
                  onClick={() => {
                    setGateCountFilter(null);
                    if (width !== null) fetchCircuits(width, undefined, null);
                  }}
                >
                  clear
                </button>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {mode === 'perms' && (
                <div className="text-[11px] text-slate-400 pb-1">
                  type = cycle lengths · h = moved wires · s = min swaps
                </div>
              )}
              {mode === 'perms' &&
                filteredPerms.map((entry) => (
                  <div
                    key={entry.wire_perm_hash}
                    className={`p-3 rounded-lg border cursor-pointer hover:border-indigo-400/40 ${
                      selectedPermHash === entry.wire_perm_hash
                        ? 'bg-indigo-500/15 border-indigo-400/50'
                        : 'bg-slate-900/60 border-slate-800/70'
                    }`}
                    onClick={() => {
                      setSelectedPermHash(entry.wire_perm_hash);
                      setSelectedPerm(entry.wire_perm);
                      setSelectedCircuitId(null);
                      setSelected(null);
                      fetchCircuitByPerm(entry.wire_perm_hash);
                    }}
                  >
                    <div className="flex justify-between text-sm">
                      <span>({entry.wire_perm.join(', ')})</span>
                      <span className="text-slate-400">
                        best {entry.best_gate_count ?? '-'}g
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      type {entry.cycle_type} · h{entry.hamming} · s{entry.swap_distance}
                    </div>
                  </div>
                ))}
              {mode === 'circuits' &&
                circuits.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:border-indigo-400/40 ${
                      selectedCircuitId === entry.id
                        ? 'bg-indigo-500/15 border-indigo-400/50'
                        : 'bg-slate-900/60 border-slate-800/70'
                    }`}
                    onClick={() => {
                      setSelected(withMetrics(entry));
                      setSelectedCircuitId(entry.id);
                      setSelectedPermHash(entry.wire_perm_hash);
                      setSelectedPerm(entry.wire_perm);
                    }}
                  >
                    <div className="flex justify-between text-sm">
                      <span>
                        {entry.width}w × {entry.gate_count ?? '-'}g
                      </span>
                      <span className="text-slate-400">
                        dens {entry.metrics?.collision_density?.toFixed?.(2) ?? '-'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      cov {entry.metrics?.wire_coverage?.toFixed?.(2) ?? '-'} ·
                      wires {entry.metrics?.wires_used ?? '-'}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass-panel-dark p-4 space-y-4">
            <div className="text-sm font-semibold">Selected Circuit</div>
            {!selected ? (
              selectedPerm ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Permutation</div>
                    <div className="font-mono">[{selectedPerm.join(', ')}]</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Cycle Notation</div>
                    <div className="font-mono">
                      {formatCycle(cycleFromPerm(selectedPerm))}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">
                    No circuit found for this permutation within the current gate bound.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Select a permutation or circuit to inspect.
                </div>
              )
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Permutation</div>
                  <div className="font-mono">
                    [{selected.wire_perm.join(', ')}]
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cycle Notation</div>
                  <div className="font-mono">
                    {formatCycle(cycleFromPerm(selected.wire_perm))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                    <div className="text-slate-400">Gate Count</div>
                    <div className="text-base font-semibold">
                      {selected.gate_count ?? '-'}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                    <div className="text-slate-400">Collision Density</div>
                    <div className="text-base font-semibold">
                      {selected.metrics?.collision_density?.toFixed?.(3) ?? '-'}
                    </div>
                  </div>
                </div>
                {selected.metrics && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>Coverage: {(selected.metrics.wire_coverage * 100).toFixed(1)}%</div>
                    <div>Wires Used: {selected.metrics.wires_used}</div>
                    <div>Max Degree: {selected.metrics.max_wire_degree}</div>
                    <div>Avg Degree: {selected.metrics.avg_wire_degree.toFixed(2)}</div>
                    <div>Adj Collisions: {selected.metrics.adjacent_collisions}</div>
                    <div>Total Collisions: {selected.metrics.total_collisions}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-400 mb-1">
                    ASCII Diagram
                  </div>
                  <pre className="text-xs font-mono bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 overflow-x-auto">
                    {drawAscii(selected.wire_perm.length, selected.gates)}
                  </pre>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">
                    Gates ({selected.gates?.length ?? 0})
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(selected.gates || []).map((g, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded bg-slate-900/70 border border-slate-800/70 font-mono"
                      >
                        {g.join(',')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Exhaustive Tables</div>
              <div className="text-xs text-slate-400">
                Counts per permutation, cycle type, and gate count (width {width ?? '-'}).
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded-md text-xs border ${
                  summaryTab === 'perms'
                    ? 'bg-indigo-500/30 border-indigo-400/60'
                    : 'bg-slate-800/70 border-slate-700/60'
                }`}
                onClick={() => setSummaryTab('perms')}
              >
                Permutations
              </button>
              <button
                className={`px-3 py-1 rounded-md text-xs border ${
                  summaryTab === 'cycles'
                    ? 'bg-indigo-500/30 border-indigo-400/60'
                    : 'bg-slate-800/70 border-slate-700/60'
                }`}
                onClick={() => setSummaryTab('cycles')}
              >
                Cycle Types
              </button>
              <button
                className={`px-3 py-1 rounded-md text-xs border ${
                  summaryTab === 'gates'
                    ? 'bg-indigo-500/30 border-indigo-400/60'
                    : 'bg-slate-800/70 border-slate-700/60'
                }`}
                onClick={() => setSummaryTab('gates')}
              >
                Gate Counts
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Click a row: permutations select a circuit, cycle types filter the left list, gate counts filter circuits.
          </div>

          <div className="max-h-[420px] overflow-y-auto border border-slate-800/70 rounded-lg">
            {summaryTab === 'perms' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="text-left px-3 py-2">Permutation</th>
                    <th className="text-left px-3 py-2">Cycle</th>
                    <th className="text-left px-3 py-2">h</th>
                    <th className="text-left px-3 py-2">s</th>
                    <th className="text-left px-3 py-2">found</th>
                    <th className="text-left px-3 py-2">min g</th>
                    <th className="text-left px-3 py-2">max g</th>
                    <th className="text-left px-3 py-2">gate counts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-[11px] text-slate-500">
                    <td className="px-3 py-2" colSpan={8}>
                      h = moved wires (Hamming). s = min swaps. found = # circuits found. gate counts = histogram.
                    </td>
                  </tr>
                </tbody>
                <tbody>
                  {summary?.permutation_rows.map((row) => (
                    <tr
                      key={row.wire_perm_hash}
                      className={`border-t border-slate-800/70 hover:bg-slate-900/60 cursor-pointer ${
                        selectedPermHash === row.wire_perm_hash
                          ? 'bg-indigo-500/15'
                          : ''
                      }`}
                      onClick={() => fetchCircuitByPerm(row.wire_perm_hash)}
                    >
                      <td className="px-3 py-2 font-mono">
                        ({row.wire_perm.join(', ')})
                      </td>
                      <td className="px-3 py-2">{row.cycle_type}</td>
                      <td className="px-3 py-2">{row.hamming}</td>
                      <td className="px-3 py-2">{row.swap_distance}</td>
                      <td className="px-3 py-2">{row.found_circuits}</td>
                      <td className="px-3 py-2">
                        {row.min_gate_count ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.max_gate_count ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {formatGateCounts(row.gate_counts)}
                      </td>
                    </tr>
                  ))}
                  {!summary && (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={8}>
                        Loading summary...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {summaryTab === 'cycles' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="text-left px-3 py-2">Cycle Type</th>
                    <th className="text-left px-3 py-2">Perms</th>
                    <th className="text-left px-3 py-2">Circuits</th>
                    <th className="text-left px-3 py-2">min g</th>
                    <th className="text-left px-3 py-2">max g</th>
                    <th className="text-left px-3 py-2">gate counts</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.cycle_rows.map((row) => (
                    <tr
                      key={row.cycle_type}
                      className={`border-t border-slate-800/70 hover:bg-slate-900/60 cursor-pointer ${
                        cycleFilter === row.cycle_type ? 'bg-indigo-500/15' : ''
                      }`}
                      onClick={() => {
                        setCycleFilter(row.cycle_type);
                        setMode('perms');
                        if (width !== null) {
                          fetchPerms(width, row.cycle_type);
                        }
                      }}
                    >
                      <td className="px-3 py-2">{row.cycle_type}</td>
                      <td className="px-3 py-2">{row.perm_count}</td>
                      <td className="px-3 py-2">{row.circuit_count}</td>
                      <td className="px-3 py-2">
                        {row.min_gate_count ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.max_gate_count ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {formatGateCounts(row.gate_counts)}
                      </td>
                    </tr>
                  ))}
                  {!summary && (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={6}>
                        Loading summary...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {summaryTab === 'gates' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-900/80 text-slate-300">
                  <tr>
                    <th className="text-left px-3 py-2">Gate Count</th>
                    <th className="text-left px-3 py-2">Circuits</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.gate_count_rows.map((row) => (
                    <tr
                      key={row.gate_count}
                      className={`border-t border-slate-800/70 hover:bg-slate-900/60 cursor-pointer ${
                        gateCountFilter === row.gate_count ? 'bg-indigo-500/15' : ''
                      }`}
                      onClick={() => {
                        setGateCountFilter(row.gate_count);
                        setMode('circuits');
                        if (width !== null) {
                          fetchCircuits(width, undefined, row.gate_count);
                        }
                      }}
                    >
                      <td className="px-3 py-2">{row.gate_count}g</td>
                      <td className="px-3 py-2">{row.circuit_count}</td>
                    </tr>
                  ))}
                  {!summary && (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={2}>
                        Loading summary...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Waksman Network Generator Section */}
        <section className="glass-panel-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Zap size={16} className="text-yellow-400" />
                Waksman Network Generator
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Generate O(n log n) permutation circuits for large widths (8, 16, 32, 64).
                Uses swap-based networks with 6-gate ECA57 swap macros.
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Total: {waksmanStats?.total_circuits ?? 0} circuits
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Generator controls */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Width</div>
                  <select
                    className="bg-slate-900/60 border border-slate-700/60 rounded px-3 py-1.5 text-sm"
                    value={waksmanWidth}
                    onChange={(e) => {
                      setWaksmanWidth(parseInt(e.target.value, 10));
                      setWaksmanResult(null);
                    }}
                  >
                    {[4, 8, 16, 32, 64, 128].map((w) => (
                      <option key={w} value={w}>
                        {w} wires
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Permutation Type</div>
                  <select
                    className="bg-slate-900/60 border border-slate-700/60 rounded px-3 py-1.5 text-sm"
                    value={waksmanPermType}
                    onChange={(e) => setWaksmanPermType(e.target.value as typeof waksmanPermType)}
                  >
                    <option value="random">Random</option>
                    <option value="reverse">Reverse</option>
                    <option value="shift">Cyclic Shift</option>
                    <option value="identity">Identity</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {waksmanPermType === 'shift' && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">Shift Amount</div>
                    <input
                      type="number"
                      min={1}
                      max={waksmanWidth - 1}
                      className="w-20 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1.5 text-sm"
                      value={waksmanShiftAmount}
                      onChange={(e) => setWaksmanShiftAmount(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Obfuscate</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-700/60 bg-slate-900/60 text-indigo-500 focus:ring-indigo-500/30"
                      checked={waksmanObfuscate}
                      onChange={(e) => setWaksmanObfuscate(e.target.checked)}
                    />
                    <span className="text-xs text-slate-300">Fill identity slots</span>
                  </label>
                </div>
                {waksmanObfuscate && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">Min Identity Gates</div>
                    <select
                      className="bg-slate-900/60 border border-slate-700/60 rounded px-3 py-1.5 text-sm"
                      value={waksmanMinIdentityGates}
                      onChange={(e) => setWaksmanMinIdentityGates(parseInt(e.target.value, 10))}
                    >
                      <option value={12}>12 (short)</option>
                      <option value={24}>24 (medium)</option>
                      <option value={36}>36 (long)</option>
                      <option value={48}>48 (very long)</option>
                      <option value={60}>60 (extra long)</option>
                      <option value={72}>72 (maximum)</option>
                    </select>
                  </div>
                )}
              </div>

              {waksmanPermType === 'custom' && (
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Custom Permutation (comma-separated)</div>
                  <input
                    type="text"
                    className="w-full bg-slate-900/60 border border-slate-700/60 rounded px-3 py-1.5 text-sm font-mono"
                    placeholder={`e.g., ${[...Array(waksmanWidth).keys()].reverse().join(', ')}`}
                    value={waksmanCustomPerm}
                    onChange={(e) => setWaksmanCustomPerm(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-500/30 border border-indigo-400/60 hover:bg-indigo-500/40 disabled:opacity-50"
                  onClick={handleGenerateWaksman}
                  disabled={waksmanGenerating}
                >
                  {waksmanGenerating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                  Generate Single
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    className="w-20 bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1.5 text-sm"
                    value={waksmanBatchCount}
                    onChange={(e) => setWaksmanBatchCount(parseInt(e.target.value, 10) || 10)}
                  />
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-800/70 border border-slate-700/60 hover:bg-slate-800/90 disabled:opacity-50"
                    onClick={handleGenerateWaksmanBatch}
                    disabled={waksmanBatchGenerating}
                  >
                    {waksmanBatchGenerating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Shuffle size={16} />
                    )}
                    Batch Random
                  </button>
                </div>
              </div>

              {waksmanError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  {waksmanError}
                </div>
              )}

              {/* Waksman stats by width */}
              {waksmanStats && Object.keys(waksmanStats.by_width).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">Stats by Width</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(waksmanStats.by_width)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([w, data]) => (
                        <div
                          key={w}
                          className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70"
                        >
                          <div className="font-semibold">{w}w</div>
                          <div className="text-slate-400">
                            {(data as { count?: number }).count ?? '-'} circuits
                            {' · '}
                            avg {((data as { avg_gates?: number }).avg_gates ?? 0).toFixed(0)}g
                            {' · '}
                            avg {((data as { avg_swaps?: number }).avg_swaps ?? 0).toFixed(0)} swaps
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Result display */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Generated Circuit</div>
              {!waksmanResult ? (
                <div className="text-sm text-slate-400">
                  Click &quot;Generate&quot; to create a Waksman circuit.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                      <div className="text-slate-400">Width</div>
                      <div className="text-base font-semibold">{waksmanResult.width}</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                      <div className="text-slate-400">Gates</div>
                      <div className="text-base font-semibold">{waksmanResult.gate_count}</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                      <div className="text-slate-400">Swaps</div>
                      <div className="text-base font-semibold">{waksmanResult.swap_count}</div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800/70">
                      <div className="text-slate-400">Obfuscated</div>
                      <div className="text-base font-semibold">
                        {waksmanResult.obfuscated ? (
                          <span className="text-amber-400">Yes ({waksmanResult.identity_slots} slots)</span>
                        ) : (
                          <span className="text-slate-500">No</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Permutation</div>
                    <div className="font-mono text-sm break-all">
                      [{waksmanResult.permutation.join(', ')}]
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Cycle Notation</div>
                    <div className="font-mono text-sm">
                      {formatCycle(cycleFromPerm(waksmanResult.permutation))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">ASCII Diagram</div>
                    <pre className="text-xs font-mono bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 overflow-x-auto max-h-[200px]">
                      {drawAscii(waksmanResult.width, waksmanResult.gates)}
                    </pre>
                  </div>
                  <div className="text-xs text-slate-400">
                    Synthesis time: {waksmanResult.synth_time_ms.toFixed(2)}ms
                    {waksmanResult.verified && ' · Verified ✓'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
