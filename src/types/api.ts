// API types based on the backend models

export interface CircuitRecord {
  id: number;
  width: number;
  gate_count: number;
  gates: [string, ...number[]][];
  permutation: number[];
  complexity_walk?: number[];
  circuit_hash?: string;
  dim_group_id?: number;
  representative_id?: number;
  is_representative: boolean;
}

export interface DimGroupRecord {
  id: number;
  width: number;
  gate_count: number;
  circuit_count: number;
  representative_count: number;
  is_processed: boolean;
}

export interface GateComposition {
  gate_composition: [number, number, number]; // [NOT, CNOT, CCNOT]
  circuits: CircuitRecord[];
  total_count: number;
}

export interface CircuitVisualization {
  circuit_id: number;
  ascii_diagram: string;
  gate_descriptions: string[];
  permutation_table: number[][];
}

export interface GenerationRequest {
  width: number;
  forward_length: number;
  max_inverse_gates?: number;
  max_attempts?: number;
}

export interface GenerationResult {
  success: boolean;
  circuit_id?: number;
  dim_group_id?: number;
  forward_gates?: [string, ...number[]][];
  inverse_gates?: [string, ...number[]][];
  identity_gates?: [string, ...number[]][];
  gate_composition?: [number, number, number];
  total_time: number;
  error_message?: string;
  metrics?: Record<string, any>;
}

export interface FactoryStats {
  total_circuits: number;
  total_dim_groups: number;
  total_representatives: number;
  total_equivalents: number;
  pending_jobs: number;
  generation_time?: number;
  database_size_mb?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SearchParams {
  page?: number;
  size?: number;
  width?: number;
  gate_count?: number;
  is_representative?: boolean;
  gate_composition?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  database_connected: boolean;
  sat_solver_available: boolean;
}

// Enhanced Playground types
export interface PlaygroundGate {
  id: string;
  type: 'X' | 'CX' | 'CCX' | 'ECA57';
  step: number; // column position in circuit
  target: number; // target qubit
  controls: number[]; // control qubits (empty for X gates, [ctrl1, ctrl2] for ECA57)
  isEditing?: boolean; // for control editing mode
}

// ECA57 gate semantics:
// target ^= (ctrl1 OR NOT ctrl2)
// controls[0] = ctrl1 (active-high, filled dot ●)
// controls[1] = ctrl2 (active-low/inverted, empty dot ○)

export interface PlaygroundCircuit {
  width: number;
  length: number; // number of steps/columns
  gates: PlaygroundGate[];
}

export interface LiveMetrics {
  gateCount: number;
  gateComposition: [number, number, number]; // [NOT, CNOT, CCNOT]
  depth: number;
  isIdentity: boolean;
  permutation?: number[];
  complexityWalk?: number[];
  qubitConnectivity: number;
  hamming_distance?: number;
}

// Drag and drop types
export interface DragItem {
  type: 'NEW_GATE' | 'EXISTING_GATE' | 'CONTROL_WIRE';
  gateType?: 'X' | 'CX' | 'CCX' | 'ECA57';
  gateId?: string;
  sourceQubit?: number;
  sourceStep?: number;
}

export interface DropTarget {
  step: number;
  qubit: number;
  isValidDrop: boolean;
}

export interface GatePlacement {
  step: number;
  target: number;
  controls: number[];
  suggestedQubits?: number[]; // for smart placement
}

// Database search types for unified circuit search
export type DatabaseSource = 'sqlite' | 'eca57-lmdb' | 'skeleton';

export interface DatabaseSearchFilters {
  width?: number;
  widthRange?: [number, number];
  gateCount?: number;
  gateCountRange?: [number, number];
  sources?: DatabaseSource[];
  isIdentityOnly?: boolean;
}

export interface DatabaseSearchResult {
  id: string;           // Unique: "{source}:{width}:{index}"
  source: DatabaseSource;
  width: number;
  gateCount: number;
  gates: number[][];    // [[target, ctrl1, ctrl2], ...]
  gateString: string;   // Ready for handleLoadCircuit
  isIdentity: boolean;
  isRepresentative?: boolean;
  equivalenceClassSize?: number;
  taxonomy?: string;    // For skeleton circuits only
}

export interface DatabaseSearchResponse {
  results: DatabaseSearchResult[];
  total: number;
  sourcesQueried: DatabaseSource[];
  sourcesStats: Record<string, number>;
}

export interface DatabaseStats {
  sqlite?: {
    totalCircuits: number;
    configurations: Array<{width: number; gateCount: number; count: number}>;
  };
  eca57Lmdb?: {
    totalCircuits: number;
    configurations: Array<{width: number; gateCount: number; count: number}>;
  };
  skeleton?: {
    totalCircuits: number;
    widths: number[];
    taxonomiesPerWidth: Record<number, number>;
  };
}
