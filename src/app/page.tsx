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
      href: '/cluster',
      icon: <Layers size={32} />,
      title: 'ECA57 Cluster Database',
      description:
        '46K+ identity circuits from cluster SAT enumeration with analysis tools',
      color: 'rgba(100, 255, 150, 0.15)',
      borderColor: 'rgba(100, 255, 150, 0.3)',
    },
    {
      href: '/generators',
      icon: <Cpu size={32} />,
      title: 'Circuit Generators',
      description:
        'Generate identity circuits using SAT, Go enumeration, or pattern-based methods',
      color: 'rgba(150, 150, 200, 0.15)',
      borderColor: 'rgba(150, 150, 200, 0.3)',
    },
    {
      href: '/databases',
      icon: <Database size={32} />,
      title: 'Database Explorer',
      description:
        'Browse circuits from Main DB, SAT, Go brute-force, and Irreducible databases',
      color: 'rgba(100, 150, 255, 0.15)',
      borderColor: 'rgba(100, 150, 255, 0.3)',
    },
    {
      href: '/playground',
      icon: <Puzzle size={32} />,
      title: 'Circuit Playground',
      description:
        'Interactive circuit builder and visualizer with Gate 57 primitives',
      color: 'rgba(255, 180, 100, 0.15)',
      borderColor: 'rgba(255, 180, 100, 0.3)',
    },
  ];

  return (
    <div className="page">
      <Navigation />

      <main className="page-content">
        <header className="hero">
          <h1>⚡ Gate 57 Circuit Factory</h1>
          <p>Unified circuit generation, analysis, and exploration</p>
        </header>

        {/* Stats Overview */}
        <section className="section">
          <h2>Database Overview</h2>
          <StatsCards stats={stats} loading={statsLoading} />
        </section>

        {/* Quick Links */}
        <section className="section">
          <h2>Quick Access</h2>
          <div className="quick-links">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="quick-link"
                style={{
                  background: link.color,
                  borderColor: link.borderColor,
                }}
              >
                <div className="link-icon">{link.icon}</div>
                <div className="link-content">
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                </div>
                <ArrowRight className="link-arrow" size={20} />
              </Link>
            ))}
          </div>
        </section>

        {/* Dimension Groups Summary */}
        <section className="section">
          <h2>Dimension Groups</h2>
          {dimLoading ? (
            <div className="loading">Loading...</div>
          ) : dimGroups.length === 0 ? (
            <div className="empty-state">
              No dimension groups yet. Generate some circuits to get started!
            </div>
          ) : (
            <div className="dim-grid">
              {dimGroups.slice(0, 8).map((dg) => (
                <div key={`${dg.width}-${dg.gate_count}`} className="dim-card">
                  <div className="dim-label">
                    {dg.width}w × {dg.gate_count}g
                  </div>
                  <div className="dim-count">{dg.circuit_count}</div>
                  <div className="dim-sublabel">circuits</div>
                </div>
              ))}
              {dimGroups.length > 8 && (
                <Link href="/databases" className="dim-card more">
                  <span>+{dimGroups.length - 8} more</span>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Database Sources */}
        <section className="section">
          <h2>Available Database Sources</h2>
          <div className="sources-grid">
            <div className="source-card">
              <FileCode size={24} />
              <div>
                <h4>Main DB</h4>
                <p>identity_circuits.db</p>
              </div>
            </div>
            <div className="source-card">
              <Cpu size={24} />
              <div>
                <h4>SAT Revsynth</h4>
                <p>sat_circuits.db</p>
              </div>
            </div>
            <div className="source-card">
              <Zap size={24} />
              <div>
                <h4>Go Brute-Force</h4>
                <p>go-proj/db/*.gob</p>
              </div>
            </div>
            <div className="source-card">
              <FileCode size={24} />
              <div>
                <h4>Irreducible</h4>
                <p>~/.identity_factory/</p>
              </div>
            </div>
          </div>
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

        .hero {
          text-align: center;
          padding: 40px 20px;
          margin-bottom: 20px;
        }

        .hero h1 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #fff, rgba(150, 200, 255, 0.9));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero p {
          color: rgba(200, 200, 220, 0.6);
          font-size: 1.1rem;
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

        .quick-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 24px;
          border-radius: 16px;
          border: 1px solid;
          text-decoration: none;
          transition: all 0.2s;
        }

        .quick-link:hover {
          transform: translateX(4px);
          filter: brightness(1.1);
        }

        .link-icon {
          color: rgba(200, 200, 220, 0.9);
        }

        .link-content {
          flex: 1;
        }

        .link-content h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .link-content p {
          font-size: 0.85rem;
          color: rgba(200, 200, 220, 0.6);
        }

        .link-arrow {
          color: rgba(200, 200, 220, 0.4);
        }

        .dim-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .dim-card {
          background: rgba(30, 30, 45, 0.8);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .dim-label {
          font-size: 0.8rem;
          color: rgba(200, 200, 220, 0.6);
          margin-bottom: 8px;
        }

        .dim-count {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
        }

        .dim-sublabel {
          font-size: 0.7rem;
          color: rgba(200, 200, 220, 0.4);
        }

        .dim-card.more {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(150, 200, 255, 0.8);
          text-decoration: none;
        }

        .dim-card.more:hover {
          background: rgba(100, 150, 255, 0.15);
        }

        .sources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .source-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(30, 30, 45, 0.6);
          border: 1px solid rgba(100, 100, 150, 0.15);
          border-radius: 10px;
          padding: 14px 18px;
          color: rgba(200, 200, 220, 0.7);
        }

        .source-card h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(200, 200, 220, 0.9);
          margin-bottom: 2px;
        }

        .source-card p {
          font-size: 0.75rem;
          color: rgba(200, 200, 220, 0.5);
          font-family: 'SF Mono', monospace;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(200, 200, 220, 0.5);
          background: rgba(30, 30, 45, 0.5);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
