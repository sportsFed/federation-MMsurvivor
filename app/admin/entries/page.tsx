'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const TEST_KEYWORDS = ['test', 'dummy', 'example', 'fake', 'sample'];

function isTestEntry(entry: any): boolean {
  const name = (entry.displayName || '').toLowerCase();
  const email = (entry.email || '').toLowerCase();
  return TEST_KEYWORDS.some(kw => name.includes(kw) || email.includes(kw)) || !!entry.isTestEntry;
}

function formatCreatedAt(createdAt: any): string {
  if (!createdAt) return '—';
  if (createdAt.toDate) return createdAt.toDate().toLocaleDateString();
  return new Date(createdAt).toLocaleDateString();
}

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [showTestEntries, setShowTestEntries] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
    } catch {
      try {
        const querySnapshot = await getDocs(collection(db, 'entries'));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEntries(data);
      } catch (fallbackErr: any) {
        setFetchError(`Failed to load entries: ${fallbackErr.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleToggleElimination = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/toggle-elimination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
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
        body: JSON.stringify({ uid }),
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

  const handleMarkAsTest = async (uid: string, currentValue: boolean) => {
    try {
      const res = await fetch('/api/admin/mark-test-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, isTestEntry: !currentValue }),
      });
      if (res.ok) {
        setActionMessage(currentValue ? 'Entry unmarked as test.' : 'Entry marked as test.');
        fetchEntries();
      } else {
        setActionMessage('Error updating entry.');
      }
    } catch {
      setActionMessage('Error updating entry.');
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const visibleEntries = showTestEntries ? entries : entries.filter(e => !isTestEntry(e));
  const testCount = entries.filter(e => isTestEntry(e)).length;

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
            <h1 className="font-bebas text-4xl text-white mt-2">Manage Entries</h1>
          </div>
          <div className="flex gap-4 text-sm items-center">
            <span className="text-slate-400">Total: <strong className="text-white">{entries.length}</strong></span>
            <span className="text-slate-400">Active: <strong className="text-green-400">{entries.filter(e => !e.isEliminated).length}</strong></span>
            <span className="text-slate-400">Eliminated: <strong className="text-red-400">{entries.filter(e => e.isEliminated).length}</strong></span>
            {testCount > 0 && (
              <span className="text-slate-400">Test: <strong className="text-yellow-400">{testCount}</strong></span>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
            <span
              onClick={() => setShowTestEntries(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showTestEntries ? 'bg-yellow-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showTestEntries ? 'translate-x-5' : 'translate-x-1'}`} />
            </span>
            Show test / dummy entries
            {testCount > 0 && <span className="ml-1 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">{testCount}</span>}
          </label>
        </div>

        {actionMessage && (
          <div className="mb-4 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm">
            {actionMessage}
          </div>
        )}

        {fetchError && (
          <div className="mb-4 p-3 rounded bg-red-900/40 border border-red-500/50 text-red-400 text-sm">
            {fetchError}
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
                {visibleEntries.map((entry) => {
                  const testEntry = isTestEntry(entry);
                  return (
                  <tr key={entry.id} className={`border-b border-white/5 hover:bg-white/5 transition ${testEntry ? 'opacity-60' : ''}`}>
                    <td className="p-4 font-semibold text-white">
                      <span>{entry.displayName || '—'}</span>
                      {testEntry && (
                        <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-normal">TEST</span>
                      )}
                    </td>
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
                      {formatCreatedAt(entry.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleToggleElimination(entry.id)}
                          className="text-xs px-3 py-1 rounded border border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/30 transition"
                        >
                          {entry.isEliminated ? 'Reinstate' : 'Eliminate'}
                        </button>
                        <button
                          onClick={() => handleMarkAsTest(entry.id, !!entry.isTestEntry)}
                          className={`text-xs px-3 py-1 rounded border transition ${entry.isTestEntry ? 'border-slate-500/50 text-slate-400 hover:bg-slate-800' : 'border-yellow-600/40 text-yellow-500/80 hover:bg-yellow-900/20'}`}
                        >
                          {entry.isTestEntry ? 'Unmark Test' : 'Mark Test'}
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
                  );
                })}
                {visibleEntries.length === 0 && (
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
