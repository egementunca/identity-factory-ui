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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Navigation />

      <main className="max-w-[1200px] mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-br from-white to-blue-200/90 bg-clip-text text-transparent">
            Circuit Generators
          </h1>
          <p className="text-slate-400">
            Generate identity circuits using various methods
          </p>
        </header>

        {activeRuns.length > 0 && (
          <div className="inline-flex items-center gap-2.5 bg-green-500/15 border border-green-500/30 px-5 py-2.5 rounded-xl text-green-300 font-semibold mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-green-300 animate-pulse" />
            {activeRuns.length} Active Run{activeRuns.length > 1 ? 's' : ''}
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Available Generators
          </h2>
          {genError && (
            <div className="p-5 text-center bg-red-500/10 rounded-lg text-red-300">
              {genError}
            </div>
          )}
          {genLoading ? (
            <div className="p-5 text-center text-slate-400">
              Loading generators...
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
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

        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-300">
              Generation Runs
            </h2>
            <button
              className="bg-slate-600/20 border border-slate-600/30 px-4 py-2 rounded-lg text-slate-400 cursor-pointer hover:bg-slate-600/40 hover:text-white transition-colors"
              onClick={refreshRuns}
            >
              ↻ Refresh
            </button>
          </div>
          <RunsList runs={runs} onCancel={cancel} onDelete={remove} />
        </section>
      </main>
    </div>
  );
}
