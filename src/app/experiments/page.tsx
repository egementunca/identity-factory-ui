'use client';

import { useState, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import {
  Play,
  Settings,
  Zap,
  BarChart2,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import InfoTooltip from '@/components/InfoTooltip';
import HeatmapViewer from '@/components/experiments/HeatmapViewer';
import AlignmentViewer from '@/components/experiments/AlignmentViewer';
import ExperimentHistory from '@/components/experiments/ExperimentHistory';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import {
  ObfuscationParams,
  ExperimentConfig,
  ExperimentPreset,
  ExperimentProgress,
  AlignmentMatrix,
  ExperimentResults,
} from '@/types/experiments';

// Default values matching local_mixing/src/config.rs
const defaultObfuscation: ObfuscationParams = {
  strategy: 'abbutterfly',
  bookendless: false,
  structure_block_size_min: 10,
  structure_block_size_max: 30,
  shooting_count: 10000, // Practical default for most circuits
  shooting_count_inner: 0,
  single_gate_replacements: 500,
  rounds: 3, // Rust default
  sat_mode: true,
  no_ancilla_mode: false,
  single_gate_mode: false,
  skip_compression: false,
  pair_replacement_mode: true,
  compression_window_size: 100,
  compression_window_size_sat: 10,
  compression_sat_limit: 1000,
  final_stability_threshold: 12,
  chunk_split_base: 1500,
};

// Parameter descriptions from source code analysis
const paramDescriptions: Record<string, string> = {
  strategy:
    'Obfuscation Strategy: abbutterfly (Asymmetric Big), bbutterfly (Symmetric Big), or butterfly (Standard)',
  bookendless:
    'Enable bookendless mode for abbutterfly. Skips initial/final structure padding',
  wires: 'Number of qubits/wires in the circuit (3-64)',
  initial_gates: 'Number of ECA57 gates in the starting circuit',
  rounds_butterfly:
    'Butterfly obfuscation iterations. Each round: wrap in R·x·R⁻¹ → expand → compress',
  rounds_rac:
    'RAC obfuscation iterations. Each round: sequential pair replacement → parallel compression until stable',
  shooting_count:
    'Gate reordering at start. Randomly moves gates left/right as far as possible without collision, scrambling gate ordering',
  shooting_count_inner:
    'Gate reordering applied inside each butterfly block during obfuscation',
  single_gate_replacements:
    'Replace single gates with equivalent identity-templates from LMDB before main loop',
  structure_block_size_min:
    'Minimum size of random identity R·R⁻¹ structure wrapped around gates',
  structure_block_size_max:
    'Maximum size of random identity R·R⁻¹ structure wrapped around gates',
  sat_mode:
    'Use SAT solver to find optimal gate sequences during compression (more effective but slower than rainbow table)',
  no_ancilla_mode:
    'Disable ancilla expansion. When OFF: subcircuits expand to use extra wires to find equivalents via rainbow table lookup',
  single_gate_mode:
    'Enable single-gate replacement pass before main butterfly loop',
  skip_compression:
    'Skip all compression. Circuit only grows larger (inflation-only mode for testing)',
  pair_replacement_mode:
    'Enable pair replacement: replaces pairs of gates with single equivalent templates from LMDB to reduce gate count',
  compression_window_size:
    'Peephole window size for template-based compression. Scans window-sized subcircuits for replacements',
  compression_window_size_sat:
    'Smaller window size used when SAT mode is enabled',
  compression_sat_limit:
    'Conflict limit for SAT solver. Higher = more thorough search but slower',
  final_stability_threshold:
    'Stop final compression when N consecutive passes yield no improvement',
  chunk_split_base:
    'Split circuit into parallel chunks of this size for processing. Higher = bigger chunks',
  name: 'A descriptive name for this experiment run',
};

// Helper component for form fields with tooltips - MUST be outside main component to prevent focus loss
const FormField = ({
  label,
  field,
  children,
}: {
  label: string;
  field: string;
  children: React.ReactNode;
}) => (
  <div className="form-group">
    <label>
      {label}
      <InfoTooltip content={paramDescriptions[field]} />
    </label>
    {children}
  </div>
);

export default function ExperimentsPage() {
  const [presets, setPresets] = useState<ExperimentPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<ExperimentConfig>({
    name: 'My Experiment',
    experiment_type: 'custom',
    wires: 8,
    initial_gates: 20,
    obfuscation: { ...defaultObfuscation },
  });

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/experiments/presets`)
      .then((res) => res.json())
      .then((data) => setPresets(data.presets || []))
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setConfig(preset.config);
    }
  };

  const updateConfig = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateObf = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      obfuscation: { ...prev.obfuscation, [field]: value },
    }));
  };

  const handleLoadConfig = (newConfig: ExperimentConfig) => {
    setConfig(newConfig);
    setSelectedPreset('');
  };

  const handleSelectExperiment = (loadedResults: ExperimentResults) => {
    setResults(loadedResults);
    if (loadedResults.config) {
      setConfig(loadedResults.config);
    }
  };



  const startExperiment = async () => {
    setError(null);
    setLogLines([]);
    setResults(null);
    setProgress(0);
    setStatus('starting');

    try {
      const res = await fetch(`${API_BASE}/api/v1/experiments/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!res.ok) {
        const err = await res.json();
        let errorMessage = 'Failed to start experiment';
        
        if (err.detail) {
            if (typeof err.detail === 'string') {
                errorMessage = err.detail;
            } else if (Array.isArray(err.detail)) {
                // Parse Pydantic validation errors
                errorMessage = err.detail.map((e: any) => {
                    // loc like ['body', 'config', 'wires'] -> 'config.wires'
                    const field = e.loc.slice(1).join('.'); 
                    return `${field}: ${e.msg}`;
                }).join('\n');
            } else {
                errorMessage = JSON.stringify(err.detail);
            }
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setJobId(data.job_id);
      setStatus('running');
      connectToStream(data.job_id);
    } catch (err: any) {
      console.error("Experiment start error:", err);
      setError(err.message);
      setStatus('error');
    }
  };

  const connectToStream = (id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`${API_BASE}/api/v1/experiments/${id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: ExperimentProgress = JSON.parse(event.data);
        setProgress(data.progress_percent);
        setStatus(data.status);
        if (data.new_lines) {
          setLogLines((prev) => [...prev, ...data.new_lines!]);
        }
        if (data.final) {
          es.close();
          fetchResults(id);
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    es.onerror = () => {
      es.close();
      fetchResults(id);
    };
  };

  const fetchResults = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/experiments/${id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  const cancelExperiment = async () => {
    if (!jobId) return;
    try {
      await fetch(`${API_BASE}/api/v1/experiments/${jobId}`, {
        method: 'DELETE',
      });
      eventSourceRef.current?.close();
      setStatus('cancelled');
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  const isRunning =
    status === 'running' || status === 'starting' || status === 'pending';
  const maxRenderableCells = 1_000_000;

  const heatmapCellCount =
    results?.heatmap_data?.length && results.heatmap_data[0]?.length
      ? results.heatmap_data.length * results.heatmap_data[0].length
      : 0;
  const heatmapTooLarge = heatmapCellCount > maxRenderableCells;
  const canRenderHeatmap = Boolean(
    results?.heatmap_data &&
      results.heatmap_x_size &&
      results.heatmap_y_size &&
      !heatmapTooLarge
  );

  const alignmentDims = (() => {
    if (!results?.alignment_matrix) return null;
    if (Array.isArray(results.alignment_matrix)) {
      const rows = results.alignment_matrix.length;
      const cols = results.alignment_matrix[0]?.length ?? 0;
      return { rows, cols };
    }
    if (
      Array.isArray(results.alignment_matrix.dim) &&
      results.alignment_matrix.dim.length === 2
    ) {
      return {
        rows: results.alignment_matrix.dim[0],
        cols: results.alignment_matrix.dim[1],
      };
    }
    return null;
  })();
  const alignmentCellCount = alignmentDims
    ? alignmentDims.rows * alignmentDims.cols
    : 0;
  const alignmentTooLarge = alignmentCellCount > maxRenderableCells;
  const wiresForAlignment = results?.config?.wires ?? config.wires;
  const alignmentBlocked = wiresForAlignment > 64;
  const canRenderAlignment = Boolean(
    results?.alignment_matrix && !alignmentTooLarge && !alignmentBlocked
  );
  const heatmapMessage = !results?.heatmap_data
    ? 'Heatmap not available for this run.'
    : !results.heatmap_x_size || !results.heatmap_y_size
      ? 'Heatmap dimensions missing from results.'
      : heatmapTooLarge
        ? 'Heatmap too large to render in the browser.'
        : '';
  const alignmentMessage = !results?.alignment_matrix
    ? 'Alignment not available for this run.'
    : alignmentBlocked
      ? 'Alignment only supports 64 wires or fewer.'
      : alignmentTooLarge
        ? 'Alignment matrix too large to render in the browser.'
        : '';

  return (
    <div className="page">
      <Navigation />

      <main className="page-content">
        <div className="layout">
          <aside className="history-sidebar">
            <ExperimentHistory
              onSelectExperiment={handleSelectExperiment}
              onLoadConfig={handleLoadConfig}
              currentJobId={jobId}
            />
          </aside>

          <section className="config-panel">
            <h2>
              <Settings size={18} /> Configuration
            </h2>

            {/* Preset Selector */}
            <div className="form-group">
              <label>Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                disabled={isRunning}
              >
                <option value="">Custom Configuration</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedPreset &&
                presets.find((p) => p.id === selectedPreset)?.description && (
                  <p className="hint">
                    {presets.find((p) => p.id === selectedPreset)?.description}
                  </p>
                )}
            </div>

            {/* Circuit Parameters */}
            <div className="form-section">
              <h3>Circuit Parameters</h3>
              <FormField label="Experiment Name" field="name">
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => updateConfig('name', e.target.value)}
                  disabled={isRunning}
                />
              </FormField>
              <div className="form-row">
                <FormField label="Wires" field="wires">
                  <input
                    type="number"
                    min={3}
                    max={64}
                    value={config.wires}
                    onChange={(e) =>
                      updateConfig('wires', parseInt(e.target.value))
                    }
                    disabled={isRunning}
                  />
                </FormField>
                <FormField label="Initial Gates" field="initial_gates">
                  <input
                    type="number"
                    min={1}
                    value={config.initial_gates}
                    onChange={(e) =>
                      updateConfig('initial_gates', parseInt(e.target.value))
                    }
                    disabled={isRunning}
                  />
                </FormField>
              </div>
            </div>

            {/* Strategy & Mode */}
            <div className="form-section">
              <h3>Strategy</h3>
              <div className="form-row">
                <FormField label="Strategy" field="strategy">
                  <select
                    value={config.obfuscation.strategy}
                    onChange={(e) => updateObf('strategy', e.target.value)}
                    disabled={isRunning}
                  >
                    <option value="abbutterfly">Abbutterfly (Asymmetric)</option>
                    <option value="bbutterfly">Bbutterfly (Symmetric)</option>
                    <option value="butterfly">Butterfly (Standard)</option>
                    <option value="rac">RAC (Replace And Compress)</option>
                  </select>
                </FormField>
                <FormField label="Rounds" field={config.obfuscation.strategy === 'rac' ? 'rounds_rac' : 'rounds_butterfly'}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={config.obfuscation.rounds}
                    onChange={(e) =>
                      updateObf('rounds', parseInt(e.target.value))
                    }
                    disabled={isRunning}
                  />
                </FormField>
              </div>
              <div className="toggles">
                {config.obfuscation.strategy === 'abbutterfly' && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.obfuscation.bookendless}
                      onChange={(e) =>
                        updateObf('bookendless', e.target.checked)
                      }
                      disabled={isRunning}
                    />
                    <span>Bookendless</span>
                    <InfoTooltip content={paramDescriptions.bookendless} />
                  </label>
                )}
              </div>
            </div>

            {/* Intensity */}
            <div className="form-section">
              <h3>Intensity</h3>
              <div className="form-row">
                <FormField label="Shooting Count" field="shooting_count">
                  <input
                    type="number"
                    min={0}
                    value={config.obfuscation.shooting_count}
                    onChange={(e) =>
                      updateObf('shooting_count', parseInt(e.target.value))
                    }
                    disabled={isRunning}
                  />
                  <span className="hint">
                    Recommended: 1k (fast), 10k (standard), 100k (thorough)
                  </span>
                </FormField>
                <FormField
                  label="Single Gates"
                  field="single_gate_replacements"
                >
                  <input
                    type="number"
                    min={0}
                    value={config.obfuscation.single_gate_replacements}
                    onChange={(e) =>
                      updateObf(
                        'single_gate_replacements',
                        parseInt(e.target.value)
                      )
                    }
                    disabled={isRunning}
                  />
                </FormField>
              </div>
            </div>

            {/* Structure */}
            <div className="form-section">
              <h3>Structure</h3>
              <div className="form-row">
                <FormField
                  label="Block Size Min"
                  field="structure_block_size_min"
                >
                  <input
                    type="number"
                    min={0}
                    value={config.obfuscation.structure_block_size_min}
                    onChange={(e) =>
                      updateObf(
                        'structure_block_size_min',
                        parseInt(e.target.value)
                      )
                    }
                    disabled={isRunning}
                  />
                </FormField>
                <FormField
                  label="Block Size Max"
                  field="structure_block_size_max"
                >
                  <input
                    type="number"
                    min={0}
                    value={config.obfuscation.structure_block_size_max}
                    onChange={(e) =>
                      updateObf(
                        'structure_block_size_max',
                        parseInt(e.target.value)
                      )
                    }
                    disabled={isRunning}
                  />
                </FormField>
              </div>
            </div>

            {/* Optimization & Flags */}
            <div className="form-section">
              <h3>Optimization</h3>
              <div className="toggles">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={config.obfuscation.sat_mode}
                    onChange={(e) => updateObf('sat_mode', e.target.checked)}
                    disabled={isRunning}
                  />
                  <span>SAT Mode</span>
                  <InfoTooltip content={paramDescriptions.sat_mode} />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={config.obfuscation.skip_compression}
                    onChange={(e) =>
                      updateObf('skip_compression', e.target.checked)
                    }
                    disabled={isRunning}
                  />
                  <span>Inflation Only</span>
                  <InfoTooltip content={paramDescriptions.skip_compression} />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={config.obfuscation.no_ancilla_mode}
                    onChange={(e) =>
                      updateObf('no_ancilla_mode', e.target.checked)
                    }
                    disabled={isRunning}
                  />
                  <span>No Ancilla</span>
                  <InfoTooltip content={paramDescriptions.no_ancilla_mode} />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={config.obfuscation.single_gate_mode}
                    onChange={(e) =>
                      updateObf('single_gate_mode', e.target.checked)
                    }
                    disabled={isRunning}
                  />
                  <span>Single Gate Mode</span>
                  <InfoTooltip content={paramDescriptions.single_gate_mode} />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={config.obfuscation.pair_replacement_mode}
                    onChange={(e) =>
                      updateObf('pair_replacement_mode', e.target.checked)
                    }
                    disabled={isRunning}
                  />
                  <span>Pair Replacement</span>
                  <InfoTooltip content={paramDescriptions.pair_replacement_mode} />
                </label>
              </div>
            </div>

            {/* Advanced Settings (collapsible) */}
            <div className="form-section">
              <button
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                Advanced Settings
              </button>

              {showAdvanced && (
                  <div className="advanced-fields">
                  <div className="form-row">
                    <FormField
                      label="Shooting Inner"
                      field="shooting_count_inner"
                    >
                      <input
                        type="number"
                        min={0}
                        value={config.obfuscation.shooting_count_inner}
                        onChange={(e) =>
                          updateObf(
                            'shooting_count_inner',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                  </div>
                  <div className="form-row">
                    <FormField
                      label="Compression Window"
                      field="compression_window_size"
                    >
                      <input
                        type="number"
                        min={10}
                        value={config.obfuscation.compression_window_size}
                        onChange={(e) =>
                          updateObf(
                            'compression_window_size',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                    <FormField
                      label="SAT Window"
                      field="compression_window_size_sat"
                    >
                      <input
                        type="number"
                        min={1}
                        value={config.obfuscation.compression_window_size_sat}
                        onChange={(e) =>
                          updateObf(
                            'compression_window_size_sat',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                  </div>
                  <div className="form-row">
                    <FormField
                      label="SAT Conflict Limit"
                      field="compression_sat_limit"
                    >
                      <input
                        type="number"
                        min={100}
                        value={config.obfuscation.compression_sat_limit}
                        onChange={(e) =>
                          updateObf(
                            'compression_sat_limit',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                    <FormField
                      label="Stability Threshold"
                      field="final_stability_threshold"
                    >
                      <input
                        type="number"
                        min={1}
                        value={config.obfuscation.final_stability_threshold}
                        onChange={(e) =>
                          updateObf(
                            'final_stability_threshold',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                  </div>
                  <div className="form-row">
                    <FormField
                      label="Chunk Split Base"
                      field="chunk_split_base"
                    >
                      <input
                        type="number"
                        min={100}
                        value={config.obfuscation.chunk_split_base}
                        onChange={(e) =>
                          updateObf(
                            'chunk_split_base',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={isRunning}
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="actions">
              {!isRunning ? (
                <button className="btn-primary" onClick={startExperiment}>
                  <Play size={18} /> Run Experiment
                </button>
              ) : (
                <button className="btn-danger" onClick={cancelExperiment}>
                  <XCircle size={18} /> Cancel
                </button>
              )}
            </div>

            {error && <div className="error">{error}</div>}
          </section>

          {/* Progress & Results Panel */}
          <section className="results-panel">
            <h2>
              <Activity size={18} /> Progress & Results
            </h2>

            <div className="status-bar">
              <div className="status-indicator">
                {status === 'completed' && (
                  <CheckCircle size={18} className="success" />
                )}
                {status === 'failed' && <XCircle size={18} className="error" />}
                {isRunning && <Loader2 size={18} className="spinning" />}
                {status === 'idle' && <Clock size={18} />}
                <span>{status.toUpperCase()}</span>
              </div>
              {isRunning && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="log-container" ref={logRef}>
              {logLines.length === 0 ? (
                <div className="log-empty">
                  Run an experiment to see output here...
                </div>
              ) : (
                logLines.map((line, i) => (
                  <div key={i} className="log-line">
                    {line}
                  </div>
                ))
              )}
            </div>

            {results && (
              <div className="results-summary">
                <h3>
                  <BarChart2 size={16} /> Results
                </h3>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-label">Initial</span>
                    <span className="stat-value">{results.initial_gates}</span>
                    <span className="stat-unit">gates</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Final</span>
                    <span className="stat-value">{results.final_gates}</span>
                    <span className="stat-unit">gates</span>
                  </div>
                  <div className="stat highlight">
                    <span className="stat-label">Expansion</span>
                    <span className="stat-value">
                      {results.expansion_factor}x
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Time</span>
                    <span className="stat-value">
                      {results.elapsed_seconds.toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="results-visuals">
                  <div className="visual-panel">
                    {canRenderHeatmap ? (
                      <HeatmapViewer
                        data={results.heatmap_data!}
                        xSize={results.heatmap_x_size!}
                        ySize={results.heatmap_y_size!}
                        title="State Divergence: Initial vs Obfuscated"
                      />
                    ) : (
                      <div className="results-empty">{heatmapMessage}</div>
                    )}
                  </div>
                  <div className="visual-panel">
                    {canRenderAlignment ? (
                      <AlignmentViewer
                        matrix={results.alignment_matrix!}
                        path={results.alignment_path}
                        cStar={results.alignment_c_star}
                        title="DTW Alignment: Initial vs Obfuscated"
                        xLabel="Obfuscated Gate Index"
                        yLabel="Initial Gate Index"
                      />
                    ) : (
                      <div className="results-empty">{alignmentMessage}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
        }
        .page-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }
        .hero {
          text-align: center;
          padding: 32px 20px;
          margin-bottom: 24px;
        }
        .hero h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff, rgba(150, 200, 255, 0.9));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero p {
          color: rgba(200, 200, 220, 0.6);
        }
        .layout {
          display: grid;
          grid-template-columns: 320px 420px 1fr;
          gap: 24px;
        }
        .history-sidebar {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 16px;
          padding: 16px;
          height: calc(100vh - 120px);
          position: sticky;
          top: 24px;
        }
        @media (max-width: 1000px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
        .config-panel,
        .results-panel {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 16px;
          padding: 24px;
        }
        .config-panel h2,
        .results-panel h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(100, 100, 150, 0.2);
        }
        .form-section {
          margin-bottom: 20px;
        }
        .form-section h3 {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin-bottom: 12px;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(240, 240, 250, 1);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 0.9rem;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: rgba(100, 150, 255, 0.5);
        }
        .form-group input:disabled,
        .form-group select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .hint {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.6);
          margin-top: 4px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .toggles {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          color: rgba(200, 200, 220, 0.9);
        }
        .toggle input {
          width: 18px;
          height: 18px;
        }
        .advanced-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: rgba(150, 200, 255, 0.8);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 8px 0;
        }
        .advanced-toggle:hover {
          color: rgba(150, 200, 255, 1);
        }
        .advanced-fields {
          margin-top: 12px;
          padding: 12px;
          background: rgba(30, 30, 45, 0.5);
          border-radius: 8px;
        }
        .actions {
          margin-top: 24px;
        }
        .btn-primary,
        .btn-danger {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 20px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #4a7dff, #6a5acd);
          color: #fff;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(100, 150, 255, 0.3);
        }
        .btn-danger {
          background: linear-gradient(135deg, #ff4a4a, #cd5a5a);
          color: #fff;
        }
        .error {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          border-radius: 8px;
          color: #ff6b6b;
          font-size: 0.85rem;
        }
        .status-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.8);
        }
        .status-indicator .success {
          color: #4ade80;
        }
        .status-indicator .error {
          color: #f87171;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(30, 30, 45, 0.8);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4a7dff, #4ade80);
          border-radius: 4px;
          transition: width 0.3s;
        }
        .log-container {
          height: 300px;
          overflow-y: auto;
          background: rgba(10, 10, 15, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 8px;
          padding: 12px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.75rem;
        }
        .log-empty {
          color: rgba(200, 200, 220, 0.3);
          text-align: center;
          padding: 40px;
        }
        .log-line {
          color: rgba(200, 200, 220, 0.8);
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .results-summary {
          margin-top: 20px;
          padding: 16px;
          background: rgba(30, 30, 45, 0.6);
          border-radius: 12px;
        }
        .results-summary h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin-bottom: 16px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .stat {
          text-align: center;
          padding: 12px;
          background: rgba(20, 20, 30, 0.6);
          border-radius: 8px;
        }
        .stat.highlight {
          background: rgba(100, 150, 255, 0.15);
          border: 1px solid rgba(100, 150, 255, 0.3);
        }
        .stat-label {
          display: block;
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.7);
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }
        .stat-unit {
          display: block;
          font-size: 0.65rem;
          color: rgba(200, 200, 220, 0.6);
        }
        .results-visuals {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .visual-panel {
          min-height: 120px;
        }
        .results-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          padding: 16px;
          text-align: center;
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.5);
          background: rgba(20, 20, 30, 0.4);
          border: 1px dashed rgba(100, 100, 150, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
