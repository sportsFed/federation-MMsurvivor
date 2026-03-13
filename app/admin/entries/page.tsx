'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/clientApp';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function AdminEntriesPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      const q = query(collection(db, 'entries'), orderBy('displayName', 'asc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
      setLoading(false);
    };
    fetchEntries();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1120] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="font-bebas text-5xl text-white italic">Entrant Management</h1>
            <p className="text-red-600 font-bebas text-lg tracking-widest uppercase">The Federation Commissioner Portal</p>
          </div>
          <div className="bg-slate-900 border border-white/10 px-6 py-2 rounded-xl">
            <span className="text-slate-500 text-xs uppercase font-bold block">Total Entrants</span>
            <span className="text-white font-bebas text-3xl">{entries.length} / 155</span>
          </div>
        </header>

        <div className="glass-panel overflow-hidden border border-white/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 border-b border-white/10">
              <tr className="font-bebas text-xl text-slate-400">
                <th className="p-4">Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4 text-center">4-Digit PIN</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {entries.map((entrant) => (
                <tr key={entrant.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-4 font-bold text-white">{entrant.displayName}</td>
                  <td className="p-4 text-slate-400">{entrant.email}</td>
                  <td className="p-4 text-center font-mono text-red-500 font-bold">
                    {/* Note: This requires 'pin' to be saved during registration */}
                    {entrant.pin || "####"}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${entrant.isEliminated ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'}`}>
                      {entrant.isEliminated ? 'Eliminated' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
