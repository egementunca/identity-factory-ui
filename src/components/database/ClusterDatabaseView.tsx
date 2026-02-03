'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  BarChart3,
  Grid3X3,
  RefreshCw,
  X,
  GitBranch,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface ClusterStats {
  total_circuits: number;
  by_dimension: Record<string, number>;
  by_gate_set: Record<string, number>;
  max_width?: number;
  max_gates?: number;
  status: string;
}

interface DimGroup {
  id: number;
  width: number;
  gate_count: number;
  circuit_count: number;
  is_processed: boolean;
}

interface ClusterCircuit {
  id: number;
  width: number;
  gate_count: number;
  gates: string;
  permutation: string;
  gate_set: string;
  source: string;
}

export default function ClusterDatabaseView() {
  const [stats, setStats] = useState<ClusterStats | null>(null);
  const [dimGroups, setDimGroups] = useState<DimGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Query state
  const [selectedWidth, setSelectedWidth] = useState<number | null>(null);
  const [selectedGates, setSelectedGates] = useState<number | null>(null);
  const [queryResults, setQueryResults] = useState<ClusterCircuit[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryTotal, setQueryTotal] = useState(0);
  const [queryOffset, setQueryOffset] = useState(0);
  const [diverseTargets, setDiverseTargets] = useState(false);
  const [excludeReducible, setExcludeReducible] = useState(false);
  const [onlyReducible, setOnlyReducible] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [hasQueried, setHasQueried] = useState(false);

  // Selected circuit for detail view
  const [selectedCircuit, setSelectedCircuit] = useState<ClusterCircuit | null>(
    null
  );

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, dimRes] = await Promise.all([
        fetch(`${API_BASE}/cluster-database/stats`),
        fetch(`${API_BASE}/cluster-database/dim-groups`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (dimRes.ok) {
        const data = await dimRes.json();
        setDimGroups(data.dim_groups || []);
      }
    } catch (e) {
      console.error('Failed to fetch cluster data:', e);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async (offset = 0) => {
    setQueryLoading(true);
    setQueryError(null);
    setHasQueried(true);
    try {
      let url = `${API_BASE}/cluster-database/circuits?limit=50&offset=${offset}`;
      if (selectedWidth !== null) url += `&width=${selectedWidth}`;
      if (selectedGates !== null) url += `&gate_count=${selectedGates}`;
      if (diverseTargets) url += `&diverse_targets=true`;
      if (excludeReducible) url += `&exclude_reducible=true`;
      if (onlyReducible) url += `&only_reducible=true`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQueryResults(data.circuits || []);
        setQueryTotal(data.total || 0);
        setQueryOffset(offset);
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setQueryError(errorData.detail || `Query failed with status ${res.status}`);
        setQueryResults([]);
        setQueryTotal(0);
      }
    } catch (e) {
      console.error('Query failed:', e);
      setQueryError(e instanceof Error ? e.message : 'Network error - is the API server running?');
      setQueryResults([]);
      setQueryTotal(0);
    } finally {
      setQueryLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Compute chart data
  const widthData = useMemo(() => {
    const grouped: Record<number, number> = {};
    dimGroups.forEach((d) => {
      grouped[d.width] = (grouped[d.width] || 0) + d.circuit_count;
    });
    return Object.entries(grouped)
      .map(([w, c]) => ({ width: Number(w), count: c }))
      .sort((a, b) => a.width - b.width);
  }, [dimGroups]);

  // Filter gate counts based on selected width (if any)
  const gateData = useMemo(() => {
    const filtered = selectedWidth !== null
      ? dimGroups.filter(d => d.width === selectedWidth)
      : dimGroups;

    const grouped: Record<number, number> = {};
    filtered.forEach((d) => {
      grouped[d.gate_count] = (grouped[d.gate_count] || 0) + d.circuit_count;
    });
    return Object.entries(grouped)
      .map(([g, c]) => ({ gates: Number(g), count: c }))
      .sort((a, b) => a.gates - b.gates);
  }, [dimGroups, selectedWidth]);

  // Filter widths based on selected gate count (if any)
  const filteredWidthData = useMemo(() => {
    const filtered = selectedGates !== null
      ? dimGroups.filter(d => d.gate_count === selectedGates)
      : dimGroups;

    const grouped: Record<number, number> = {};
    filtered.forEach((d) => {
      grouped[d.width] = (grouped[d.width] || 0) + d.circuit_count;
    });
    return Object.entries(grouped)
      .map(([w, c]) => ({ width: Number(w), count: c }))
      .sort((a, b) => a.width - b.width);
  }, [dimGroups, selectedGates]);

  const maxWidthCount = Math.max(...widthData.map((d) => d.count), 1);
  const maxGateCount = Math.max(...gateData.map((d) => d.count), 1);

  // Parse gates string into structured format
  // Format: "target:ctrl1,ctrl2;target:ctrl1,ctrl2;..."
  const parseGates = (
    gatesStr: string
  ): Array<{ target: number; controls: number[] }> => {
    if (!gatesStr) return [];
    return gatesStr
      .split(';')
      .filter(Boolean)
      .map((g) => {
        // Format is "target:ctrl1,ctrl2"
        const [targetStr, controlsStr] = g.split(':');
        const target = Number(targetStr);
        const controls = controlsStr ? controlsStr.split(',').map(Number) : [];
        return { target, controls };
      });
  };

  // Generate ASCII circuit diagram - clearer version
  const generateDiagram = (
    width: number,
    gates: Array<{ target: number; controls: number[] }>
  ) => {
    if (gates.length === 0) return 'No gates';

    const lines: string[] = [];

    // Add gate labels header
    let header = '    ';
    gates.forEach((_, i) => {
      header += ` G${i} `;
    });
    lines.push(header);
    lines.push('    ' + '────'.repeat(gates.length));

    for (let w = 0; w < width; w++) {
      let line = `q${w} ─`;
      for (const gate of gates) {
        const minWire = Math.min(gate.target, ...gate.controls);
        const maxWire = Math.max(gate.target, ...gate.controls);

        if (w === gate.target) {
          // Target is clearly marked
          line += '─⊕──';
        } else if (gate.controls.includes(w)) {
          // ECA57: first control is positive (●), second is negated (○)
          const ctrlIdx = gate.controls.indexOf(w);
          if (ctrlIdx === 0) {
            line += '─●──'; // Positive control
          } else {
            line += '─○──'; // Negated control
          }
        } else if (w > minWire && w < maxWire) {
          // Vertical connection
          line += '─│──';
        } else {
          // Empty wire
          line += '────';
        }
      }
      lines.push(line);
    }

    // Add legend
    lines.push('');
    lines.push('Legend: ● = +ctrl, ○ = ¬ctrl, ⊕ = target');

    return lines.join('\n');
  };

  // Check if two gates collide (target of one is control of other)
  // Matches local_mixing Gate::collides_index logic
  const gatesCollide = (
    g1: { target: number; controls: number[] },
    g2: { target: number; controls: number[] }
  ) => {
    // Check if g1.target is in g2.controls
    if (g2.controls.includes(g1.target)) return true;
    // Check if g2.target is in g1.controls
    if (g1.controls.includes(g2.target)) return true;
    return false;
  };

  // Build skeleton DAG: nodes are gates, edges are collision dependencies
  // Matches local_mixing create_skeleton logic
  const buildSkeleton = (
    gates: Array<{ target: number; controls: number[] }>
  ) => {
    // 1. Assign levels (Left Ordering)
    const levels: number[][] = [];
    const gateLevel: number[] = new Array(gates.length).fill(-1);

    let start = 0;
    let levelIdx = 0;

    while (start < gates.length) {
      const segment: number[] = [];
      let i = start;

      while (i < gates.length) {
        // If i > start, check if gates[i] collides with anything in current segment
        let collidesInSegment = false;
        if (i > start) {
          for (const existingIdx of segment) {
            if (gatesCollide(gates[i], gates[existingIdx])) {
              collidesInSegment = true;
              break;
            }
          }
        }

        if (collidesInSegment) {
          break; // Must start new level
        }

        segment.push(i);
        gateLevel[i] = levelIdx;
        i++;
      }

      levels.push(segment);
      levelIdx++;
      start = i;
    }

    // 2. Build edges: connect to ALL colliding gates in previous levels
    const edges: Array<[number, number]> = [];

    for (let currentLevel = 1; currentLevel < levels.length; currentLevel++) {
      for (const nodeIdx of levels[currentLevel]) {
        const node = gates[nodeIdx];

        // Check all previous levels
        for (let prevLevel = 0; prevLevel < currentLevel; prevLevel++) {
          for (const prevNodeIdx of levels[prevLevel]) {
            const prevNode = gates[prevNodeIdx];

            if (gatesCollide(prevNode, node)) {
              edges.push([prevNodeIdx, nodeIdx]);
            }
          }
        }
      }
    }

    // Sort edges for stable rendering
    edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    return { levels, edges, gateLevel };
  };

  if (loading) {
    return (
      <div className="cluster-view">
        <div className="loading">Loading cluster database...</div>
      </div>
    );
  }

  return (
    <div className="cluster-view">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <Layers className="icon-lg" />
          <div>
            <h1>ECA57 Identity Circuits</h1>
            <p>Cluster-generated identity gates from SAT enumeration</p>
          </div>
        </div>
        <button onClick={fetchStats} className="refresh-btn">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card highlight">
          <span className="stat-value">
            {stats?.total_circuits?.toLocaleString() || 0}
          </span>
          <span className="stat-label">Total Circuits</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dimGroups.length}</span>
          <span className="stat-label">Dimensions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.max_width || 0}</span>
          <span className="stat-label">Max Width</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.max_gates || 0}</span>
          <span className="stat-label">Max Gates</span>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>
            <BarChart3 size={18} /> Distribution by Width
          </h3>
          <div className="bar-chart">
            {widthData.map((d) => (
              <div
                key={d.width}
                className={`bar-item ${selectedWidth === d.width ? 'selected' : ''}`}
                onClick={() =>
                  setSelectedWidth(selectedWidth === d.width ? null : d.width)
                }
              >
                <div className="bar-label">{d.width}w</div>
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{ width: `${(d.count / maxWidthCount) * 100}%` }}
                  />
                </div>
                <div className="bar-count">{d.count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <h3>
            <BarChart3 size={18} /> Distribution by Gate Count
          </h3>
          <div className="bar-chart">
            {gateData.map((d) => (
              <div
                key={d.gates}
                className={`bar-item ${selectedGates === d.gates ? 'selected' : ''}`}
                onClick={() =>
                  setSelectedGates(selectedGates === d.gates ? null : d.gates)
                }
              >
                <div className="bar-label">{d.gates}g</div>
                <div className="bar-container">
                  <div
                    className="bar-fill gate-fill"
                    style={{ width: `${(d.count / maxGateCount) * 100}%` }}
                  />
                </div>
                <div className="bar-count">{d.count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension Heatmap */}
      <div className="heatmap-section">
        <h3>
          <Grid3X3 size={18} /> Dimension Heatmap (Width × Gates)
        </h3>
        <div className="heatmap">
          {dimGroups.map((d) => {
            const intensity = Math.min(d.circuit_count / 10000, 1);
            return (
              <div
                key={d.id}
                className={`heatmap-cell ${selectedWidth === d.width && selectedGates === d.gate_count ? 'selected' : ''}`}
                style={{
                  backgroundColor: `rgba(100, 255, 150, ${0.1 + intensity * 0.8})`,
                  color: intensity > 0.5 ? '#000' : '#fff',
                }}
                onClick={() => {
                  setSelectedWidth(d.width);
                  setSelectedGates(d.gate_count);
                  // Auto-query when clicking heatmap cell
                  setTimeout(() => executeQuery(0), 100);
                }}
                title={`${d.width}w × ${d.gate_count}g: ${d.circuit_count.toLocaleString()} circuits`}
              >
                <span className="cell-dim">
                  {d.width}×{d.gate_count}
                </span>
                <span className="cell-count">
                  {d.circuit_count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Query Section */}
      <div className="query-section">
        <div className="query-header">
          <h3>
            <Search size={18} /> Query Circuits
          </h3>
          <div className="query-filters">
            <select
              value={selectedWidth ?? ''}
              onChange={(e) => {
                const newWidth = e.target.value ? Number(e.target.value) : null;
                setSelectedWidth(newWidth);
                // Clear gate selection if it doesn't exist for this width
                if (newWidth !== null && selectedGates !== null) {
                  const validGates = dimGroups
                    .filter(d => d.width === newWidth)
                    .map(d => d.gate_count);
                  if (!validGates.includes(selectedGates)) {
                    setSelectedGates(null);
                  }
                }
              }}
            >
              <option value="">All Widths</option>
              {(selectedGates !== null ? filteredWidthData : widthData).map((d) => (
                <option key={d.width} value={d.width}>
                  {d.width} wires ({d.count.toLocaleString()})
                </option>
              ))}
            </select>
            <select
              value={selectedGates ?? ''}
              onChange={(e) => {
                const newGates = e.target.value ? Number(e.target.value) : null;
                setSelectedGates(newGates);
                // Clear width selection if it doesn't exist for this gate count
                if (newGates !== null && selectedWidth !== null) {
                  const validWidths = dimGroups
                    .filter(d => d.gate_count === newGates)
                    .map(d => d.width);
                  if (!validWidths.includes(selectedWidth)) {
                    setSelectedWidth(null);
                  }
                }
              }}
            >
              <option value="">All Gate Counts</option>
              {gateData.map((d) => (
                <option key={d.gates} value={d.gates}>
                  {d.gates} gates ({d.count.toLocaleString()})
                </option>
              ))}
            </select>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={diverseTargets}
                onChange={(e) => setDiverseTargets(e.target.checked)}
              />
              Diverse Targets Only
            </label>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={excludeReducible}
                onChange={(e) => {
                  setExcludeReducible(e.target.checked);
                  if (e.target.checked) setOnlyReducible(false);
                }}
              />
              Exclude Reducible
            </label>
            <label className="filter-checkbox warning">
              <input
                type="checkbox"
                checked={onlyReducible}
                onChange={(e) => {
                  setOnlyReducible(e.target.checked);
                  if (e.target.checked) setExcludeReducible(false);
                }}
              />
              Show Reducible Only
            </label>
            <button
              onClick={() => executeQuery(0)}
              className="query-btn"
              disabled={queryLoading}
            >
              {queryLoading ? (
                <>
                  <RefreshCw size={16} className="spinning" /> Querying...
                </>
              ) : (
                <>
                  <Filter size={16} /> Query
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selection preview */}
        {(selectedWidth !== null || selectedGates !== null) && (
          <div className="selection-preview">
            {(() => {
              // Find matching dim group
              const match = dimGroups.find(
                d =>
                  (selectedWidth === null || d.width === selectedWidth) &&
                  (selectedGates === null || d.gate_count === selectedGates)
              );
              const exactMatch = selectedWidth !== null && selectedGates !== null
                ? dimGroups.find(d => d.width === selectedWidth && d.gate_count === selectedGates)
                : null;

              if (selectedWidth !== null && selectedGates !== null) {
                if (exactMatch) {
                  return (
                    <span className="preview-valid">
                      {selectedWidth}w × {selectedGates}g = {exactMatch.circuit_count.toLocaleString()} circuits
                    </span>
                  );
                } else {
                  return (
                    <span className="preview-invalid">
                      No circuits for {selectedWidth}w × {selectedGates}g combination
                    </span>
                  );
                }
              } else if (selectedWidth !== null) {
                const total = dimGroups
                  .filter(d => d.width === selectedWidth)
                  .reduce((sum, d) => sum + d.circuit_count, 0);
                return <span className="preview-partial">{selectedWidth} wires: {total.toLocaleString()} circuits total</span>;
              } else if (selectedGates !== null) {
                const total = dimGroups
                  .filter(d => d.gate_count === selectedGates)
                  .reduce((sum, d) => sum + d.circuit_count, 0);
                return <span className="preview-partial">{selectedGates} gates: {total.toLocaleString()} circuits total</span>;
              }
              return null;
            })()}
          </div>
        )}

        {/* Query Error */}
        {queryError && (
          <div className="query-error">
            <X size={16} />
            <span>{queryError}</span>
            <button onClick={() => setQueryError(null)} className="dismiss-btn">
              Dismiss
            </button>
          </div>
        )}

        {/* No Results Message */}
        {hasQueried && !queryLoading && !queryError && queryTotal === 0 && (
          <div className="no-results">
            <Search size={20} />
            <span>No circuits found matching your criteria</span>
            <p>Try adjusting filters or querying without filters</p>
          </div>
        )}

        {queryTotal > 0 && (
          <div className="query-results">
            <div className="results-header">
              Showing {queryOffset + 1}-
              {Math.min(queryOffset + queryResults.length, queryTotal)} of{' '}
              {queryTotal.toLocaleString()} circuits
              <div className="pagination">
                <button
                  disabled={queryOffset === 0}
                  onClick={() => executeQuery(Math.max(0, queryOffset - 50))}
                >
                  ← Prev
                </button>
                <button
                  disabled={queryOffset + 50 >= queryTotal}
                  onClick={() => executeQuery(queryOffset + 50)}
                >
                  Next →
                </button>
              </div>
            </div>

            {queryLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="results-table">
                <div className="table-header">
                  <span>ID</span>
                  <span>Width</span>
                  <span>Gates</span>
                  <span>Circuit</span>
                </div>
                {queryResults.map((c) => (
                  <div
                    key={c.id}
                    className={`table-row clickable ${selectedCircuit?.id === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCircuit(c)}
                  >
                    <span className="id-col">#{c.id}</span>
                    <span className="dim-col">{c.width}w</span>
                    <span className="dim-col">{c.gate_count}g</span>
                    <span className="gates-col">{c.gates}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Circuit Detail Modal */}
      {selectedCircuit && (
        <div
          className="detail-overlay"
          onClick={() => setSelectedCircuit(null)}
        >
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-btn"
              onClick={() => setSelectedCircuit(null)}
            >
              <X size={20} />
            </button>

            <div className="detail-header">
              <h2>Circuit #{selectedCircuit.id}</h2>
              <div className="detail-badges">
                <span className="badge width">
                  {selectedCircuit.width} wires
                </span>
                <span className="badge gates">
                  {selectedCircuit.gate_count} gates
                </span>
                <span className="badge type">{selectedCircuit.gate_set}</span>
              </div>
            </div>

            <div className="detail-content">
              {/* Circuit Diagram */}
              <div className="detail-section">
                <h3>Circuit Diagram</h3>
                <pre className="diagram">
                  {generateDiagram(
                    selectedCircuit.width,
                    parseGates(selectedCircuit.gates)
                  )}
                </pre>
              </div>

              {/* Skeleton Graph (DAG of gates) */}
              <div className="detail-section">
                <h3>
                  <GitBranch size={16} /> Skeleton DAG (Gate Dependencies)
                </h3>
                <div className="skeleton-graph">
                  {(() => {
                    const gates = parseGates(selectedCircuit.gates);
                    const skeleton = buildSkeleton(gates);
                    const nodeRadius = 16;
                    const levelWidth = 60;
                    const nodeSpacing = 45;
                    const svgWidth = Math.max(
                      300,
                      (skeleton.levels.length + 1) * levelWidth
                    );
                    const maxNodesInLevel = Math.max(
                      ...skeleton.levels.map((l) => l.length),
                      1
                    );
                    const svgHeight = Math.max(
                      150,
                      maxNodesInLevel * nodeSpacing + 40
                    );

                    // Get node position: x based on level, y based on position in level
                    const getNodePos = (gateIdx: number) => {
                      const level = skeleton.gateLevel[gateIdx];
                      const levelGates = skeleton.levels[level];
                      const posInLevel = levelGates.indexOf(gateIdx);
                      const levelHeight = levelGates.length * nodeSpacing;
                      const x = 40 + level * levelWidth;
                      const y =
                        (svgHeight - levelHeight) / 2 +
                        posInLevel * nodeSpacing +
                        nodeSpacing / 2;
                      return { x, y };
                    };

                    return (
                      <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="graph-svg"
                        style={{ width: svgWidth, height: svgHeight }}
                      >
                        {/* Draw edges first (behind nodes) */}
                        {skeleton.edges.map(([from, to], i) => {
                          const p1 = getNodePos(from);
                          const p2 = getNodePos(to);
                          return (
                            <line
                              key={i}
                              x1={p1.x + nodeRadius}
                              y1={p1.y}
                              x2={p2.x - nodeRadius}
                              y2={p2.y}
                              className="edge"
                              markerEnd="url(#arrowhead)"
                            />
                          );
                        })}

                        {/* Arrow marker */}
                        <defs>
                          <marker
                            id="arrowhead"
                            markerWidth="6"
                            markerHeight="6"
                            refX="5"
                            refY="3"
                            orient="auto"
                          >
                            <polygon points="0 0, 6 3, 0 6" fill="#64ff96" />
                          </marker>
                        </defs>

                        {/* Draw nodes (gates) */}
                        {gates.map((gate, idx) => {
                          const pos = getNodePos(idx);
                          const gateLabel =
                            gate.controls.length === 0
                              ? `X${gate.target}`
                              : gate.controls.length === 1
                                ? `C${gate.controls[0]}→${gate.target}`
                                : `CC${gate.controls.join('')}→${gate.target}`;
                          return (
                            <g key={idx}>
                              <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={nodeRadius}
                                className="node"
                              />
                              <text
                                x={pos.x}
                                y={pos.y + 4}
                                className="node-label"
                              >
                                {idx}
                              </text>
                              <title>{gateLabel}</title>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                  <div className="graph-info">
                    <span>
                      {parseGates(selectedCircuit.gates).length} gates
                    </span>
                    <span>
                      {
                        buildSkeleton(parseGates(selectedCircuit.gates)).levels
                          .length
                      }{' '}
                      levels
                    </span>
                    <span>
                      {
                        buildSkeleton(parseGates(selectedCircuit.gates)).edges
                          .length
                      }{' '}
                      dependencies
                    </span>
                  </div>
                </div>
              </div>

              {/* Gate Breakdown */}
              <div className="detail-section">
                <h3>Gates</h3>
                <div className="gates-list">
                  {parseGates(selectedCircuit.gates).map((g, i) => (
                    <div key={i} className="gate-chip">
                      <span className="gate-target">⊕{g.target}</span>
                      <span className="gate-controls">
                        ←{' '}
                        {g.controls.map((c, j) => (
                          <span
                            key={j}
                            className={j === 0 ? 'ctrl-pos' : 'ctrl-neg'}
                          >
                            {c}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Data */}
              <div className="detail-section">
                <h3>Raw Data</h3>
                <code className="raw-gates">{selectedCircuit.gates}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .cluster-view {
          min-height: 100vh;
          padding: 32px;
          background: linear-gradient(180deg, #0a0a12 0%, #12121a 100%);
        }

        .loading {
          color: rgba(200, 200, 220, 0.6);
          text-align: center;
          padding: 60px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .title-section {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .icon-lg {
          width: 40px;
          height: 40px;
          color: #64ff96;
        }

        .title-section h1 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
        }

        .title-section p {
          margin: 4px 0 0;
          color: rgba(200, 200, 220, 0.6);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(100, 255, 150, 0.1);
          border: 1px solid rgba(100, 255, 150, 0.3);
          border-radius: 8px;
          padding: 10px 16px;
          color: #64ff96;
          cursor: pointer;
          font-weight: 500;
        }

        .refresh-btn:hover {
          background: rgba(100, 255, 150, 0.2);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-card.highlight {
          background: linear-gradient(
            135deg,
            rgba(100, 255, 150, 0.15),
            rgba(100, 255, 150, 0.05)
          );
          border-color: rgba(100, 255, 150, 0.3);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .charts-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-card {
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 24px;
        }

        .chart-card h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bar-item {
          display: grid;
          grid-template-columns: 40px 1fr 80px;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .bar-item:hover {
          background: rgba(100, 150, 255, 0.1);
        }

        .bar-item.selected {
          background: rgba(100, 255, 150, 0.15);
          border: 1px solid rgba(100, 255, 150, 0.4);
        }

        .bar-label {
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          font-size: 0.9rem;
        }

        .bar-container {
          height: 24px;
          background: rgba(100, 100, 150, 0.15);
          border-radius: 4px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a90ff, #64b5ff);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .bar-fill.gate-fill {
          background: linear-gradient(90deg, #64ff96, #96ffb4);
        }

        .bar-count {
          text-align: right;
          font-weight: 500;
          color: rgba(200, 200, 220, 0.7);
          font-size: 0.85rem;
        }

        .heatmap-section {
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .heatmap-section h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .heatmap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .heatmap-cell {
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 80px;
          transition:
            transform 0.15s,
            box-shadow 0.15s;
        }

        .heatmap-cell:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 20px rgba(100, 255, 150, 0.3);
        }

        .heatmap-cell.selected {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        .cell-dim {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .cell-count {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .query-section {
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 24px;
        }

        .query-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .query-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
        }

        .query-filters {
          display: flex;
          gap: 12px;
        }

        .query-filters select {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 8px;
          padding: 10px 16px;
          color: #fff;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .query-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #4a90ff, #64b5ff);
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
        }

        .query-btn:hover {
          opacity: 0.9;
        }

        .query-results {
          margin-top: 16px;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: rgba(200, 200, 220, 0.7);
          font-size: 0.9rem;
          margin-bottom: 16px;
        }

        .pagination {
          display: flex;
          gap: 8px;
        }

        .pagination button {
          background: rgba(100, 100, 150, 0.2);
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 6px;
          padding: 6px 16px;
          color: rgba(200, 200, 220, 0.9);
          cursor: pointer;
        }

        .pagination button:hover:not(:disabled) {
          background: rgba(100, 100, 150, 0.4);
        }

        .pagination button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .results-table {
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 8px;
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 80px 80px 80px 1fr;
          gap: 16px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
        }

        .table-row {
          display: grid;
          grid-template-columns: 80px 80px 80px 1fr;
          gap: 16px;
          padding: 12px 16px;
          border-top: 1px solid rgba(100, 100, 150, 0.1);
          font-size: 0.85rem;
        }

        .table-row.clickable {
          cursor: pointer;
        }

        .table-row.clickable:hover {
          background: rgba(100, 150, 255, 0.15);
        }

        .table-row.selected {
          background: rgba(100, 255, 150, 0.15);
          border-left: 3px solid #64ff96;
        }

        .id-col {
          color: rgba(200, 200, 220, 0.5);
        }

        .dim-col {
          color: #64ff96;
          font-weight: 600;
        }

        .gates-col {
          font-family: 'SF Mono', 'Monaco', monospace;
          color: rgba(200, 200, 220, 0.8);
          font-size: 0.8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Detail Modal */
        .detail-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 32px;
        }

        .detail-panel {
          background: linear-gradient(135deg, #1a1a2e, #16162a);
          border: 1px solid rgba(100, 255, 150, 0.3);
          border-radius: 20px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          padding: 32px;
        }

        .close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 100, 100, 0.2);
          border: none;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff8a8a;
          cursor: pointer;
        }

        .close-btn:hover {
          background: rgba(255, 100, 100, 0.4);
        }

        .detail-header {
          margin-bottom: 24px;
        }

        .detail-header h2 {
          margin: 0 0 12px;
          font-size: 1.5rem;
          color: #fff;
        }

        .detail-badges {
          display: flex;
          gap: 8px;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .badge.width {
          background: rgba(100, 150, 255, 0.2);
          color: #64b5ff;
        }

        .badge.gates {
          background: rgba(100, 255, 150, 0.2);
          color: #64ff96;
        }

        .badge.type {
          background: rgba(255, 180, 100, 0.2);
          color: #ffb464;
        }

        .detail-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-section {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 20px;
        }

        .detail-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.8);
          text-transform: uppercase;
        }

        .diagram {
          font-family: 'SF Mono', 'Monaco', monospace;
          font-size: 1.1rem;
          line-height: 1.6;
          color: #64ff96;
          background: rgba(0, 0, 0, 0.3);
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }

        .skeleton-graph {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .graph-svg {
          width: 100%;
          max-width: 300px;
          height: 200px;
        }

        .node {
          fill: rgba(100, 150, 255, 0.3);
          stroke: #64b5ff;
          stroke-width: 2;
        }

        .node-label {
          fill: #fff;
          font-size: 14px;
          text-anchor: middle;
          font-weight: 600;
        }

        .edge {
          stroke: #64ff96;
          stroke-width: 3;
          opacity: 0.8;
        }

        .graph-info {
          display: flex;
          gap: 16px;
          color: rgba(200, 200, 220, 0.6);
          font-size: 0.85rem;
        }

        .gates-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .gate-chip {
          background: rgba(100, 100, 150, 0.2);
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gate-target {
          color: #64ff96;
          font-weight: 700;
          font-size: 1rem;
        }

        .gate-controls {
          color: rgba(200, 200, 220, 0.7);
          font-size: 0.85rem;
        }

        .ctrl-pos {
          color: #64b5ff;
          font-weight: 600;
          margin-right: 4px;
        }

        .ctrl-neg {
          color: #ff8a8a;
          font-weight: 600;
          margin-left: 4px;
        }

        .raw-gates {
          display: block;
          font-family: 'SF Mono', 'Monaco', monospace;
          font-size: 0.85rem;
          color: rgba(200, 200, 220, 0.7);
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 6px;
          word-break: break-all;
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-section {
            grid-template-columns: 1fr;
          }
        }

        .filter-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(200, 200, 220, 0.9);
          font-size: 0.9rem;
          cursor: pointer;
          user-select: none;
        }

        .filter-checkbox input {
          width: 16px;
          height: 16px;
          accent-color: #64ff96;
        }

        .filter-checkbox.warning {
          color: #ffb464;
        }

        .filter-checkbox.warning input {
          accent-color: #ffb464;
        }

        .query-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .query-error {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 16px 20px;
          background: rgba(255, 100, 100, 0.15);
          border: 1px solid rgba(255, 100, 100, 0.4);
          border-radius: 10px;
          color: #ff8a8a;
        }

        .query-error span {
          flex: 1;
        }

        .dismiss-btn {
          background: rgba(255, 100, 100, 0.2);
          border: 1px solid rgba(255, 100, 100, 0.3);
          border-radius: 6px;
          padding: 6px 12px;
          color: #ff8a8a;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .dismiss-btn:hover {
          background: rgba(255, 100, 100, 0.3);
        }

        .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 40px 20px;
          background: rgba(100, 100, 150, 0.1);
          border: 1px dashed rgba(100, 100, 150, 0.3);
          border-radius: 12px;
          color: rgba(200, 200, 220, 0.6);
        }

        .no-results span {
          font-size: 1rem;
          color: rgba(200, 200, 220, 0.8);
        }

        .no-results p {
          margin: 0;
          font-size: 0.85rem;
        }

        .selection-preview {
          margin-top: 12px;
          padding: 10px 16px;
          background: rgba(100, 100, 150, 0.1);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .preview-valid {
          color: #64ff96;
        }

        .preview-invalid {
          color: #ff8a8a;
        }

        .preview-partial {
          color: rgba(200, 200, 220, 0.8);
        }
      `}</style>
    </div>
  );
}
