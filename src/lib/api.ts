/**
 * API client for Identity Circuit Factory
 */

// Use environment variable with fallback for local development
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// Base URL without /api/v1 suffix for SSE endpoints
export const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000';

/**
 * Base fetch wrapper with consistent error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

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

// Helper aliases
export const getDimensionGroups = listDimGroups;

// Generators API
export function listGenerators(): Promise<GeneratorInfo[]> {
  return apiFetch('/generators/');
}

export function getGenerator(name: string): Promise<GeneratorInfo> {
  return apiFetch(`/generators/${name}`);
}

export function listGateSets(): Promise<{ gate_sets: string[] }> {
  return apiFetch('/generators/gate-sets/');
}

export function startGeneration(request: GenerateRequest): Promise<RunStatus> {
  return apiFetch('/generators/run', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function listRuns(status?: string, generator?: string): Promise<RunStatus[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (generator) params.set('generator_name', generator);
  return apiFetch(`/generators/runs/?${params}`);
}

export function getRunStatus(runId: string): Promise<RunStatus> {
  return apiFetch(`/generators/runs/${runId}`);
}

export async function cancelRun(runId: string): Promise<void> {
  await apiFetch(`/generators/runs/${runId}/cancel`, { method: 'POST' });
}

export async function deleteRun(runId: string): Promise<void> {
  await apiFetch(`/generators/runs/${runId}`, { method: 'DELETE' });
}

// Factory API
export function getFactoryStats(): Promise<FactoryStats> {
  return apiFetch('/stats');
}

export function listDimGroups(): Promise<DimGroup[]> {
  return apiFetch('/dim-groups');
}

export function getHealth(): Promise<{ status: string }> {
  return apiFetch('/health');
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

export function getECA57Stats(): Promise<ECA57DatabaseStats> {
  return apiFetch('/eca57-lmdb/stats');
}

export function getECA57Configurations(): Promise<ECA57ConfigStats[]> {
  return apiFetch('/eca57-lmdb/configurations');
}

export function getECA57Circuits(
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
  return apiFetch(`/eca57-lmdb/circuits/${width}/${gateCount}?${params}`);
}

export function getECA57Circuit(
  width: number,
  gateCount: number,
  circuitId: number
): Promise<ECA57Circuit> {
  return apiFetch(`/eca57-lmdb/circuit/${width}/${gateCount}/${circuitId}`);
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

export function getECA57Equivalents(
  width: number,
  gateCount: number,
  circuitId: number,
  limit: number = 20
): Promise<EquivalentsResponse> {
  return apiFetch(`/eca57-lmdb/circuit/${width}/${gateCount}/${circuitId}/equivalents?limit=${limit}`);
}

// ===== Skeleton Identity Database API =====

export interface SkeletonCircuit {
  id: string;
  width: number;
  gate_count: number;
  gates: number[][];
  gate_string: string;
  taxonomy: string;
  is_identity: boolean;
  is_fully_noncommuting: boolean;
}

export interface SkeletonCircuitDetail extends SkeletonCircuit {
  collision_edges: number[][];
}

export interface TaxonomyStats {
  taxonomy: string;
  taxonomy_key?: string;
  circuit_count: number;
  gate_sizes: Record<number, number>;
}

export interface WidthDetailedStats {
  width: number;
  circuit_count: number;
  taxonomies: TaxonomyStats[];
  all_fully_noncommuting: boolean;
}

export interface SkeletonExplorerStats {
  widths: WidthDetailedStats[];
  total_circuits: number;
  total_taxonomies: number;
}

export function getSkeletonStats(): Promise<SkeletonExplorerStats> {
  return apiFetch('/skeleton/explorer/stats');
}

export function getSkeletonTaxonomies(width: number): Promise<TaxonomyStats[]> {
  return apiFetch(`/skeleton/explorer/taxonomies/${width}`);
}

export function getSkeletonCircuits(
  width: number,
  taxonomy?: string,
  offset: number = 0,
  limit: number = 20
): Promise<SkeletonCircuit[]> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (taxonomy) params.set('taxonomy', taxonomy);
  return apiFetch(`/skeleton/explorer/circuits/${width}?${params}`);
}

export function getSkeletonCircuitDetail(
  width: number,
  taxonomy: string,
  index: number
): Promise<SkeletonCircuitDetail> {
  const encodedTaxonomy = encodeURIComponent(taxonomy);
  return apiFetch(`/skeleton/explorer/circuit/${width}/${encodedTaxonomy}/${index}`);
}

export function getRandomSkeletonCircuit(width: number): Promise<SkeletonCircuit> {
  return apiFetch(`/skeleton/random/${width}`);
}

// ===== Waksman Network API =====

export interface WaksmanGenerateRequest {
  width: number;
  permutation?: number[];
  permutation_type: 'specific' | 'random' | 'reverse' | 'shift' | 'identity';
  shift_amount?: number;
  store_in_db?: boolean;
  obfuscate?: boolean;
  identity_gate_count?: number;
  min_identity_gates?: number;
  obfuscation_seed?: number;
}

export interface WaksmanCircuit {
  id?: number;
  width: number;
  permutation: number[];
  perm_hash: string;
  gate_count: number;
  gates: number[][];
  swap_count: number;
  synth_time_ms: number;
  verified?: boolean;
  obfuscated?: boolean;
  identity_slots?: number;
}

export interface WaksmanStatsResponse {
  total_circuits: number;
  by_width: Record<string, { count: number; avg_gates: number; avg_swaps: number }>;
}

export interface WaksmanComparisonResponse {
  perm_id: number;
  perm_hash: string;
  permutation: number[];
  sat_available: boolean;
  waksman_available: boolean;
  sat_gate_count?: number;
  waksman_gate_count?: number;
  gate_count_diff?: number;
}

export interface WaksmanBatchRequest {
  width: number;
  count: number;
  store_in_db?: boolean;
}

export interface WaksmanBatchResponse {
  job_id: string;
  status: string;
  message: string;
  circuits_generated: number;
}

export function generateWaksmanCircuit(request: WaksmanGenerateRequest): Promise<WaksmanCircuit> {
  return apiFetch('/waksman/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function getWaksmanCircuits(
  width?: number,
  limit: number = 50,
  offset: number = 0
): Promise<WaksmanCircuit[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (width) params.set('width', String(width));
  return apiFetch(`/waksman/circuits?${params}`);
}

export function getWaksmanCircuit(circuitId: number): Promise<WaksmanCircuit> {
  return apiFetch(`/waksman/circuit/${circuitId}`);
}

export function getWaksmanStats(): Promise<WaksmanStatsResponse> {
  return apiFetch('/waksman/stats');
}

export function compareWaksmanVsSat(permHash: string): Promise<WaksmanComparisonResponse> {
  return apiFetch(`/waksman/compare/${permHash}`);
}

export function generateWaksmanBatch(request: WaksmanBatchRequest): Promise<WaksmanBatchResponse> {
  return apiFetch('/waksman/generate-batch', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
