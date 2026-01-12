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
      // Use the first supported gate set from the generator
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
    <div className={`generator-card ${isActive ? 'active' : ''}`}>
      <div className="generator-header">
        <div className="generator-title">
          <h3>{generator.display_name}</h3>
          <div className="generator-badges">
            {generator.gate_sets.map((gs) => (
              <span key={gs} className="badge gate-set">
                {gs.toUpperCase()}
              </span>
            ))}
            {generator.supports_incremental && (
              <span className="badge feature">Incremental</span>
            )}
          </div>
        </div>
        <p className="generator-description">{generator.description}</p>
      </div>

      <div className="generator-controls">
        <div className="control-group">
          <label>Wires</label>
          <input
            type="number"
            min={2}
            max={8}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>Gates</label>
          <input
            type="number"
            min={1}
            max={50}
            value={gateCount}
            onChange={(e) => setGateCount(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>Max Circuits</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={maxCircuits}
            onChange={(e) => setMaxCircuits(Number(e.target.value))}
          />
        </div>
      </div>

      {generator.config_schema && (
        <button
          className="config-toggle"
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Hide' : 'Show'} Advanced Config
        </button>
      )}

      <button
        className="btn-primary start-btn"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Starting...' : 'Start Generation'}
      </button>

      <style jsx>{`
        .generator-card {
          background: linear-gradient(
            135deg,
            rgba(30, 30, 40, 0.95),
            rgba(20, 20, 30, 0.9)
          );
          backdrop-filter: blur(10px);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
        }

        .generator-card:hover {
          border-color: rgba(100, 150, 255, 0.4);
          box-shadow: 0 8px 32px rgba(0, 100, 255, 0.1);
          transform: translateY(-2px);
        }

        .generator-card.active {
          border-color: rgba(100, 255, 150, 0.6);
          box-shadow: 0 0 20px rgba(100, 255, 150, 0.2);
        }

        .generator-header {
          margin-bottom: 20px;
        }

        .generator-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .generator-title h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
        }

        .generator-badges {
          display: flex;
          gap: 6px;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge.gate-set {
          background: rgba(100, 150, 255, 0.2);
          color: #8ab4ff;
        }

        .badge.feature {
          background: rgba(100, 255, 150, 0.2);
          color: #8affb4;
        }

        .generator-description {
          color: rgba(200, 200, 220, 0.7);
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.4;
        }

        .generator-controls {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .control-group label {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .control-group input {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(100, 100, 150, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .control-group input:focus {
          outline: none;
          border-color: rgba(100, 150, 255, 0.6);
          box-shadow: 0 0 10px rgba(100, 150, 255, 0.2);
        }

        .config-toggle {
          background: none;
          border: none;
          color: rgba(100, 150, 255, 0.8);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 8px 0;
          width: 100%;
          text-align: center;
          margin-bottom: 8px;
        }

        .config-toggle:hover {
          color: rgba(100, 150, 255, 1);
        }

        .start-btn {
          width: 100%;
          padding: 12px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #4a6fff, #3a5fee);
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .start-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #5a7fff, #4a6fff);
          box-shadow: 0 4px 20px rgba(60, 100, 255, 0.4);
        }

        .start-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
