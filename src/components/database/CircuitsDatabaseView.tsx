'use client';

import { useState, useEffect } from 'react';

interface Circuit {
  id: number;
  width: number;
  gate_count: number;
  gates: any[];
  permutation_hash: string;
  created_at: string;
}

interface DatabaseStats {
  total_circuits: number;
  by_width: Record<number, number>;
}

export default function CircuitsDatabaseView() {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidth, setSelectedWidth] = useState<number | null>(null);

  useEffect(() => {
    loadStats();
    loadCircuits();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadCircuits = async (width?: number) => {
    setLoading(true);
    try {
      const url = width
        ? `http://localhost:8000/api/v1/circuits?width=${width}&limit=100`
        : 'http://localhost:8000/api/v1/circuits?limit=100';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCircuits(data.circuits || []);
      } else {
        setError('Failed to load circuits');
      }
    } catch (e) {
      setError('API not reachable. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const filterByWidth = (width: number | null) => {
    setSelectedWidth(width);
    if (width) {
      loadCircuits(width);
    } else {
      loadCircuits();
    }
  };

  return (
    <div className="circuits-database-view">
      <div className="db-header">
        <h3>Circuits Database</h3>
        <div className="db-stats">
          {stats && (
            <>
              <span className="stat-badge">
                <strong>{stats.total_circuits}</strong> Total Circuits
              </span>
              {Object.entries(stats.by_width || {}).map(([w, count]) => (
                <button
                  key={w}
                  className={`width-filter ${selectedWidth === Number(w) ? 'active' : ''}`}
                  onClick={() =>
                    filterByWidth(
                      selectedWidth === Number(w) ? null : Number(w)
                    )
                  }
                >
                  {w}w: {count}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading circuits...</div>
      ) : circuits.length === 0 ? (
        <div className="empty-state">
          No circuits found. Generate some using the API or automation
          endpoints.
        </div>
      ) : (
        <div className="circuits-table-wrapper">
          <table className="circuits-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Width</th>
                <th>Gates</th>
                <th>Hash</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {circuits.map((circuit) => (
                <tr key={circuit.id}>
                  <td>{circuit.id}</td>
                  <td>{circuit.width}w</td>
                  <td>{circuit.gate_count}g</td>
                  <td className="hash">
                    {circuit.permutation_hash?.slice(0, 8)}...
                  </td>
                  <td>{new Date(circuit.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() =>
                        window.open(
                          `/playground?circuit=${circuit.id}`,
                          '_blank'
                        )
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .circuits-database-view {
          background: var(--card-bg, #1a1a2e);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .db-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .db-header h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }

        .db-stats {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .stat-badge {
          background: var(
            --primary-gradient,
            linear-gradient(135deg, #667eea, #764ba2)
          );
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          color: white;
        }

        .width-filter {
          background: var(--button-bg, #2d2d44);
          border: 1px solid var(--border, #3d3d5c);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          transition: all 0.2s;
        }

        .width-filter:hover {
          background: var(--button-hover, #3d3d5c);
        }

        .width-filter.active {
          background: var(--primary, #667eea);
          color: white;
          border-color: var(--primary, #667eea);
        }

        .circuits-table-wrapper {
          overflow-x: auto;
        }

        .circuits-table {
          width: 100%;
          border-collapse: collapse;
        }

        .circuits-table th,
        .circuits-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border, #2d2d44);
        }

        .circuits-table th {
          color: var(--text-secondary, #888);
          font-weight: 500;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .circuits-table td {
          color: var(--text-primary, #fff);
        }

        .circuits-table tr:hover {
          background: rgba(102, 126, 234, 0.1);
        }

        .hash {
          font-family: monospace;
          font-size: 0.875rem;
          color: var(--text-secondary, #888);
        }

        .btn-view {
          background: var(--primary, #667eea);
          border: none;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          color: white;
          font-size: 0.75rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-view:hover {
          opacity: 0.8;
        }

        .loading,
        .empty-state,
        .error-message {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary, #888);
        }

        .error-message {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
