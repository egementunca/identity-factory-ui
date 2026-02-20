'use client';

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { getDbStatus, DbStatusResponse, DbRecord } from '@/lib/api';

type DbEntry = { name: string; record: DbRecord };

function formatSize(size?: number | null) {
  if (size == null) return '—';
  if (size < 1024) return `${size.toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} GB`;
}

const DB_USAGE: Record<string, string> = {
  identity_factory: 'Core API (/api/v1/*)',
  cluster: 'Cluster DB (/api/v1/cluster-database/*)',
  wire_shuffler: 'Wire Shuffler + Waksman',
  sat_db: 'SAT DB (/api/v1/sat-database/*)',
  local_mixing_perm_lmdb: 'Permutation tables (/api/v1/perm-database/*)',
  skeleton_lmdb: 'Skeleton Explorer (/api/v1/skeleton/*)',
  eca57_identities_lmdb: 'ECA57 LMDB Explorer (/api/v1/eca57-lmdb/*)',
  imported_identities: 'Imported identities (/api/v1/imported-identities/*)',
  irreducible: 'Irreducible identities (/api/v1/irreducible/*)',
  go_gob_dir_expected: 'Go DB endpoints (/api/v1/go-database/*)',
};

export default function DbStatusPage() {
  const [data, setData] = useState<DbStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDbStatus();
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Failed to load DB status');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    if (!data) return { sqlite: [], lmdb: [], gob: [], other: [] } as Record<string, DbEntry[]>;
    const entries: DbEntry[] = Object.entries(data.databases).map(([name, record]) => ({
      name,
      record,
    }));
    const buckets: Record<string, DbEntry[]> = { sqlite: [], lmdb: [], gob: [], other: [] };
    entries.forEach((entry) => {
      if (entry.record.type === 'sqlite') buckets.sqlite.push(entry);
      else if (entry.record.type === 'lmdb') buckets.lmdb.push(entry);
      else if (entry.record.type === 'gob') buckets.gob.push(entry);
      else buckets.other.push(entry);
    });
    return buckets;
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Navigation />
      <main className="max-w-[1200px] mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-br from-white to-blue-200/90 bg-clip-text text-transparent">
            DB Status
          </h1>
          <p className="text-slate-400">
            Inventory of local databases and large assets used by the API/UI.
          </p>
          {data?.generated_at && (
            <p className="text-xs text-slate-500 mt-1">
              Generated at {new Date(data.generated_at).toLocaleString()}
            </p>
          )}
        </header>

        {loading && (
          <div className="text-slate-400 bg-slate-800/60 rounded-xl p-6">
            Loading DB status...
          </div>
        )}

        {error && (
          <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {(['sqlite', 'lmdb', 'gob', 'other'] as const).map((section) => (
              grouped[section].length > 0 && (
                <section key={section}>
                  <h2 className="text-lg font-semibold text-white mb-3 uppercase tracking-wide">
                    {section}
                  </h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {grouped[section].map(({ name, record }) => (
                      <div
                        key={name}
                        className={`rounded-2xl border p-4 bg-slate-800/70 ${record.exists ? 'border-emerald-400/30' : 'border-red-400/30'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-white">{name}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${record.exists ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}
                          >
                            {record.exists ? 'present' : 'missing'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mb-2 break-all">
                          {record.path}
                        </div>
                        <div className="text-xs text-slate-300 flex justify-between">
                          <span>Size</span>
                          <span>{formatSize(record.size_mb)}</span>
                        </div>
                        {record.table_count !== undefined && (
                          <div className="text-xs text-slate-300 flex justify-between mt-1">
                            <span>Tables</span>
                            <span>{record.table_count}</span>
                          </div>
                        )}
                        {record.tables && (
                          <div className="text-xs text-slate-400 mt-2">
                            {Object.entries(record.tables).map(([t, c]) => (
                              <div key={t} className="flex justify-between">
                                <span>{t}</span>
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {record.files && record.files.length > 0 && (
                          <div className="text-xs text-slate-500 mt-2">
                            {record.files.join(', ')}
                          </div>
                        )}
                        {DB_USAGE[name] && (
                          <div className="text-xs text-slate-400 mt-2">
                            Used by: {DB_USAGE[name]}
                          </div>
                        )}
                        {record.note && (
                          <div className="text-xs text-slate-500 mt-2">
                            {record.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
