/**
 * API client for Identity Circuit Factory
 */

const API_BASE = 'http://localhost:8000/api/v1';

export interface GeneratorInfo {
  name: string;
  display_name: string;
  description: string;
  gate_sets: string[];
  supports_pause: boolean;
  supports_incremental: boolean;
  config_schema?: Record<string, any>;
}

export interface RunStatus {
  run_id: string;
  generator_name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  circuits_found: number;
  circuits_stored: number;
  duplicates_skipped: number;
  current_gate_count?: number;
  current_width?: number;
  elapsed_seconds: number;
  estimated_remaining_seconds?: number;
  circuits_per_second: number;
  current_status: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface GenerateRequest {
  generator_name: string;
  width: number;
  gate_count: number;
  gate_set: string;
  max_circuits?: number;
  config?: Record<string, any>;
}

export interface DimGroup {
  id: number;
  width: number;
  gate_count: number;
  circuit_count: number;
  representative_count: number;
  is_processed: boolean;
}

export interface FactoryStats {
  total_circuits: number;
  total_dim_groups: number;
  total_representatives: number;
  total_equivalents: number;
  pending_jobs: number;
  generation_time: number;
  database_size_mb?: number;
}

// Debug API
export async function enableDebugLogging(): Promise<{ message: string }> {
  // Placeholder - assuming backend has this or likely to add or it was removed
  // For now verify against backend endpoints later
  console.warn('enableDebugLogging not implemented on backend');
  return { message: 'Debug logging enabled (mock)' };
}

export async function disableDebugLogging(): Promise<{ message: string }> {
  console.warn('disableDebugLogging not implemented on backend');
  return { message: 'Debug logging disabled (mock)' };
}

export async function generateCircuit(data: any): Promise<any> {
  // Mapping to startGeneration?
  // This seems to be a specialized generation
  return startGeneration({
    generator_name: 'eca57', // default?
    width: data.width,
    gate_count: data.forward_length,
    gate_set: 'x,cx,ccx',
    max_circuits: 1,
    config: data
  });
}

export async function generateWithDebug(data: any): Promise<any> {
  return generateCircuit({ ...data, debug: true });
}

// Helper aliases for missing exports
export const getDimensionGroups = listDimGroups;

export async function getDimensionGroupCompositions(dimGroupId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/dim-groups/${dimGroupId}/compositions`);
  if (!res.ok) throw new Error('Failed to fetch compositions');
  return res.json();
}

export async function getDimensionGroupCircuits(dimGroupId: number, loadDetails?: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/dim-groups/${dimGroupId}/circuits?details=${!!loadDetails}`);
  if (!res.ok) throw new Error('Failed to fetch circuits');
  return res.json();
}

// Circuit Visualization
export async function getCircuitVisualization(circuitId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/circuits/${circuitId}/visualization`);
  if (!res.ok) throw new Error('Failed to fetch visualization');
  return res.json();
}

// Generators API
export async function listGenerators(): Promise<GeneratorInfo[]> {
  const res = await fetch(`${API_BASE}/generators/`);
  if (!res.ok) throw new Error('Failed to fetch generators');
  return res.json();
}

export async function getGenerator(name: string): Promise<GeneratorInfo> {
  const res = await fetch(`${API_BASE}/generators/${name}`);
  if (!res.ok) throw new Error(`Generator ${name} not found`);
  return res.json();
}

export async function listGateSets(): Promise<{ gate_sets: string[] }> {
  const res = await fetch(`${API_BASE}/generators/gate-sets/`);
  if (!res.ok) throw new Error('Failed to fetch gate sets');
  return res.json();
}

export async function startGeneration(
  request: GenerateRequest
): Promise<RunStatus> {
  const res = await fetch(`${API_BASE}/generators/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to start generation');
  }
  return res.json();
}

export async function listRuns(
  status?: string,
  generator?: string
): Promise<RunStatus[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (generator) params.set('generator_name', generator);
  const res = await fetch(`${API_BASE}/generators/runs/?${params}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
  const res = await fetch(`${API_BASE}/generators/runs/${runId}`);
  if (!res.ok) throw new Error(`Run ${runId} not found`);
  return res.json();
}

export async function cancelRun(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/generators/runs/${runId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to cancel run');
}

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/generators/runs/${runId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete run');
}

// Factory API
export async function getFactoryStats(): Promise<FactoryStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function listDimGroups(): Promise<DimGroup[]> {
  const res = await fetch(`${API_BASE}/dim-groups`);
  if (!res.ok) throw new Error('Failed to fetch dimension groups');
  return res.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('API not available');
  return res.json();
}

// ===== ECA57 LMDB API =====

export interface ECA57Circuit {
  id: number;
  width: number;
  gate_count: number;
  gates: number[][]; // [[target, ctrl1, ctrl2], ...]
  equivalence_class_size: number;
  skeleton_edges?: number[][]; // [[i, j], ...] pairs of colliding gates
  complexity_walk?: number[]; // Hamming distance after each gate
  permutation?: number[]; // Full permutation mapping [0..2^width-1]
  cycle_notation?: string; // Cycle notation string, "()" for identity
}

export interface ECA57ConfigStats {
  width: number;
  gate_count: number;
  num_representatives: number;
  total_circuits: number;
}

export interface ECA57DatabaseStats {
  configurations: ECA57ConfigStats[];
  total_representatives: number;
  total_circuits: number;
}

export async function getECA57Stats(): Promise<ECA57DatabaseStats> {
  const res = await fetch(`${API_BASE}/eca57-lmdb/stats`);
  if (!res.ok) throw new Error('Failed to fetch ECA57 LMDB stats');
  return res.json();
}

export async function getECA57Configurations(): Promise<ECA57ConfigStats[]> {
  const res = await fetch(`${API_BASE}/eca57-lmdb/configurations`);
  if (!res.ok) throw new Error('Failed to fetch configurations');
  return res.json();
}

export async function getECA57Circuits(
  width: number,
  gateCount: number,
  offset: number = 0,
  limit: number = 20,
  includeSkeleton: boolean = true,
  includeComplexity: boolean = true
): Promise<ECA57Circuit[]> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    include_skeleton: String(includeSkeleton),
    include_complexity: String(includeComplexity),
  });
  const res = await fetch(
    `${API_BASE}/eca57-lmdb/circuits/${width}/${gateCount}?${params}`
  );
  if (!res.ok)
    throw new Error(`Failed to fetch circuits for w${width}g${gateCount}`);
  return res.json();
}

export async function getECA57Circuit(
  width: number,
  gateCount: number,
  circuitId: number
): Promise<ECA57Circuit> {
  const res = await fetch(
    `${API_BASE}/eca57-lmdb/circuit/${width}/${gateCount}/${circuitId}`
  );
  if (!res.ok) throw new Error('Circuit not found');
  return res.json();
}

export interface EquivalentForm {
  index: number;
  gates: number[][];
  skeleton_edges: number[][];
}

export interface EquivalentsResponse {
  representative_id: number;
  total_equivalents: number;
  returned: number;
  equivalents: EquivalentForm[];
}

export async function getECA57Equivalents(
  width: number,
  gateCount: number,
  circuitId: number,
  limit: number = 20
): Promise<EquivalentsResponse> {
  const res = await fetch(
    `${API_BASE}/eca57-lmdb/circuit/${width}/${gateCount}/${circuitId}/equivalents?limit=${limit}`
  );
  if (!res.ok) throw new Error('Failed to fetch equivalents');
  return res.json();
}
