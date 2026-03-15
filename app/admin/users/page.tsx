'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setUsers([]);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <form onSubmit={handleLogin} className="p-8 w-full max-w-sm border border-white/10 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
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
  }, []);

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
          <h1 className="font-bebas text-4xl text-white mt-2">User Directory</h1>
          {!loading && <p className="text-slate-500 text-sm mt-1">{users.length} registered entrant{users.length !== 1 ? 's' : ''}</p>}
        </div>
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading users...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} className="border-b border-white/10">
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">#</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Display Name</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Email</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Status</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Points</th>
                  <th className="p-4 text-slate-400 text-xs uppercase tracking-widest">Current Pick</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-4 text-slate-600 text-sm">{i + 1}</td>
                    <td className="p-4 font-semibold text-white">{user.displayName || '—'}</td>
                    <td className="p-4 text-slate-400 text-sm">{user.email || '—'}</td>
                    <td className="p-4">
                      {user.isEliminated ? (
                        <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded text-xs font-bold uppercase">Eliminated</span>
                      ) : (
                        <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded text-xs font-bold uppercase">Active</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-white">{(user.totalPoints ?? 0).toFixed(1)}</td>
                    <td className="p-4 text-slate-400 text-sm">{user.currentPick || '—'}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No users found.</td>
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
