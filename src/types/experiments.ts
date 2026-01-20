export interface ObfuscationParams {
    strategy: 'abbutterfly' | 'bbutterfly' | 'butterfly';
    bookendless: boolean;
    structure_block_size_min: number;
    structure_block_size_max: number;
    shooting_count: number;
    shooting_count_inner: number;
    single_gate_replacements: number;
    rounds: number;
    sat_mode: boolean;
    no_ancilla_mode: boolean;
    single_gate_mode: boolean;
    skip_compression: boolean;
    pair_replacement_mode: boolean;
    compression_window_size: number;
    compression_window_size_sat: number;
    compression_sat_limit: number;
    final_stability_threshold: number;
    chunk_split_base: number;
}

export interface ExperimentConfig {
    name: string;
    experiment_type: string;
    description?: string;
    wires: number;
    initial_gates: number;
    obfuscation: ObfuscationParams;
    lmdb_path?: string;
}

export interface ExperimentPreset {
    id: string;
    name: string;
    description: string;
    experiment_type: string;
    config: ExperimentConfig;
    tags: string[];
}

export interface ExperimentProgress {
    status: string;
    progress_percent: number;
    current_round?: number;
    current_gates?: number;
    elapsed_seconds: number;
    new_lines?: string[];
    final?: boolean;
}

export type AlignmentMatrix =
    | number[][]
    | {
        dim: [number, number];
        data: number[];
    };

export interface ExperimentResults {
    job_id: string;
    status: string;
    config?: ExperimentConfig;
    initial_gates: number;
    final_gates: number;
    expansion_factor: number;
    elapsed_seconds: number;
    heatmap_data?: number[][];
    heatmap_x_size?: number;
    heatmap_y_size?: number;
    alignment_c_star?: number;
    alignment_path?: number[][];
    alignment_matrix?: AlignmentMatrix;
    log_output?: string;
}

export interface ExperimentHistoryItem {
    job_id: string;
    name: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    elapsed_seconds?: number;
    initial_gates?: number;
    final_gates?: number;
    expansion_factor?: number;
    config: ExperimentConfig;
}
