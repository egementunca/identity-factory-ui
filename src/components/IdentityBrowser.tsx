'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, FileText, Download, X, RefreshCw, Clock, Layers, Cpu, Folder } from 'lucide-react';
import { API_HOST } from '@/lib/api';

interface IdentityFile {
  filename: string;
  relative_path: string;
  wires: number | null;
  gates: number | null;
  timestamp: number | null;
  size_bytes: number;
  created_at: string;
}

interface IdentityBrowserProps {
  onLoadCircuit: (circuitStr: string, wires: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = API_HOST;

export default function IdentityBrowser({ onLoadCircuit, isOpen, onClose }: IdentityBrowserProps) {
  const [identities, setIdentities] = useState<IdentityFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loadingCircuit, setLoadingCircuit] = useState(false);

  const fetchIdentities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/local-mixing/identities/saved`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setIdentities(data.identities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch identities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchIdentities();
    }
  }, [isOpen, fetchIdentities]);

  const handleLoadCircuit = async (relativePath: string, wires: number | null) => {
    setLoadingCircuit(true);
    setSelectedFile(relativePath);
    try {
      const res = await fetch(`${API_BASE}/api/v1/local-mixing/identities/saved/${relativePath}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      onLoadCircuit(data.circuit_str, wires || 8);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load circuit');
    } finally {
      setLoadingCircuit(false);
      setSelectedFile(null);
    }
  };

  // Helper to get folder name from relative path
  const getFolderPath = (relativePath: string) => {
    const parts = relativePath.split('/');
    if (parts.length > 1) {
      return parts.slice(0, -1).join('/');
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Load Circuit</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIdentities}
              disabled={loading}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading && !identities.length ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading circuits...
            </div>
          ) : identities.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No circuit files found.</p>
              <p className="text-sm mt-2">
                Generate some using: <code className="bg-slate-700 px-2 py-1 rounded">grow-identity</code>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {identities.map((file) => {
                const folderPath = getFolderPath(file.relative_path);
                return (
                  <div
                    key={file.relative_path}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer
                      ${selectedFile === file.relative_path
                        ? 'bg-green-900/30 border-green-600'
                        : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                      }`}
                    onClick={() => handleLoadCircuit(file.relative_path, file.wires)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{file.filename}</div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                          {folderPath && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Folder className="w-3 h-3" />
                              {folderPath}
                            </span>
                          )}
                          {file.wires && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {file.wires} wires
                            </span>
                          )}
                          {file.gates && (
                            <span className="flex items-center gap-1">
                              <Cpu className="w-3 h-3" />
                              {file.gates} gates
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={loadingCircuit && selectedFile === file.relative_path}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600/80 hover:bg-green-500 
                        text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadCircuit(file.relative_path, file.wires);
                      }}
                    >
                      {loadingCircuit && selectedFile === file.relative_path ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Load
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/80 text-xs text-slate-500">
          Directory: <code>local_mixing/experiments/</code>
        </div>
      </div>
    </div>
  );
}
