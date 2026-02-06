'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Cpu,
  Database,
  Puzzle,
  Search,
  Zap,
  FlaskConical,
  Shuffle,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <Home size={20} />,
    description: 'Overview & Stats',
  },
  {
    label: 'Experiments',
    href: '/experiments',
    icon: <FlaskConical size={20} />,
    description: 'Run Obfuscation Experiments',
  },
  {
    label: 'Generators',
    href: '/generators',
    icon: <Cpu size={20} />,
    description: 'Generate Circuits',
  },
  {
    label: 'Databases',
    href: '/databases',
    icon: <Database size={20} />,
    description: 'Explore All Circuits',
  },
  {
    label: 'Wire Shuffler',
    href: '/wire-shuffler',
    icon: <Shuffle size={20} />,
    description: 'Wire permutation explorer',
  },
  {
    label: 'Playground Pro',
    href: '/playground-v2',
    icon: <Puzzle size={20} />,
    description: 'Advanced Circuit Builder',
  },
  {
    label: 'ECA57 Explorer',
    href: '/eca57-explorer',
    icon: <Search size={20} />,
    description: 'Explore ECA57 Identities',
  },
  {
    label: 'Skeleton Explorer',
    href: '/skeleton-explorer',
    icon: <Zap size={20} />,
    description: 'Skeleton Identity Circuits',
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gradient-to-br from-slate-900/[0.98] to-slate-950/[0.99] border-b border-slate-700/20 sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">⚡</span>
        <span className="text-lg font-bold bg-gradient-to-br from-white to-blue-200/90 bg-clip-text text-transparent">
          Gate 57 Factory
        </span>
      </div>

      <div className="flex gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all border border-transparent
              hover:bg-blue-500/10
              ${pathname === item.href
                ? 'bg-blue-500/20 border-blue-500/40'
                : ''
              }`}
          >
            {item.icon}
            <span className="hidden md:block">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
