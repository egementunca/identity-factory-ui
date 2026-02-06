'use client';

import { FactoryStats } from '@/lib/api';

interface StatsCardsProps {
  stats: FactoryStats | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="py-5">
        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[100px] bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 bg-[length:200%_100%] animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Circuits',
      value: stats.total_circuits.toLocaleString(),
      icon: '◎',
      colorClass: 'text-blue-300',
    },
    {
      label: 'Dimension Groups',
      value: stats.total_dim_groups.toLocaleString(),
      icon: '▣',
      colorClass: 'text-green-300',
    },
    {
      label: 'Representatives',
      value: stats.total_representatives.toLocaleString(),
      icon: '★',
      colorClass: 'text-orange-300',
    },
    {
      label: 'Database Size',
      value: stats.database_size_mb
        ? `${stats.database_size_mb.toFixed(1)} MB`
        : 'N/A',
      icon: '◉',
      colorClass: 'text-purple-300',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/80 backdrop-blur-lg border border-slate-600/20 rounded-xl p-5 flex items-center gap-4 transition-all duration-300 hover:border-blue-500/30 hover:-translate-y-0.5"
        >
          <div className={`text-3xl opacity-80 ${card.colorClass}`}>
            {card.icon}
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-bold ${card.colorClass}`}>
              {card.value}
            </span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              {card.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
