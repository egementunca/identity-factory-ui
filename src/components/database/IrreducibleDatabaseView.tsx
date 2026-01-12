'use client';

import { useState, useEffect } from 'react';

interface ForwardCircuit {
  id: number;
  width: number;
  gate_count: number;
  permutation_hash: string;
  created_at: string;
}

interface IrreducibleStats {
  forward_circuits: number;
  inverse_circuits: number;
  identity_circuits: number;
  by_width: Record<number, number>;
}

export default function IrreducibleDatabaseView() {
  const [forwards, setForwards] = useState<ForwardCircuit[]>([]);
  const [stats, setStats] = useState<IrreducibleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidth, setSelectedWidth] = useState<number>(3);

  useEffect(() => {
    loadStats();
    loadForwards(selectedWidth);
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/irreducible/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load irreducible stats:', e);
    }
  };

  const loadForwards = async (width: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/irreducible/forward/${width}`
      );
      if (res.ok) {
        const data = await res.json();
        setForwards(data.circuits || []);
      } else {
        setError('Failed to load irreducible circuits');
      }
    } catch (e) {
      setError('API not reachable');
    } finally {
      setLoading(false);
    }
  };

  const handleWidthChange = (width: number) => {
    setSelectedWidth(width);
    loadForwards(width);
  };

  const handleGenerate = async () => {
    try {
      const res = await fetch(
        'http://localhost:8000/api/v1/irreducible/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            width: selectedWidth,
            repetitions: Math.max(1, 8 - selectedWidth), // descending pattern
            count: 10,
          }),
        }
      );

      if (res.ok) {
        loadStats();
        loadForwards(selectedWidth);
      }
    } catch (e) {
      setError('Generation failed');
    }
  };

  return (
    <div className="irreducible-database-view">
      <div className="db-header">
        <h3>Irreducible Circuits Database</h3>
        <div className="db-stats">
          {stats && (
            <>
              <span className="stat-badge forward">
                <strong>{stats.forward_circuits}</strong> Forward
              </span>
              <span className="stat-badge inverse">
                <strong>{stats.inverse_circuits}</strong> Inverse
              </span>
              <span className="stat-badge identity">
                <strong>{stats.identity_circuits}</strong> Identity
              </span>
            </>
          )}
        </div>
      </div>

      <div className="controls">
        <div className="width-selector">
          <span>Width:</span>
          {[3, 4, 5, 6, 7].map((w) => (
            <button
              key={w}
              className={`width-btn ${selectedWidth === w ? 'active' : ''}`}
              onClick={() => handleWidthChange(w)}
            >
              {w}w
            </button>
          ))}
        </div>
        <button className="btn-generate" onClick={handleGenerate}>
          + Generate 10
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : forwards.length === 0 ? (
        <div className="empty-state">
          No irreducible circuits for {selectedWidth}-wire. Click &quot;Generate 10&quot;
          to create some!
        </div>
      ) : (
        <div className="circuits-grid">
          {forwards.map((circuit) => (
            <div key={circuit.id} className="circuit-card">
              <div className="circuit-id">#{circuit.id}</div>
              <div className="circuit-info">
                <span className="gates">{circuit.gate_count} gates</span>
                <span className="hash">
                  {circuit.permutation_hash?.slice(0, 8)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .irreducible-database-view {
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
        }

        .stat-badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          color: white;
        }

        .stat-badge.forward {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .stat-badge.inverse {
          background: linear-gradient(135deg, #f093fb, #f5576c);
        }

        .stat-badge.identity {
          background: linear-gradient(135deg, #4facfe, #00f2fe);
        }

        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .width-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .width-selector span {
          color: var(--text-secondary, #888);
          margin-right: 0.5rem;
        }

        .width-btn {
          background: var(--button-bg, #2d2d44);
          border: 1px solid var(--border, #3d3d5c);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          color: var(--text-secondary, #aaa);
          cursor: pointer;
          transition: all 0.2s;
        }

        .width-btn:hover {
          background: var(--button-hover, #3d3d5c);
        }

        .width-btn.active {
          background: var(--primary, #667eea);
          color: white;
          border-color: var(--primary, #667eea);
        }

        .btn-generate {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .btn-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .circuits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .circuit-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border, #2d2d44);
          border-radius: 8px;
          padding: 1rem;
          transition:
            transform 0.2s,
            border-color 0.2s;
        }

        .circuit-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary, #667eea);
        }

        .circuit-id {
          font-weight: 600;
          color: var(--primary, #667eea);
          margin-bottom: 0.5rem;
        }

        .circuit-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
        }

        .gates {
          color: var(--text-primary, #fff);
        }

        .hash {
          font-family: monospace;
          color: var(--text-secondary, #888);
          font-size: 0.75rem;
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
