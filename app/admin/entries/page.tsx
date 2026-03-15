'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AdminEntriesPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "chone1234") {
      setIsAuthorized(true);
    } else {
      alert("Incorrect Commissioner Password");
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchEntries();
    }
  }, [isAuthorized]);

  const handleToggleElimination = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/toggle-elimination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, adminPassword: 'chone1234' }),
      });
      if (res.ok) {
        setActionMessage('Entry status updated.');
        fetchEntries();
      } else {
        setActionMessage('Error updating entry.');
      }
    } catch {
      setActionMessage('Error updating entry.');
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleDelete = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/delete-entry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, adminPassword: 'chone1234' }),
      });
      if (res.ok) {
        setActionMessage('Entry deleted.');
        setDeleteConfirmId(null);
        fetchEntries();
      } else {
        setActionMessage('Error deleting entry.');
      }
    } catch {
      setActionMessage('Error deleting entry.');
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="glass-panel p-8 w-full max-w-sm border border-white/10 text-center">
          <h2 className="font-bebas text-3xl text-white mb-6 italic">Commissioner Access</h2>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-white text-center mb-4 focus:border-red-600 outline-none"
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bebas text-xl py-3 rounded-xl transition-all uppercase">
            Verify Identity
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
            <h1 className="font-bebas text-4xl text-white mt-2">Manage Entries</h1>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-400">Total: <strong className="text-white">{entries.length}</strong></span>
            <span className="text-slate-400">Active: <strong className="text-green-400">{entries.filter(e => !e.isEliminated).length}</strong></span>
            <span className="text-slate-400">Eliminated: <strong className="text-red-400">{entries.filter(e => e.isEliminated).length}</strong></span>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-4 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading entries...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} className="border-b border-white/10">
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Display Name</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Email</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">PIN</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Status</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Total Pts</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Created</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-4 font-semibold text-white">{entry.displayName || '—'}</td>
                    <td className="p-4 text-slate-400 text-sm">{entry.email || '—'}</td>
                    <td className="p-4 text-slate-400 font-mono text-sm">{entry.pin || '—'}</td>
                    <td className="p-4">
                      {entry.isEliminated ? (
                        <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs font-bold uppercase">Eliminated</span>
                      ) : (
                        <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded text-xs font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-white">{(entry.totalPoints ?? 0).toFixed(1)}</td>
                    <td className="p-4 text-slate-500 text-xs">
                      {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleElimination(entry.id)}
                          className="text-xs px-3 py-1 rounded border border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/30 transition"
                        >
                          {entry.isEliminated ? 'Reinstate' : 'Eliminate'}
                        </button>
                        {deleteConfirmId === entry.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600 transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs px-3 py-1 rounded border border-slate-600 text-slate-400 hover:bg-slate-800 transition"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="text-xs px-3 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-900/30 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
