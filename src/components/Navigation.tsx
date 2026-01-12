'use client';

import React, { useState } from 'react';
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
    label: 'Playground',
    href: '/playground',
    icon: <Puzzle size={20} />,
    description: 'Interactive Builder',
  },
  {
    label: 'ECA57 Explorer',
    href: '/eca57-explorer',
    icon: <Search size={20} />,
    description: 'Explore ECA57 Identities',
  },
  {
    label: 'ECA57 Playground',
    href: '/eca57-playground',
    icon: <Zap size={20} />,
    description: 'ECA57 Interactive Builder',
  },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="main-navigation">
      <div className="nav-brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-text">Gate 57 Factory</span>
      </div>

      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .main-navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: linear-gradient(
            135deg,
            rgba(20, 20, 35, 0.98),
            rgba(15, 15, 25, 0.99)
          );
          border-bottom: 1px solid rgba(100, 100, 150, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-icon {
          font-size: 1.5rem;
        }

        .brand-text {
          font-size: 1.1rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, rgba(150, 200, 255, 0.9));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-links {
          display: flex;
          gap: 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          color: rgba(200, 200, 220, 0.7);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .nav-link:hover {
          background: rgba(100, 150, 255, 0.1);
          color: #fff;
        }

        .nav-link.active {
          background: rgba(100, 150, 255, 0.2);
          color: #fff;
          border-color: rgba(100, 150, 255, 0.4);
        }

        .nav-label {
          display: block;
        }

        @media (max-width: 768px) {
          .nav-label {
            display: none;
          }
          .nav-link {
            padding: 10px 12px;
          }
        }
      `}</style>
    </nav>
  );
}
