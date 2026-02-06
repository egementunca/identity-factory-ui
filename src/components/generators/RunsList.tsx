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
      <div className="text-center py-10 text-slate-500">
        <p>No generation runs yet. Start one above!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => (
        <RunItem
          key={run.run_id}
          run={run}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      ))}
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

  const borderColor = isActive
    ? 'border-blue-400/40 animate-pulse'
    : isSuccess
      ? 'border-green-400/40'
      : isError
        ? 'border-red-400/40'
        : isCancelled
          ? 'border-yellow-400/40 opacity-70'
          : 'border-slate-600/20';

  const badgeStyle = isActive
    ? 'bg-blue-500/20 text-blue-300'
    : isSuccess
      ? 'bg-green-500/20 text-green-300'
      : isError
        ? 'bg-red-500/20 text-red-300'
        : 'bg-slate-600/20 text-slate-400';

  return (
    <div
      className={`bg-slate-800/80 border rounded-xl p-4 transition-all ${borderColor}`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-blue-400/80">
            #{run.run_id}
          </span>
          <span className="font-semibold text-white">{run.generator_name}</span>
          <span className="text-sm text-slate-400 px-2 py-0.5 bg-slate-600/20 rounded">
            {run.current_width}w × {run.current_gate_count}g
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${badgeStyle}`}
        >
          {isActive && (
            <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
          )}
          {run.status}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
          <span className="text-lg font-semibold text-white">
            {run.circuits_found}
          </span>
          <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
            Found
          </span>
        </div>
        <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
          <span className="text-lg font-semibold text-white">
            {run.circuits_stored}
          </span>
          <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
            Stored
          </span>
        </div>
        <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
          <span className="text-lg font-semibold text-white">
            {run.circuits_per_second.toFixed(1)}/s
          </span>
          <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
            Rate
          </span>
        </div>
        <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
          <span className="text-lg font-semibold text-white">
            {formatTime(run.elapsed_seconds)}
          </span>
          <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
            Elapsed
          </span>
        </div>
      </div>

      {isActive && (
        <div className="h-1 bg-slate-600/20 rounded-sm mb-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-300 rounded-sm transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="text-sm text-slate-400 mb-2">{run.current_status}</div>

      {run.error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-sm mb-2">
          {run.error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {isActive && (
          <button
            className="px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-all bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            onClick={() => onCancel(run.run_id)}
          >
            Cancel
          </button>
        )}
        {(isSuccess || isError || isCancelled) && (
          <button
            className="px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-all bg-red-500/15 text-red-300 hover:bg-red-500/25"
            onClick={() => onDelete(run.run_id)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
