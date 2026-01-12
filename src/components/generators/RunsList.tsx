'use client';

import { RunStatus } from '@/lib/api';

interface RunsListProps {
  runs: RunStatus[];
  onCancel: (runId: string) => Promise<void>;
  onDelete: (runId: string) => Promise<void>;
}

export function RunsList({ runs, onCancel, onDelete }: RunsListProps) {
  if (runs.length === 0) {
    return (
      <div className="runs-empty">
        <p>No generation runs yet. Start one above!</p>
        <style jsx>{`
          .runs-empty {
            text-align: center;
            padding: 40px;
            color: rgba(200, 200, 220, 0.5);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="runs-list">
      {runs.map((run) => (
        <RunItem
          key={run.run_id}
          run={run}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      ))}
      <style jsx>{`
        .runs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}

interface RunItemProps {
  run: RunStatus;
  onCancel: (runId: string) => Promise<void>;
  onDelete: (runId: string) => Promise<void>;
}

function RunItem({ run, onCancel, onDelete }: RunItemProps) {
  const isActive = run.status === 'running';
  const isSuccess = run.status === 'completed';
  const isError = run.status === 'failed';
  const isCancelled = run.status === 'cancelled';

  const progress =
    run.circuits_found > 0
      ? Math.min(100, (run.circuits_stored / run.circuits_found) * 100)
      : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={`run-item ${run.status}`}>
      <div className="run-header">
        <div className="run-info">
          <span className="run-id">#{run.run_id}</span>
          <span className="run-generator">{run.generator_name}</span>
          <span className="run-dims">
            {run.current_width}w × {run.current_gate_count}g
          </span>
        </div>
        <div className="run-status-badge">
          {isActive && <span className="pulse"></span>}
          {run.status}
        </div>
      </div>

      <div className="run-stats">
        <div className="stat">
          <span className="stat-value">{run.circuits_found}</span>
          <span className="stat-label">Found</span>
        </div>
        <div className="stat">
          <span className="stat-value">{run.circuits_stored}</span>
          <span className="stat-label">Stored</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {run.circuits_per_second.toFixed(1)}/s
          </span>
          <span className="stat-label">Rate</span>
        </div>
        <div className="stat">
          <span className="stat-value">{formatTime(run.elapsed_seconds)}</span>
          <span className="stat-label">Elapsed</span>
        </div>
      </div>

      {isActive && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <div className="run-status-text">{run.current_status}</div>

      {run.error && <div className="run-error">{run.error}</div>}

      <div className="run-actions">
        {isActive && (
          <button className="btn-cancel" onClick={() => onCancel(run.run_id)}>
            Cancel
          </button>
        )}
        {(isSuccess || isError || isCancelled) && (
          <button className="btn-delete" onClick={() => onDelete(run.run_id)}>
            Remove
          </button>
        )}
      </div>

      <style jsx>{`
        .run-item {
          background: rgba(30, 30, 40, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s;
        }

        .run-item.running {
          border-color: rgba(100, 150, 255, 0.4);
          animation: glow 2s ease-in-out infinite;
        }

        .run-item.completed {
          border-color: rgba(100, 255, 150, 0.4);
        }

        .run-item.failed {
          border-color: rgba(255, 100, 100, 0.4);
        }

        .run-item.cancelled {
          border-color: rgba(255, 200, 100, 0.4);
          opacity: 0.7;
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(100, 150, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(100, 150, 255, 0.4);
          }
        }

        .run-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .run-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .run-id {
          font-family: monospace;
          font-size: 0.8rem;
          color: rgba(100, 150, 255, 0.8);
        }

        .run-generator {
          font-weight: 600;
          color: #fff;
        }

        .run-dims {
          font-size: 0.85rem;
          color: rgba(200, 200, 220, 0.6);
          padding: 2px 8px;
          background: rgba(100, 100, 150, 0.2);
          border-radius: 4px;
        }

        .run-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(100, 100, 150, 0.2);
          color: rgba(200, 200, 220, 0.8);
        }

        .run-item.running .run-status-badge {
          background: rgba(100, 150, 255, 0.2);
          color: #8ab4ff;
        }

        .run-item.completed .run-status-badge {
          background: rgba(100, 255, 150, 0.2);
          color: #8affb4;
        }

        .run-item.failed .run-status-badge {
          background: rgba(255, 100, 100, 0.2);
          color: #ff8a8a;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        .run-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .stat-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
        }

        .stat-label {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .progress-bar {
          height: 4px;
          background: rgba(100, 100, 150, 0.2);
          border-radius: 2px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a6fff, #8ab4ff);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .run-status-text {
          font-size: 0.85rem;
          color: rgba(200, 200, 220, 0.6);
          margin-bottom: 8px;
        }

        .run-error {
          padding: 8px 12px;
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          border-radius: 6px;
          color: #ff8a8a;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }

        .run-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-cancel,
        .btn-delete {
          padding: 6px 16px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel {
          background: rgba(255, 200, 100, 0.2);
          color: #ffc864;
        }

        .btn-cancel:hover {
          background: rgba(255, 200, 100, 0.3);
        }

        .btn-delete {
          background: rgba(255, 100, 100, 0.15);
          color: #ff8a8a;
        }

        .btn-delete:hover {
          background: rgba(255, 100, 100, 0.25);
        }
      `}</style>
    </div>
  );
}
