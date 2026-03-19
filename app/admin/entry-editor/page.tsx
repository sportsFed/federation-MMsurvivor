'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { useAdminAuth } from '@/context/AdminAuthContext';

interface SurvivorPick {
  team: string;
  round: string;
  dateKey: string;
  gameId: string;
  isProjectionPick: boolean;
  result?: string;
  pickedAt?: string;
}

interface EntryData {
  id: string;
  displayName?: string;
  survivorPicks?: SurvivorPick[];
  [key: string]: any;
}

function formatPickedAt(val: any): string {
  if (!val) return '—';
  if (val.toDate) return val.toDate().toLocaleString();
  return new Date(val).toLocaleString();
}

export default function EntryEditorPage() {
  const { logout } = useAdminAuth();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<EntryData | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<null | { type: 'void' | 'override'; index: number }>(null);

  const fetchEntries = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const snap = await getDocs(collection(db, 'entries'));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EntryData));
      data.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
      setEntries(data);
    } catch (err: any) {
      setFetchError(`Failed to load entries: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = entries.filter((e) =>
    (e.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const refreshSelectedEntry = async (userId: string) => {
    const docSnap = await getDoc(doc(db, 'entries', userId));
    if (docSnap.exists()) {
      const updated = { id: docSnap.id, ...docSnap.data() } as EntryData;
      setSelectedEntry(updated);
      setEntries((prev) => prev.map((e) => (e.id === userId ? updated : e)));
    }
  };

  const handleVoidPick = async (targetUserId: string, pickIndex: number) => {
    setActionMessage('');
    setActionError('');
    try {
      const res = await fetch('/api/admin/modify-entry-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void_pick', targetUserId, pickIndex }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`✅ Pick #${pickIndex} voided successfully.`);
        await refreshSelectedEntry(targetUserId);
      } else {
        setActionError(`❌ Error: ${data.error ?? 'Unknown error'}`);
      }
    } catch (err: any) {
      setActionError(`❌ Network error: ${err.message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetCanonical = async (targetUserId: string, pickIndex: number, pick: SurvivorPick) => {
    setActionMessage('');
    setActionError('');
    try {
      const res = await fetch('/api/admin/modify-entry-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'override_pick',
          targetUserId,
          pickIndex,
          overridePick: {
            team: pick.team,
            round: pick.round,
            dateKey: pick.dateKey,
            gameId: pick.gameId,
            isProjectionPick: pick.isProjectionPick,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`✅ Pick #${pickIndex} re-asserted as canonical.`);
        await refreshSelectedEntry(targetUserId);
      } else {
        setActionError(`❌ Error: ${data.error ?? 'Unknown error'}`);
      }
    } catch (err: any) {
      setActionError(`❌ Network error: ${err.message}`);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src="/Fed-Logo-Full.png" alt="The Federation" style={{ width: '48px' }} />
            <div>
              <h1 className="font-bebas text-4xl text-white tracking-widest italic">Entry Editor</h1>
              <p className="text-slate-400 text-sm">View and modify survivor picks for individual entrants</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition"
            >
              ← Admin Home
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: entrant list */}
          <div className="md:col-span-1">
            <div className="p-4 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <h2 className="font-bebas text-xl text-white tracking-widest mb-3">Select Entrant</h2>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-white text-sm mb-3 focus:border-red-600 outline-none"
              />
              {loading ? (
                <p className="text-slate-500 text-sm">Loading entries...</p>
              ) : fetchError ? (
                <p className="text-red-400 text-sm">{fetchError}</p>
              ) : (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {filteredEntries.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelectedEntry(e);
                        setActionMessage('');
                        setActionError('');
                        setPendingAction(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-sans transition ${
                        selectedEntry?.id === e.id
                          ? 'bg-red-900/40 border border-red-500/50 text-white'
                          : 'border border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="font-medium">{e.displayName || 'Anonymous'}</span>
                      <span className="text-slate-600 text-xs ml-2">
                        {(e.survivorPicks ?? []).length} pick{(e.survivorPicks ?? []).length !== 1 ? 's' : ''}
                      </span>
                    </button>
                  ))}
                  {filteredEntries.length === 0 && (
                    <p className="text-slate-600 text-sm py-2">No entries match your search.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: picks table */}
          <div className="md:col-span-2">
            {!selectedEntry ? (
              <div className="p-8 rounded-xl border border-white/10 text-center text-slate-500" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-lg">Select an entrant from the left to view their picks.</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bebas text-2xl text-white tracking-widest">
                      {selectedEntry.displayName || 'Anonymous'}
                    </h2>
                    <p className="text-slate-500 text-xs font-mono">{selectedEntry.id}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    selectedEntry.isEliminated
                      ? 'bg-red-900/50 text-red-400 border border-red-500/40'
                      : 'bg-green-900/50 text-green-400 border border-green-500/40'
                  }`}>
                    {selectedEntry.isEliminated ? 'Eliminated' : 'Active'}
                  </span>
                </div>

                {actionMessage && (
                  <div className="mb-3 p-2 rounded bg-green-900/30 border border-green-500/40 text-green-400 text-sm font-sans">
                    {actionMessage}
                  </div>
                )}
                {actionError && (
                  <div className="mb-3 p-2 rounded bg-red-900/30 border border-red-500/40 text-red-400 text-sm font-sans">
                    {actionError}
                  </div>
                )}

                {(selectedEntry.survivorPicks ?? []).length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No survivor picks on record.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-2 px-2 text-left">#</th>
                          <th className="py-2 px-2 text-left">Team</th>
                          <th className="py-2 px-2 text-left">Round</th>
                          <th className="py-2 px-2 text-left">Date Key</th>
                          <th className="py-2 px-2 text-left">Game ID</th>
                          <th className="py-2 px-2 text-left">Proj?</th>
                          <th className="py-2 px-2 text-left">Result</th>
                          <th className="py-2 px-2 text-left">Picked At</th>
                          <th className="py-2 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedEntry.survivorPicks ?? []).map((pick, i) => (
                          <tr key={i} className="border-b border-slate-800 hover:bg-white/5 transition">
                            <td className="py-2 px-2 text-slate-400">{i}</td>
                            <td className="py-2 px-2 text-white font-sans font-medium">{pick.team}</td>
                            <td className="py-2 px-2 text-slate-300">{pick.round}</td>
                            <td className="py-2 px-2 text-slate-300">{pick.dateKey}</td>
                            <td className="py-2 px-2 text-slate-500 text-[10px] max-w-[80px] truncate">{pick.gameId}</td>
                            <td className="py-2 px-2 text-slate-400">{pick.isProjectionPick ? 'Yes' : 'No'}</td>
                            <td className={`py-2 px-2 font-bold ${
                              pick.result === 'win' ? 'text-green-400' :
                              pick.result === 'loss' ? 'text-red-400' :
                              'text-slate-500'
                            }`}>
                              {pick.result ?? '—'}
                            </td>
                            <td className="py-2 px-2 text-slate-500 text-[10px]">
                              {formatPickedAt(pick.pickedAt)}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex gap-1 justify-center">
                                {pendingAction?.type === 'void' && pendingAction.index === i ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleVoidPick(selectedEntry.id, i)}
                                      className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-[10px] font-sans font-bold transition"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setPendingAction(null)}
                                      className="px-2 py-1 rounded border border-slate-600 text-slate-400 text-[10px] font-sans transition hover:text-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setPendingAction({ type: 'void', index: i })}
                                    className="px-2 py-1 rounded bg-red-900/40 border border-red-500/30 hover:bg-red-700/50 text-red-400 text-[10px] font-sans transition"
                                  >
                                    Void Pick
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSetCanonical(selectedEntry.id, i, pick)}
                                  className="px-2 py-1 rounded bg-slate-800 border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white text-[10px] font-sans transition"
                                >
                                  Set Canonical
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
