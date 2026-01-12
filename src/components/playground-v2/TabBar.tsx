'use client';

import React from 'react';
import { X, Plus } from 'lucide-react';

export interface CircuitTabData {
  id: string;
  name: string;
  isModified: boolean;
}

interface TabBarProps {
  tabs: CircuitTabData[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabNew: () => void;
  onTabRename: (tabId: string, newName: string) => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabNew,
  onTabRename,
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const handleDoubleClick = (tab: CircuitTabData) => {
    setEditingTabId(tab.id);
    setEditValue(tab.name);
  };

  const handleRenameSubmit = (tabId: string) => {
    if (editValue.trim()) {
      onTabRename(tabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      className="flex items-center h-9 px-2 gap-1 border-b select-none"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Tabs */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab)}
          className={`
                        group flex items-center gap-2 px-3 h-7 rounded cursor-pointer
                        transition-all duration-100
                        ${
                          activeTabId === tab.id
                            ? 'bg-[var(--bg-tertiary)] text-[var(--text-emphasis)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
                        }
                    `}
        >
          {/* Tab name or input */}
          {editingTabId === tab.id ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleRenameSubmit(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(tab.id);
                if (e.key === 'Escape') setEditingTabId(null);
              }}
              autoFocus
              className="w-20 px-1 text-xs bg-[var(--bg-primary)] border border-[var(--border-default)] rounded outline-none text-[var(--text-emphasis)]"
            />
          ) : (
            <span className="text-xs font-medium truncate max-w-[120px]">
              {tab.isModified && (
                <span className="text-[var(--accent-primary)]">• </span>
              )}
              {tab.name}
            </span>
          )}

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className={`
                            p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity
                            hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-emphasis)]
                            ${tabs.length === 1 ? 'hidden' : ''}
                        `}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* New tab button */}
      <button
        onClick={onTabNew}
        className="flex items-center justify-center w-7 h-7 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
        title="New circuit (Cmd+T)"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
