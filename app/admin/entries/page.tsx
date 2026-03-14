'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';

const COMMISSIONER_EMAIL = 'thesportsfederation@gmail.com';

type Entry = {
  id: string;
  displayName: string;
  email: string;
  createdAt?: string;
  isEliminated?: boolean;
  totalPoints?: number;
  survivorPicks?: Array<{ team?: string; seed?: number; round?: string; pickedAt?: string }>;
  finalFourPicks?: Array<{ team?: string; pickedAt?: string }>;
  championPick?: { team?: string; pickedAt?: string };
  [key: string]: any;
};

export default function AdminEntriesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'displayName' | 'createdAt'>('displayName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.email === COMMISSIONER_EMAIL) {
      loadEntries();
    }
  }, [user]);

  const loadEntries = async () => {
    setLoading(true);
    const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry));
    setEntries(data);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setLoginError('Invalid credentials. Commissioner login only.');
    }
  };

  const handleDelete = async (entry: Entry) => {
    setDeleting(entry.id);
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/admin/delete-entry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: entry.id, idToken }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.error}`);
      } else {
        setEntries(prev => prev.filter(e => e.id !== entry.id));
        setDeleteConfirm(null);
      }
    } catch {
      alert('Delete failed. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const sorted = [...entries]
    .filter(e =>
      e.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
      e.email?.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      const va = (a[sortField] ?? '') as string;
      const vb = (b[sortField] ?? '') as string;
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const toggleSort = (field: 'displayName' | 'createdAt') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <p className="text-slate-400 font-bebas text-2xl tracking-widest">Loading...</p>
      </div>
    );
  }

  if (!user || user.email !== COMMISSIONER_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="glass-panel p-8 w-full max-w-sm border border-white/10 text-center">
          <h2 className="font-bebas text-3xl text-white mb-2 italic">Commissioner Access</h2>
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-6">Admin Portal</p>
          {loginError && (
            <div className="mb-4 bg-red-900/40 border border-red-600/50 text-red-300 p-3 rounded-lg text-sm">
              {loginError}
            </div>
          )}
          <input
            type="email"
            placeholder="Commissioner Email"
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-3 focus:border-red-600 outline-none text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none text-sm"
            required
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bebas text-4xl text-white italic tracking-tight">Admin Portal</h1>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Entrant Management</p>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-sm block">{user.email}</span>
            <button
              onClick={() => auth.signOut()}
              className="text-slate-500 hover:text-red-500 text-xs uppercase tracking-widest transition mt-1"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-4 text-center">
            <p className="font-bebas text-3xl text-white">{entries.length}</p>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Total Entries</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <p className="font-bebas text-3xl text-green-400">{entries.filter(e => !e.isEliminated).length}</p>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Active</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <p className="font-bebas text-3xl text-red-400">{entries.filter(e => e.isEliminated).length}</p>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Eliminated</p>
          </div>
        </div>

        {/* Filter / Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 p-3 rounded-lg text-white text-sm focus:border-red-600 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bebas text-2xl tracking-widest">Loading Entries...</div>
        ) : (
          <div className="glass-panel overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-slate-700/50 text-[10px] uppercase tracking-widest text-slate-500">
              <button onClick={() => toggleSort('displayName')} className="text-left hover:text-white transition flex items-center gap-1 !bg-transparent !p-0 !rounded-none !text-[10px] !font-normal !uppercase !tracking-widest !py-0">
                Entrant {sortField === 'displayName' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
              <span>Email</span>
              <button onClick={() => toggleSort('createdAt')} className="text-left hover:text-white transition flex items-center gap-1 !bg-transparent !p-0 !rounded-none !text-[10px] !font-normal !uppercase !tracking-widest !py-0">
                Registered {sortField === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {sorted.length === 0 && (
              <div className="text-center py-16 text-slate-500 italic">No entries found.</div>
            )}

            {sorted.map(entry => (
              <div key={entry.id}>
                {/* Entry Row */}
                <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-6 py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition items-center">
                  <div>
                    <p className="text-white font-bebas text-lg tracking-wide">{entry.displayName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">{entry.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${entry.isEliminated ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>
                      {entry.isEliminated ? 'Eliminated' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                      className="!bg-slate-700 hover:!bg-slate-600 !text-white !text-xs !px-3 !py-1.5 !rounded-lg transition"
                    >
                      {expandedEntry === entry.id ? 'Hide Picks' : 'View Picks'}
                    </button>
                    {deleteConfirm === entry.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={deleting === entry.id}
                          className="!bg-red-700 hover:!bg-red-800 !text-white !text-xs !px-3 !py-1.5 !rounded-lg transition disabled:opacity-50"
                        >
                          {deleting === entry.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="!bg-slate-700 hover:!bg-slate-600 !text-white !text-xs !px-3 !py-1.5 !rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        className="!bg-red-900/40 hover:!bg-red-700 !text-red-400 hover:!text-white !text-xs !px-3 !py-1.5 !rounded-lg transition border border-red-700/30"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Pick History */}
                {expandedEntry === entry.id && (
                  <div className="bg-slate-900/60 border-b border-slate-700/50 px-6 py-5">
                    <h3 className="font-bebas text-xl text-white mb-4 tracking-wide">Pick History — {entry.displayName}</h3>

                    {/* Survivor Picks */}
                    <div className="mb-5">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Survivor Picks</h4>
                      {entry.survivorPicks && entry.survivorPicks.length > 0 ? (
                        <div className="space-y-2">
                          {entry.survivorPicks.map((pick, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-800/40 rounded-lg px-4 py-2">
                              <span className="text-white font-bebas text-lg">{pick.team || `Seed #${pick.seed}`}</span>
                              {pick.seed && <span className="text-slate-500 text-xs">Seed {pick.seed}</span>}
                              {pick.round && <span className="text-red-400 text-xs uppercase font-bold">{pick.round}</span>}
                              {pick.pickedAt && (
                                <span className="text-slate-600 text-xs ml-auto">
                                  {new Date(pick.pickedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm italic">No survivor picks yet.</p>
                      )}
                    </div>

                    {/* Final Four Picks */}
                    <div className="mb-5">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Final Four Selections</h4>
                      {entry.finalFourPicks && entry.finalFourPicks.length > 0 ? (
                        <div className="space-y-2">
                          {entry.finalFourPicks.map((pick, i) => (
                            <div key={i} className="flex items-center gap-4 bg-slate-800/40 rounded-lg px-4 py-2">
                              <span className="text-white font-bebas text-lg">{pick.team || `Pick ${i + 1}`}</span>
                              {pick.pickedAt && (
                                <span className="text-slate-600 text-xs ml-auto">
                                  {new Date(pick.pickedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm italic">No Final Four picks yet.</p>
                      )}
                    </div>

                    {/* National Champion */}
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">National Champion Pick</h4>
                      {entry.championPick?.team ? (
                        <div className="flex items-center gap-4 bg-slate-800/40 rounded-lg px-4 py-2">
                          <span className="text-yellow-400 font-bebas text-lg">🏆 {entry.championPick.team}</span>
                          {entry.championPick.pickedAt && (
                            <span className="text-slate-600 text-xs ml-auto">
                              {new Date(entry.championPick.pickedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-600 text-sm italic">No champion pick yet.</p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-4 text-xs text-slate-600">
                      <span>Total Points: <strong className="text-white">{entry.totalPoints ?? 0}</strong></span>
                      <span>UID: <code className="text-slate-500">{entry.id}</code></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
