'use client';

import { FactoryStats } from '@/lib/api';

interface StatsCardsProps {
  stats: FactoryStats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="stats-loading">
        <div className="skeleton-cards">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card"></div>
          ))}
        </div>
        <style jsx>{`
          .stats-loading {
            padding: 20px 0;
          }
          .skeleton-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .skeleton-card {
            height: 100px;
            background: linear-gradient(
              90deg,
              rgba(50, 50, 60, 0.5) 25%,
              rgba(70, 70, 80, 0.5) 50%,
              rgba(50, 50, 60, 0.5) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 12px;
          }
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Circuits',
      value: stats.total_circuits.toLocaleString(),
      icon: '◎',
      color: '#8ab4ff',
    },
    {
      label: 'Dimension Groups',
      value: stats.total_dim_groups.toLocaleString(),
      icon: '▣',
      color: '#8affb4',
    },
    {
      label: 'Representatives',
      value: stats.total_representatives.toLocaleString(),
      icon: '★',
      color: '#ffb48a',
    },
    {
      label: 'Database Size',
      value: stats.database_size_mb
        ? `${stats.database_size_mb.toFixed(1)} MB`
        : 'N/A',
      icon: '◉',
      color: '#b48aff',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <div className="stat-icon" style={{ color: card.color }}>
            {card.icon}
          </div>
          <div className="stat-content">
            <span className="stat-value" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="stat-label">{card.label}</span>
          </div>
        </div>
      ))}
      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-card {
          background: linear-gradient(
            135deg,
            rgba(30, 30, 40, 0.9),
            rgba(20, 20, 30, 0.8)
          );
          backdrop-filter: blur(10px);
          border: 1px solid rgba(100, 100, 150, 0.2);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
        }

        .stat-card:hover {
          border-color: rgba(100, 150, 255, 0.3);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 2rem;
          opacity: 0.8;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(200, 200, 220, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}
