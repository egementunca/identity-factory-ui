import { useState, useEffect } from 'react';
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChevronRight, 
  RotateCcw,
  BarChart2,
  Calendar,
  Trash2
} from 'lucide-react';
import { ExperimentHistoryItem, ExperimentConfig, ExperimentResults } from '@/types/experiments';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ExperimentHistoryProps {
  onSelectExperiment: (results: ExperimentResults) => void;
  onLoadConfig: (config: ExperimentConfig) => void;
  currentJobId?: string | null;
}

export default function ExperimentHistory({ 
  onSelectExperiment, 
  onLoadConfig,
  currentJobId 
}: ExperimentHistoryProps) {
  const [history, setHistory] = useState<ExperimentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/experiments/history?limit=50`);
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Poll for history updates occasionally
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [currentJobId]); // Refresh when current job changes

  const handleView = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/experiments/${jobId}/results`);
      if (!res.ok) throw new Error('Failed to load results');
      const data = await res.json();
      onSelectExperiment(data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={14} className="icon-success" />;
      case 'failed': return <XCircle size={14} className="icon-error" />;
      case 'running': return <Clock size={14} className="icon-running spinning" />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="history-panel">
      <div className="panel-header">
        <h3><History size={16} /> Recent Experiments</h3>
        <button className="refresh-btn" onClick={fetchHistory} title="Refresh">
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="history-list">
        {loading && history.length === 0 ? (
          <div className="empty-state">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No experiments run yet</div>
        ) : (
          history.map((item) => (
            <div key={item.job_id} className="history-item">
              <div className="item-main">
                <div className="item-header">
                  <span className={`status-badge ${item.status}`}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>
                  <span className="timestamp">
                    <Calendar size={12} />
                    {formatTime(item.completed_at || item.started_at)}
                  </span>
                </div>
                <div className="item-title">{item.name}</div>
                <div className="item-stats">
                  {item.initial_gates && (
                    <span>{item.initial_gates} → {item.final_gates} gates</span>
                  )}
                  {item.expansion_factor && (
                    <span className="expansion">({item.expansion_factor.toFixed(1)}x)</span>
                  )}
                </div>
              </div>
              
              <div className="item-actions">
                <button 
                  className="action-btn"
                  onClick={() => onLoadConfig(item.config)}
                  title="Load Configuration"
                >
                  <RotateCcw size={14} />
                  Load
                </button>
                {item.status === 'completed' && (
                  <button 
                    className="action-btn primary"
                    onClick={() => handleView(item.job_id)}
                    title="View Results"
                  >
                    <BarChart2 size={14} />
                    View
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .history-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .panel-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin: 0;
        }
        .refresh-btn {
          background: none;
          border: none;
          color: rgba(150, 150, 180, 0.6);
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        .refresh-btn:hover {
          color: #fff;
        }
        .history-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
        }
        .empty-state {
          padding: 20px;
          text-align: center;
          color: rgba(150, 150, 180, 0.4);
          font-size: 0.8rem;
          border: 1px dashed rgba(100, 100, 150, 0.2);
          border-radius: 8px;
        }
        .history-item {
          background: rgba(30, 30, 45, 0.4);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 10px;
          padding: 12px;
          transition: all 0.2s;
        }
        .history-item:hover {
          background: rgba(30, 30, 45, 0.6);
          border-color: rgba(100, 150, 255, 0.3);
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .status-badge.completed { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
        .status-badge.failed { background: rgba(248, 113, 113, 0.1); color: #f87171; }
        .status-badge.running { background: rgba(74, 125, 255, 0.1); color: #4a7dff; }
        
        .timestamp {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: rgba(150, 150, 180, 0.5);
        }
        .item-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: rgba(240, 240, 250, 0.9);
          margin-bottom: 4px;
        }
        .item-stats {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.7);
          margin-bottom: 12px;
        }
        .expansion {
          color: #4ade80;
          margin-left: 6px;
        }
        .item-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px;
          border: 1px solid rgba(100, 100, 150, 0.3);
          background: rgba(40, 40, 55, 0.5);
          color: rgba(200, 200, 220, 0.8);
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: rgba(60, 60, 80, 0.8);
          color: #fff;
        }
        .action-btn.primary {
          background: rgba(74, 125, 255, 0.15);
          border-color: rgba(74, 125, 255, 0.4);
          color: #8cb4ff;
        }
        .action-btn.primary:hover {
          background: rgba(74, 125, 255, 0.3);
          color: #fff;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
