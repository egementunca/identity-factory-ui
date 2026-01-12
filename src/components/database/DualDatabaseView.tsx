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

// Types
interface SATStats {
  total_circuits: number;
  by_dimension: Record<string, number>;
  status: string;
}

interface GoDatabase {
  file_name: string;
  n_wires: number;
  n_gates: number;
  file_size_bytes: number;
}

interface GoStats {
  databases: GoDatabase[];
  total_databases: number;
  total_permutations?: number;
  total_circuits?: number;
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
}

interface CircuitListResponse {
  circuits: Circuit[];
  total: number;
  offset: number;
  limit: number;
}

const API_BASE = 'http://localhost:8000/api/v1';

export default function DualDatabaseView() {
  // SAT Database state
  const [satStats, setSatStats] = useState<SATStats | null>(null);
  const [satLoading, setSatLoading] = useState(true);
  const [satCircuits, setSatCircuits] = useState<Circuit[]>([]);
  const [satExpanded, setSatExpanded] = useState(false);

  // Go Database state
  const [goStats, setGoStats] = useState<GoStats | null>(null);
  const [goLoading, setGoLoading] = useState(true);
  const [expandedGoDb, setExpandedGoDb] = useState<string | null>(null);
  const [goCircuits, setGoCircuits] = useState<Circuit[]>([]);
  const [goCircuitsLoading, setGoCircuitsLoading] = useState(false);

  // Cluster Database state
  const [clusterStats, setClusterStats] = useState<ClusterStats | null>(null);
  const [clusterLoading, setClusterLoading] = useState(true);
  const [clusterCircuits, setClusterCircuits] = useState<ClusterCircuit[]>([]);
  const [clusterExpanded, setClusterExpanded] = useState(false);

  // Selected circuit for details
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);

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

  // Fetch Go stats
  const fetchGoStats = async () => {
    setGoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/go-database/stats`);
      if (res.ok) {
        setGoStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch Go stats:', e);
    } finally {
      setGoLoading(false);
    }
  };

  // Fetch Go circuits for a specific database
  const fetchGoCircuits = async (fileName: string) => {
    setGoCircuitsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/go-database/${fileName}/circuits?limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        setGoCircuits(data.circuits || []);
      }
    } catch (e) {
      console.error('Failed to fetch Go circuits:', e);
    } finally {
      setGoCircuitsLoading(false);
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
    fetchGoStats();
    fetchClusterStats();
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

        {/* Go Database Panel */}
        <div className="database-panel go-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Zap className="icon" />
              <h3>Go Brute-Force Database</h3>
              <span className="status-badge complete">
                {goStats?.total_databases || 0} files
              </span>
            </div>
            <button onClick={fetchGoStats} className="refresh-btn">
              <RefreshCw className="icon-sm" />
            </button>
          </div>

          {goLoading ? (
            <div className="loading-state">Loading...</div>
          ) : goStats && goStats.databases?.length > 0 ? (
            <>
              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">
                    {goStats.total_circuits ||
                      goStats.total_permutations ||
                      '?'}
                  </span>
                  <span className="stat-label">Total Circuits</span>
                </div>
                <div className="stat">
                  <span className="stat-value">
                    {goStats.databases[0]?.n_wires || '?'}w
                  </span>
                  <span className="stat-label">Wire Count</span>
                </div>
              </div>

              <div className="db-file-list">
                {goStats.databases.map((db) => (
                  <div key={db.file_name} className="db-file">
                    <button
                      className="db-file-header"
                      onClick={() => {
                        if (expandedGoDb === db.file_name) {
                          setExpandedGoDb(null);
                        } else {
                          setExpandedGoDb(db.file_name);
                          fetchGoCircuits(db.file_name);
                        }
                      }}
                    >
                      {expandedGoDb === db.file_name ? (
                        <ChevronDown />
                      ) : (
                        <ChevronRight />
                      )}
                      <span className="db-name">{db.file_name}</span>
                      <span className="db-meta">
                        {db.n_wires}w × {db.n_gates}g
                      </span>
                      <span className="db-size">
                        {formatBytes(db.file_size_bytes)}
                      </span>
                    </button>

                    {expandedGoDb === db.file_name && (
                      <div className="circuits-list">
                        {goCircuitsLoading ? (
                          <div className="loading-state">
                            Loading circuits...
                          </div>
                        ) : goCircuits.length > 0 ? (
                          goCircuits.map((circuit, i) => (
                            <div
                              key={circuit.perm_key || i}
                              className={`circuit-item ${selectedCircuit?.perm_key === circuit.perm_key ? 'selected' : ''}`}
                              onClick={() => setSelectedCircuit(circuit)}
                            >
                              <div className="circuit-info">
                                <span className="circuit-dim">
                                  {circuit.gate_count}g
                                </span>
                                <span className="circuit-cycle">
                                  {formatCycle(circuit.perm_cycle)}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">No circuits found</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No Go databases found.</div>
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
            {selectedCircuit.order_val && (
              <div className="detail-item">
                <label>Order</label>
                <span>{selectedCircuit.order_val}</span>
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
            <label>Gates ({selectedCircuit.gates.length})</label>
            <div className="gates-grid">
              {selectedCircuit.gates.map((gate, i) => {
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
          grid-template-columns: 1fr 1fr 1fr;
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
