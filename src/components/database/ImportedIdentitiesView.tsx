'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { RefreshCw, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

interface WireStats {
  wires: number;
  count: number;
  min_gates: number;
  max_gates: number;
  avg_gates: number;
}

interface GateCountStats {
  gate_count: number;
  count: number;
}

interface SourceStats {
  source_table: string;
  count: number;
}

interface ImportedStats {
  total_circuits: number;
  by_wires: WireStats[];
  by_source: SourceStats[];
  top_gate_counts: GateCountStats[];
}

interface ImportedCircuit {
  id: number;
  source_table: string;
  wires: number;
  gate_count: number;
  gates: number[][];
  circuit_str: string;
  is_verified: boolean;
}

interface PaginatedCircuits {
  circuits: ImportedCircuit[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e',
  '#06b6d4', '#eab308', '#ef4444', '#a855f7', '#14b8a6',
];

export default function ImportedIdentitiesView() {
  const [stats, setStats] = useState<ImportedStats | null>(null);
  const [circuits, setCircuits] = useState<PaginatedCircuits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [wireFilter, setWireFilter] = useState<number | null>(null);
  const [minGates, setMinGates] = useState<number | null>(null);
  const [maxGates, setMaxGates] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/imported-identities/stats`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('No imported identities database found. Run the import script first.');
        }
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCircuits = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (wireFilter !== null) params.append('wires', wireFilter.toString());
      if (minGates !== null) params.append('min_gates', minGates.toString());
      if (maxGates !== null) params.append('max_gates', maxGates.toString());

      const res = await fetch(`${API_BASE}/api/v1/imported-identities/circuits?${params}`);
      if (!res.ok) throw new Error('Failed to fetch circuits');
      const data = await res.json();
      setCircuits(data);
    } catch (err: any) {
      console.error('Failed to fetch circuits:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (stats) {
      fetchCircuits();
    }
  }, [wireFilter, minGates, maxGates, page, stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-400" size={32} />
        <span className="ml-3 text-slate-400">Loading imported identities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 text-center">
        <p className="text-amber-300 font-medium mb-2">Database Not Available</p>
        <p className="text-slate-400 text-sm mb-4">{error}</p>
        <p className="text-slate-500 text-xs">
          Run: <code className="bg-slate-800 px-2 py-1 rounded">
            python scripts/import_big_identities.py /path/to/big_identities.txt
          </code>
        </p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-blue-400">
            {stats.total_circuits.toLocaleString()}
          </div>
          <div className="text-sm text-slate-400 mt-1">Total Circuits</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-purple-400">
            {stats.by_wires.length}
          </div>
          <div className="text-sm text-slate-400 mt-1">Wire Configurations</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-emerald-400">
            {stats.by_source.length}
          </div>
          <div className="text-sm text-slate-400 mt-1">Source Tables</div>
        </div>
      </div>

      {/* Wire Distribution Chart */}
      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Distribution by Wire Count</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.by_wires}>
              <XAxis
                dataKey="wires"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const entry: any = payload[0].payload;
                  const value: any = payload[0].value ?? 0;
                  return (
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#f1f5f9',
                      }}
                    >
                      <div>{value.toLocaleString()} circuits</div>
                      <div className="text-xs text-slate-400">
                        Gates: {entry.min_gates}-{entry.max_gates} (avg: {entry.avg_gates})
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.by_wires.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wire Stats Table */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Wires</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Circuits</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Min Gates</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Max Gates</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg Gates</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.by_wires.map((ws) => (
              <tr
                key={ws.wires}
                className={`border-t border-slate-700/50 hover:bg-slate-700/30 ${
                  wireFilter === ws.wires ? 'bg-blue-900/20' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-blue-300">{ws.wires}w</td>
                <td className="px-4 py-3 text-right text-white">
                  {ws.count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">{ws.min_gates}</td>
                <td className="px-4 py-3 text-right text-slate-400">{ws.max_gates}</td>
                <td className="px-4 py-3 text-right text-slate-400">{ws.avg_gates}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => {
                      setWireFilter(wireFilter === ws.wires ? null : ws.wires);
                      setPage(1);
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      wireFilter === ws.wires
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <Filter size={12} className="inline mr-1" />
                    {wireFilter === ws.wires ? 'Clear' : 'Filter'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Circuits List */}
      {circuits && (
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">
                Circuits {wireFilter && `(${wireFilter} wires)`}
              </h3>
              <p className="text-sm text-slate-400">
                Showing {circuits.circuits.length} of {circuits.total.toLocaleString()} circuits
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded bg-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {circuits.total_pages}
              </span>
              <button
                onClick={() => setPage(Math.min(circuits.total_pages, page + 1))}
                disabled={page >= circuits.total_pages}
                className="p-2 rounded bg-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
            {circuits.circuits.map((circuit) => (
              <div
                key={circuit.id}
                className="p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-300">
                        {circuit.wires}w × {circuit.gate_count}g
                      </span>
                      {circuit.is_verified && (
                        <span className="px-2 py-0.5 text-xs bg-emerald-900/40 text-emerald-400 rounded">
                          verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Source: {circuit.source_table}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600">#{circuit.id}</span>
                </div>
                <div className="mt-2 text-xs font-mono text-slate-500 truncate">
                  {circuit.circuit_str.substring(0, 80)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
