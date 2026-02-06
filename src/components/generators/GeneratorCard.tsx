'use client';

import { useState } from 'react';
import { GeneratorInfo, GenerateRequest } from '@/lib/api';

interface GeneratorCardProps {
  generator: GeneratorInfo;
  onStart: (request: GenerateRequest) => Promise<void>;
  isActive?: boolean;
}

export function GeneratorCard({
  generator,
  onStart,
  isActive,
}: GeneratorCardProps) {
  const [width, setWidth] = useState(3);
  const [gateCount, setGateCount] = useState(6);
  const [maxCircuits, setMaxCircuits] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const gateSet = generator.gate_sets[0] || 'mcx';
      await onStart({
        generator_name: generator.name,
        width,
        gate_count: gateCount,
        gate_set: gateSet,
        max_circuits: maxCircuits,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-gradient-to-br from-slate-800/95 to-slate-900/90 backdrop-blur-lg border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,100,255,0.1)] ${
        isActive
          ? 'border-green-400/60 shadow-[0_0_20px_rgba(100,255,150,0.2)]'
          : 'border-slate-600/20 hover:border-blue-400/40'
      }`}
    >
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h3 className="m-0 text-xl font-semibold text-white">
            {generator.display_name}
          </h3>
          <div className="flex gap-1.5">
            {generator.gate_sets.map((gs) => (
              <span
                key={gs}
                className="px-2 py-0.5 rounded text-[0.7rem] font-semibold uppercase tracking-wide bg-blue-500/20 text-blue-300"
              >
                {gs.toUpperCase()}
              </span>
            ))}
            {generator.supports_incremental && (
              <span className="px-2 py-0.5 rounded text-[0.7rem] font-semibold uppercase tracking-wide bg-green-500/20 text-green-300">
                Incremental
              </span>
            )}
          </div>
        </div>
        <p className="text-slate-400 text-sm m-0 leading-relaxed">
          {generator.description}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wide">
            Wires
          </label>
          <input
            type="number"
            min={2}
            max={8}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="bg-black/30 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-base transition-all focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_10px_rgba(100,150,255,0.2)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wide">
            Gates
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={gateCount}
            onChange={(e) => setGateCount(Number(e.target.value))}
            className="bg-black/30 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-base transition-all focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_10px_rgba(100,150,255,0.2)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wide">
            Max Circuits
          </label>
          <input
            type="number"
            min={1}
            max={1000}
            value={maxCircuits}
            onChange={(e) => setMaxCircuits(Number(e.target.value))}
            className="bg-black/30 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-base transition-all focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_10px_rgba(100,150,255,0.2)]"
          />
        </div>
      </div>

      {generator.config_schema && (
        <button
          className="w-full bg-transparent border-none text-blue-400/80 text-sm cursor-pointer py-2 text-center mb-2 hover:text-blue-400"
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Hide' : 'Show'} Advanced Config
        </button>
      )}

      <button
        className="w-full p-3 text-base font-semibold border-none rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white cursor-pointer transition-all hover:from-blue-500 hover:to-blue-600 hover:shadow-[0_4px_20px_rgba(60,100,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Starting...' : 'Start Generation'}
      </button>
    </div>
  );
}
