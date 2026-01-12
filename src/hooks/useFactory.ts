'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listGenerators,
  listRuns,
  getRunStatus,
  startGeneration,
  cancelRun,
  deleteRun,
  getFactoryStats,
  listDimGroups,
  GeneratorInfo,
  RunStatus,
  GenerateRequest,
  FactoryStats,
  DimGroup,
} from '@/lib/api';

// Hook for fetching generators
export function useGenerators() {
  const [generators, setGenerators] = useState<GeneratorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listGenerators();
      setGenerators(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch generators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { generators, loading, error, refresh };
}

// Hook for fetching and managing runs
export function useRuns(pollInterval = 2000) {
  const [runs, setRuns] = useState<RunStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listRuns();
      setRuns(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch runs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for updates when there are running tasks
  useEffect(() => {
    refresh();
    const hasRunning = runs.some((r) => r.status === 'running');

    if (hasRunning) {
      const interval = setInterval(refresh, pollInterval);
      return () => clearInterval(interval);
    }
  }, [runs.length, pollInterval, refresh]);

  const startRun = useCallback(async (request: GenerateRequest) => {
    const run = await startGeneration(request);
    setRuns((prev) => [run, ...prev]);
    return run;
  }, []);

  const cancel = useCallback(
    async (runId: string) => {
      await cancelRun(runId);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(async (runId: string) => {
    await deleteRun(runId);
    setRuns((prev) => prev.filter((r) => r.run_id !== runId));
  }, []);

  return { runs, loading, error, refresh, startRun, cancel, remove };
}

// Hook for factory stats
export function useFactoryStats(pollInterval = 5000) {
  const [stats, setStats] = useState<FactoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getFactoryStats();
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, refresh]);

  return { stats, loading, error, refresh };
}

// Hook for dimension groups
export function useDimGroups() {
  const [dimGroups, setDimGroups] = useState<DimGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDimGroups();
      setDimGroups(data);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to fetch dimension groups'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dimGroups, loading, error, refresh };
}
