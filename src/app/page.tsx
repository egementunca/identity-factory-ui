'use client';

import Link from 'next/link';
import { useFactoryStats, useDimGroups } from '@/hooks/useFactory';
import { StatsCards } from '@/components/dashboard/StatsCards';
import Navigation from '@/components/Navigation';
import {
  Cpu,
  Database,
  Puzzle,
  ArrowRight,
  Zap,
  FileCode,
  Layers,
} from 'lucide-react';

export default function Dashboard() {
  const { stats, loading: statsLoading } = useFactoryStats();
  const { dimGroups, loading: dimLoading } = useDimGroups();

  const quickLinks = [
    {
      href: '/databases',
      icon: <Database size={32} />,
      title: 'Database Explorer',
      description:
        'Browse circuits from LMDB templates, SQLite enumerated, and Cluster SAT databases',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/30',
    },
    {
      href: '/generators',
      icon: <Cpu size={32} />,
      title: 'Circuit Generators',
      description:
        'Generate identity circuits using SAT, Go enumeration, or pattern-based methods',
      bgColor: 'bg-slate-500/15',
      borderColor: 'border-slate-500/30',
    },
    {
      href: '/playground-v2',
      icon: <Puzzle size={32} />,
      title: 'Circuit Playground',
      description:
        'Interactive circuit builder and visualizer with Gate 57 primitives',
      bgColor: 'bg-orange-500/15',
      borderColor: 'border-orange-500/30',
    },
    {
      href: '/skeleton-explorer',
      icon: <Layers size={32} />,
      title: 'Skeleton Explorer',
      description:
        'Browse fully noncommuting skeleton identity circuits for local_mixing',
      bgColor: 'bg-green-500/15',
      borderColor: 'border-green-500/30',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Navigation />
      <main className="max-w-[1200px] mx-auto p-6">
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Database Overview
          </h2>
          <StatsCards stats={stats} loading={statsLoading} />
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
          <div className="flex flex-col gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-5 px-6 py-5 rounded-2xl border no-underline transition-all hover:translate-x-1 hover:brightness-110 ${link.bgColor} ${link.borderColor}`}
              >
                <div className="text-slate-300">{link.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {link.title}
                  </h3>
                  <p className="text-sm text-slate-400">{link.description}</p>
                </div>
                <ArrowRight className="text-slate-500" size={20} />
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Dimension Groups
          </h2>
          {dimLoading ? (
            <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl">
              Loading...
            </div>
          ) : dimGroups.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl">
              No dimension groups yet. Generate some circuits to get started!
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
              {dimGroups.slice(0, 8).map((dg) => (
                <div
                  key={`${dg.width}-${dg.gate_count}`}
                  className="bg-slate-800/80 border border-slate-600/20 rounded-xl p-4 text-center"
                >
                  <div className="text-xs text-slate-400 mb-2">
                    {dg.width}w × {dg.gate_count}g
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {dg.circuit_count}
                  </div>
                  <div className="text-[0.7rem] text-slate-500">circuits</div>
                </div>
              ))}
              {dimGroups.length > 8 && (
                <Link
                  href="/databases"
                  className="bg-slate-800/80 border border-slate-600/20 rounded-xl p-4 flex items-center justify-center text-blue-400 no-underline hover:bg-blue-500/15"
                >
                  <span>+{dimGroups.length - 8} more</span>
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Available Database Sources
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            <div className="flex items-center gap-3.5 bg-slate-800/60 border border-slate-600/15 rounded-xl px-4 py-3.5 text-slate-400">
              <FileCode size={24} />
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-0.5">
                  Main DB
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  identity_circuits.db
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-slate-800/60 border border-slate-600/15 rounded-xl px-4 py-3.5 text-slate-400">
              <Cpu size={24} />
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-0.5">
                  SAT Revsynth
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  sat_circuits.db
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-slate-800/60 border border-slate-600/15 rounded-xl px-4 py-3.5 text-slate-400">
              <Zap size={24} />
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-0.5">
                  Go Brute-Force
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  go-proj/db/*.gob
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 bg-slate-800/60 border border-slate-600/15 rounded-xl px-4 py-3.5 text-slate-400">
              <FileCode size={24} />
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-0.5">
                  Irreducible
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  ~/.identity_factory/
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
