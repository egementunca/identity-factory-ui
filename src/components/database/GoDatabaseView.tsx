'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, ExternalLink } from 'lucide-react';

interface GoDatabaseInfo {
  n_wires: number;
  n_gates: number;
  file_name: string;
  file_size_bytes: number;
  available: boolean;
}

interface GoDatabaseStats {
  source: string;
  description: string;
  total_databases: number;
  total_size_bytes: number;
  databases: GoDatabaseInfo[];
  largest_enumeration: number;
  wire_count: number;
}

export default function GoDatabaseView() {
  const [stats, setStats] = useState<GoDatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:8000/api/v1/go-database/stats'
      );
      if (!response.ok) throw new Error('Failed to fetch Go database stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">Go Circuit Database</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-xl border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Go Circuit Database</h3>
        </div>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold">Go Circuit Database</h3>
          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
            Separate Source
          </span>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        {stats?.description || 'Pre-generated exhaustive circuit enumeration'}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {stats?.total_databases || 0}
          </div>
          <div className="text-xs text-gray-400">Databases</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {stats?.wire_count || 0}w
          </div>
          <div className="text-xs text-gray-400">Wires</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {formatBytes(stats?.total_size_bytes || 0)}
          </div>
          <div className="text-xs text-gray-400">Total Size</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-300 mb-2">
          Available Databases:
        </div>
        {stats?.databases.map((db, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="font-mono text-sm">{db.file_name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>
                {db.n_wires}w × {db.n_gates}g
              </span>
              <span>{formatBytes(db.file_size_bytes)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">
        Max enumeration: {stats?.largest_enumeration || 0} gates • Source:
        go-project
      </div>
    </div>
  );
}
