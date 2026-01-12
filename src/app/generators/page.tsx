'use client';

import { useGenerators, useRuns } from '@/hooks/useFactory';
import { GeneratorCard } from '@/components/generators/GeneratorCard';
import { RunsList } from '@/components/generators/RunsList';
import Navigation from '@/components/Navigation';
import { GenerateRequest } from '@/lib/api';

export default function GeneratorsPage() {
  const { generators, loading: genLoading, error: genError } = useGenerators();
  const {
    runs,
    loading: runsLoading,
    startRun,
    cancel,
    remove,
    refresh: refreshRuns,
  } = useRuns();

  const handleStartGeneration = async (request: GenerateRequest) => {
    await startRun(request);
  };

  const activeRuns = runs.filter((r) => r.status === 'running');

  return (
    <div className="page">
      <Navigation />

      <main className="page-content">
        <header className="page-header">
          <h1>Circuit Generators</h1>
          <p>Generate identity circuits using various methods</p>
        </header>

        {/* Active Indicator */}
        {activeRuns.length > 0 && (
          <div className="active-banner">
            <span className="pulse" />
            {activeRuns.length} Active Run{activeRuns.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Available Generators */}
        <section className="section">
          <h2>Available Generators</h2>
          {genError && <div className="error-banner">{genError}</div>}
          {genLoading ? (
            <div className="loading">Loading generators...</div>
          ) : (
            <div className="generators-grid">
              {generators.map((gen) => (
                <GeneratorCard
                  key={gen.name}
                  generator={gen}
                  onStart={handleStartGeneration}
                  isActive={activeRuns.some(
                    (r) => r.generator_name === gen.name
                  )}
                />
              ))}
            </div>
          )}
        </section>

        {/* Generation Runs */}
        <section className="section">
          <div className="section-header">
            <h2>Generation Runs</h2>
            <button className="btn-refresh" onClick={refreshRuns}>
              ↻ Refresh
            </button>
          </div>
          <RunsList runs={runs} onCancel={cancel} onDelete={remove} />
        </section>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
        }

        .page-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff, rgba(150, 200, 255, 0.9));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .page-header p {
          color: rgba(200, 200, 220, 0.6);
        }

        .active-banner {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(100, 255, 150, 0.15);
          border: 1px solid rgba(100, 255, 150, 0.3);
          padding: 10px 20px;
          border-radius: 12px;
          color: #8affb4;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #8affb4;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .section {
          margin-bottom: 40px;
        }

        .section h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h2 {
          margin-bottom: 0;
        }

        .generators-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .btn-refresh {
          background: rgba(100, 100, 150, 0.2);
          border: 1px solid rgba(100, 100, 150, 0.3);
          padding: 8px 16px;
          border-radius: 8px;
          color: rgba(200, 200, 220, 0.8);
          cursor: pointer;
        }

        .btn-refresh:hover {
          background: rgba(100, 100, 150, 0.4);
          color: #fff;
        }

        .loading,
        .error-banner {
          padding: 20px;
          text-align: center;
          color: rgba(200, 200, 220, 0.6);
        }

        .error-banner {
          background: rgba(255, 100, 100, 0.1);
          border-radius: 8px;
          color: #ff8a8a;
        }
      `}</style>
    </div>
  );
}
