'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pickLog'), orderBy('timestamp', 'desc'), limit(500));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        setLogs([]);
      }
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = filterUser
    ? logs.filter(l => l.displayName?.toLowerCase().includes(filterUser.toLowerCase()) || l.userId?.includes(filterUser))
    : logs;

  return (
    <div style={{ backgroundColor: '#0b1120', minHeight: '100vh', color: 'white' }} className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <a href="/admin" className="text-slate-400 hover:text-white text-sm">← Admin Dashboard</a>
          <h1 className="font-bebas text-4xl text-white mt-2">Activity Log</h1>
          <p className="text-slate-500 text-sm mt-1">Full audit trail of all pick submissions and changes</p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by name or user ID..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-lg text-sm w-full max-w-sm focus:outline-none focus:border-red-600"
          />
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading activity log...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-xl text-slate-500">No activity logged yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} className="border-b border-white/10">
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Time</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Entrant</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Action</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Pick</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Previous Pick</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Round</th>
                  <th className="p-3 text-slate-400 text-xs uppercase tracking-widest">Region</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-3 text-slate-500 text-xs font-mono whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                    <td className="p-3 text-white text-sm font-semibold">
                      {log.adminAction ? <span className="text-yellow-400">⚙️ Admin</span> : log.displayName || log.userId || '—'}
                    </td>
                    <td className="p-3">
                      {log.action === 'submitted' ? (
                        <span className="text-green-400 bg-green-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase">New Pick</span>
                      ) : log.action === 'changed' ? (
                        <span className="text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Changed</span>
                      ) : log.action === 'admin_set_winner' ? (
                        <span className="text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Set Winner</span>
                      ) : (
                        <span className="text-slate-400 text-xs">{log.action}</span>
                      )}
                    </td>
                    <td className="p-3 text-white text-sm">{log.team ?? log.winner ?? '—'}</td>
                    <td className="p-3 text-slate-500 text-sm">{log.previousTeam ?? '—'}</td>
                    <td className="p-3 text-slate-400 text-xs">{log.round ?? '—'}</td>
                    <td className="p-3 text-slate-400 text-xs">{log.region ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
